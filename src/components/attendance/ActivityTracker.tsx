'use client';

import { useEffect, useRef } from 'react';

interface ActivityTrackerProps {
  isActive: boolean; // Only track when user is punched in
  onActivityDetected?: () => void;
}

interface KeystrokeEvent {
  key: string;
  timestamp: number;
}

interface MouseEvent {
  x: number;
  y: number;
  timestamp: number;
}

interface PatternResult {
  type: string;
  details: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceScore: number; // 0-100
}

interface DeviceFingerprint {
  userAgent: string;
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  deviceType: string;
  screenResolution: string;
  timezone: string;
  language: string;
}

/**
 * ActivityTracker - Monitors user activity (mouse, keyboard, scroll)
 * and sends periodic heartbeats to the server to track active work time.
 *
 * Detection Logic:
 * - Tracks mouse movements, clicks, keyboard inputs, and scrolling
 * - Detects automated/bot activity patterns:
 *   - Repetitive keystrokes at exact intervals (e.g., every 5-10 seconds)
 *   - Mouse movements in exact patterns
 *   - Same key pressed repeatedly at regular intervals
 * - Sends heartbeat every 20 minutes if GENUINE activity detected
 * - If no activity for 5 minutes, user is considered idle
 * - Flags suspicious patterns and marks activity as potentially fake
 */
export function ActivityTracker({ isActive, onActivityDetected }: ActivityTrackerProps) {
  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const idleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasRecentActivityRef = useRef<boolean>(false);

  // Pattern detection state
  const keystrokeHistoryRef = useRef<KeystrokeEvent[]>([]);
  const mouseHistoryRef = useRef<MouseEvent[]>([]);
  const suspiciousActivityCountRef = useRef<number>(0);
  const lastPatternDetectedRef = useRef<PatternResult | null>(null);

  // Duration tracking
  const patternStartTimeRef = useRef<number | null>(null);
  const deviceFingerprintRef = useRef<DeviceFingerprint | null>(null);

  // Throttling and decay refs
  const lastPatternCheckRef = useRef<number>(0);
  const lastSuspiciousIncrementTimeRef = useRef<number>(0);

  // Detection configuration - tuned to catch real jigglers, not humans
  const DETECTION_CONFIG = {
    // Throttle pattern checks to once per 200ms (not every mouse event)
    PATTERN_CHECK_THROTTLE_MS: 200,
    // Require 15+ suspicious patterns before flagging (was 3)
    SUSPICIOUS_THRESHOLD: 15,
    // Time-based decay: reduce counter by 1 every 30 seconds of clean activity
    DECAY_INTERVAL_MS: 30000,
    // Minimum sample size for reliable detection
    MIN_MOUSE_SAMPLES: 15,
    MIN_KEYSTROKE_SAMPLES: 12,
    // Variance thresholds - real jigglers have near-zero variance
    MAX_JIGGLER_DISTANCE_VARIANCE: 2, // pixels - jigglers move exact amounts
    MAX_JIGGLER_INTERVAL_VARIANCE: 15, // ms - jigglers have exact timing
    // Human movement has high variance
    MIN_HUMAN_VARIANCE: 5, // If variance is below this, might be automated
    // Direction tolerance - increased from 0.1 to 0.3 radians (~17 degrees)
    DIRECTION_TOLERANCE: 0.3,
    // Oscillation - require more reversals AND check for exact patterns
    MIN_OSCILLATION_COUNT: 12, // out of 14 movements (was 6 out of 7)
    // Time interval tolerance for detecting bots
    BOT_TIME_TOLERANCE_MS: 20, // Real bots have < 20ms variance
  };

  /**
   * Parse user agent to extract browser and OS info
   */
  const parseUserAgent = (ua: string): Partial<DeviceFingerprint> => {
    const result: Partial<DeviceFingerprint> = {
      userAgent: ua,
      browserName: 'Unknown',
      browserVersion: '',
      osName: 'Unknown',
      osVersion: '',
      deviceType: 'desktop'
    };

    // Browser detection
    if (ua.includes('Firefox/')) {
      result.browserName = 'Firefox';
      const match = ua.match(/Firefox\/([\d.]+)/);
      result.browserVersion = match?.[1] || '';
    } else if (ua.includes('Edg/')) {
      result.browserName = 'Edge';
      const match = ua.match(/Edg\/([\d.]+)/);
      result.browserVersion = match?.[1] || '';
    } else if (ua.includes('Chrome/')) {
      result.browserName = 'Chrome';
      const match = ua.match(/Chrome\/([\d.]+)/);
      result.browserVersion = match?.[1] || '';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      result.browserName = 'Safari';
      const match = ua.match(/Version\/([\d.]+)/);
      result.browserVersion = match?.[1] || '';
    }

    // OS detection
    if (ua.includes('Windows NT 10')) {
      result.osName = 'Windows';
      result.osVersion = '10/11';
    } else if (ua.includes('Windows NT')) {
      result.osName = 'Windows';
      const match = ua.match(/Windows NT ([\d.]+)/);
      result.osVersion = match?.[1] || '';
    } else if (ua.includes('Mac OS X')) {
      result.osName = 'macOS';
      const match = ua.match(/Mac OS X ([\d_]+)/);
      result.osVersion = match?.[1]?.replace(/_/g, '.') || '';
    } else if (ua.includes('Linux')) {
      result.osName = 'Linux';
    } else if (ua.includes('Android')) {
      result.osName = 'Android';
      const match = ua.match(/Android ([\d.]+)/);
      result.osVersion = match?.[1] || '';
      result.deviceType = 'mobile';
    } else if (ua.includes('iPhone') || ua.includes('iPad')) {
      result.osName = 'iOS';
      const match = ua.match(/OS ([\d_]+)/);
      result.osVersion = match?.[1]?.replace(/_/g, '.') || '';
      result.deviceType = ua.includes('iPad') ? 'tablet' : 'mobile';
    }

    return result;
  };

  /**
   * Collect device fingerprint (called once on mount)
   */
  const collectFingerprint = (): DeviceFingerprint => {
    const ua = navigator.userAgent;
    const parsed = parseUserAgent(ua);

    return {
      userAgent: ua,
      browserName: parsed.browserName || 'Unknown',
      browserVersion: parsed.browserVersion || '',
      osName: parsed.osName || 'Unknown',
      osVersion: parsed.osVersion || '',
      deviceType: parsed.deviceType || 'desktop',
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    };
  };

  /**
   * Calculates variance of a number array - key for distinguishing bots from humans
   * Real mouse jigglers have near-zero variance; humans have high variance
   */
  const calculateVariance = (values: number[]): number => {
    if (values.length < 2) return Infinity;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  };

  /**
   * Calculates confidence based on pattern strength
   */
  const calculateConfidence = (matchRatio: number, patternStrength: number): { confidence: 'LOW' | 'MEDIUM' | 'HIGH'; score: number } => {
    const score = Math.round((matchRatio * 0.6 + patternStrength * 0.4) * 100);
    let confidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (score >= 85) confidence = 'HIGH';
    else if (score >= 65) confidence = 'MEDIUM';
    return { confidence, score };
  };

  /**
   * Detects if keystrokes are following a suspicious pattern
   * Returns pattern details with confidence if detected, null otherwise
   *
   * IMPROVED: Uses variance detection to distinguish bots from fast typists
   */
  const detectSuspiciousKeystrokePattern = (history: KeystrokeEvent[]): PatternResult | null => {
    if (history.length < DETECTION_CONFIG.MIN_KEYSTROKE_SAMPLES) return null;

    // Check last keystrokes with larger sample
    const recent = history.slice(-DETECTION_CONFIG.MIN_KEYSTROKE_SAMPLES);

    // Pattern 1: Same key pressed repeatedly (still valid - no human does this)
    const keys = recent.map(e => e.key);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size === 1 && keys.length >= 12) {
      const { confidence, score } = calculateConfidence(1.0, 0.9);
      return {
        type: 'REPETITIVE_KEY',
        details: `Same key "${keys[0]}" pressed ${keys.length} times consecutively`,
        confidence,
        confidenceScore: score
      };
    }

    // Pattern 2: Keys pressed at EXACT intervals - use variance detection
    const intervals: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      intervals.push(recent[i].timestamp - recent[i - 1].timestamp);
    }

    const intervalVariance = calculateVariance(intervals);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // CRITICAL FIX: Only flag if variance is VERY low (bot-like)
    // Humans have high variance even when typing fast
    // Bots have variance < 20ms typically
    if (intervalVariance < DETECTION_CONFIG.BOT_TIME_TOLERANCE_MS && avgInterval < 300) {
      const matchRatio = 1 - (intervalVariance / 100);
      const patternStrength = avgInterval < 100 ? 0.95 : avgInterval < 200 ? 0.85 : 0.7;
      const { confidence, score } = calculateConfidence(matchRatio, patternStrength);
      return {
        type: 'REGULAR_INTERVAL_KEYSTROKES',
        details: `Keys pressed at exact ${Math.round(avgInterval)}ms intervals (variance: ${intervalVariance.toFixed(1)}ms) - Auto-typer detected`,
        confidence,
        confidenceScore: score
      };
    }

    // Pattern 3: Alternating between exactly 2 keys repeatedly WITH low timing variance
    if (uniqueKeys.size === 2 && intervalVariance < DETECTION_CONFIG.BOT_TIME_TOLERANCE_MS * 2) {
      const [key1, key2] = Array.from(uniqueKeys);
      let isAlternating = true;
      for (let i = 1; i < keys.length; i++) {
        const expected = keys[i - 1] === key1 ? key2 : key1;
        if (keys[i] !== expected) {
          isAlternating = false;
          break;
        }
      }
      if (isAlternating) {
        const { confidence, score } = calculateConfidence(1.0, 0.85);
        return {
          type: 'ALTERNATING_KEYS',
          details: `Keys "${key1}" and "${key2}" alternating in perfect pattern with ${intervalVariance.toFixed(1)}ms variance - Macro detected`,
          confidence,
          confidenceScore: score
        };
      }
    }

    return null;
  };

  /**
   * Detects if mouse movements are following a suspicious pattern
   * Returns pattern details with confidence if detected, null otherwise
   *
   * IMPROVED: Uses variance detection - the KEY differentiator between humans and bots
   * Real jigglers have:
   *   - Near-zero variance in movement distance (exact same pixels every time)
   *   - Near-zero variance in timing (exact same interval every time)
   *   - Perfect oscillation patterns (exactly back and forth)
   * Humans have:
   *   - High variance in movement distance (imprecise movements)
   *   - High variance in timing (variable reaction times)
   *   - Imperfect curves and adjustments
   */
  const detectSuspiciousMousePattern = (history: MouseEvent[]): PatternResult | null => {
    if (history.length < DETECTION_CONFIG.MIN_MOUSE_SAMPLES) return null;

    const recent = history.slice(-DETECTION_CONFIG.MIN_MOUSE_SAMPLES);

    // Calculate movements with distance and timing
    const movements = recent.slice(1).map((curr, i) => {
      const dx = curr.x - recent[i].x;
      const dy = curr.y - recent[i].y;
      return {
        dx,
        dy,
        distance: Math.sqrt(dx * dx + dy * dy),
        interval: curr.timestamp - recent[i].timestamp,
      };
    });

    // Calculate variances - THE KEY TO ACCURATE DETECTION
    const distances = movements.map(m => m.distance);
    const intervals = movements.map(m => m.interval);
    const distanceVariance = calculateVariance(distances);
    const intervalVariance = calculateVariance(intervals);

    // Pattern 1: Mouse not moving at all (stuck at same position)
    // This is still valid - fake mouse apps that don't actually move
    const positions = recent.map(e => `${e.x},${e.y}`);
    const uniquePositions = new Set(positions);
    if (uniquePositions.size <= 2) { // Allow tiny movement (1-2 positions)
      const x = recent[0].x;
      const y = recent[0].y;
      const { confidence, score } = calculateConfidence(1.0, 0.9);
      return {
        type: 'STATIC_MOUSE',
        details: `Mouse stuck at position (${x}, ${y}) - Fake mouse movement app detected`,
        confidence,
        confidenceScore: score
      };
    }

    // Pattern 2: Perfect oscillation with LOW VARIANCE (real jiggler)
    // Real jigglers oscillate with EXACT same distance and timing
    let oscillationCount = 0;
    const oscillationDistances: number[] = [];

    for (let i = 1; i < movements.length; i++) {
      const prev = movements[i - 1];
      const curr = movements[i];
      // Check if direction reversed on BOTH axes (true back-and-forth)
      const xReversed = (prev.dx > 0 && curr.dx < 0) || (prev.dx < 0 && curr.dx > 0);
      const yReversed = (prev.dy > 0 && curr.dy < 0) || (prev.dy < 0 && curr.dy > 0);

      if (xReversed || yReversed) {
        oscillationCount++;
        oscillationDistances.push(curr.distance);
      }
    }

    // CRITICAL: Only flag if oscillating AND has bot-like low variance
    const oscillationDistanceVariance = calculateVariance(oscillationDistances);
    if (
      oscillationCount >= DETECTION_CONFIG.MIN_OSCILLATION_COUNT &&
      oscillationDistanceVariance < DETECTION_CONFIG.MAX_JIGGLER_DISTANCE_VARIANCE &&
      intervalVariance < DETECTION_CONFIG.MAX_JIGGLER_INTERVAL_VARIANCE
    ) {
      const matchRatio = oscillationCount / (movements.length - 1);
      const { confidence, score } = calculateConfidence(matchRatio, 0.9);
      return {
        type: 'OSCILLATING_MOUSE',
        details: `Mouse oscillating with ${oscillationCount} reversals, distance variance: ${oscillationDistanceVariance.toFixed(1)}px, timing variance: ${intervalVariance.toFixed(1)}ms - Mouse jiggler pattern`,
        confidence,
        confidenceScore: score
      };
    }

    // Pattern 3: Linear movement with EXACT same distances and timing (jiggler moving in one direction)
    // Only flag if BOTH distance AND timing variance are bot-like
    if (
      distanceVariance < DETECTION_CONFIG.MAX_JIGGLER_DISTANCE_VARIANCE &&
      intervalVariance < DETECTION_CONFIG.MAX_JIGGLER_INTERVAL_VARIANCE
    ) {
      const directions = movements.map(m => Math.atan2(m.dy, m.dx));
      const avgDirection = directions.reduce((a, b) => a + b, 0) / directions.length;
      const avgDirectionDegrees = Math.round((avgDirection * 180) / Math.PI);

      let similarDirections = 0;
      for (const dir of directions) {
        if (Math.abs(dir - avgDirection) < DETECTION_CONFIG.DIRECTION_TOLERANCE) {
          similarDirections++;
        }
      }

      // Need BOTH: consistent direction AND bot-like variance
      if (similarDirections >= movements.length * 0.7) {
        const matchRatio = similarDirections / movements.length;
        const { confidence, score } = calculateConfidence(matchRatio, 0.85);
        return {
          type: 'LINEAR_MOUSE_MOVEMENT',
          details: `Mouse moving at ${avgDirectionDegrees}° with distance variance: ${distanceVariance.toFixed(1)}px, timing variance: ${intervalVariance.toFixed(1)}ms - Mouse jiggler detected`,
          confidence,
          confidenceScore: score
        };
      }
    }

    // If we get here, movement has human-like variance - NOT a jiggler
    return null;
  };

  useEffect(() => {
    if (!isActive) {
      // Clean up if not active
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
      }
      // Reset pattern detection
      keystrokeHistoryRef.current = [];
      mouseHistoryRef.current = [];
      suspiciousActivityCountRef.current = 0;
      patternStartTimeRef.current = null;
      return;
    }

    // Collect fingerprint once when tracker becomes active
    if (!deviceFingerprintRef.current) {
      deviceFingerprintRef.current = collectFingerprint();
    }

    // Keyboard activity handler with throttling
    const handleKeydown = (e: KeyboardEvent) => {
      const now = Date.now();

      // Add to history (always capture keystrokes)
      keystrokeHistoryRef.current.push({
        key: e.key,
        timestamp: now,
      });

      // Keep larger history for better pattern detection
      if (keystrokeHistoryRef.current.length > 30) {
        keystrokeHistoryRef.current.shift();
      }

      // THROTTLE: Only check patterns every 200ms, not on every keystroke
      if (now - lastPatternCheckRef.current < DETECTION_CONFIG.PATTERN_CHECK_THROTTLE_MS) {
        // Still count as activity even if we don't check patterns
        lastActivityRef.current = now;
        hasRecentActivityRef.current = true;
        onActivityDetected?.();
        return;
      }
      lastPatternCheckRef.current = now;

      // Check for suspicious patterns
      const patternDetected = detectSuspiciousKeystrokePattern(keystrokeHistoryRef.current);

      if (patternDetected) {
        // Only increment once per DECAY_INTERVAL to prevent rapid accumulation
        if (now - lastSuspiciousIncrementTimeRef.current > DETECTION_CONFIG.DECAY_INTERVAL_MS / 10) {
          suspiciousActivityCountRef.current++;
          lastSuspiciousIncrementTimeRef.current = now;
        }

        // Track when pattern first started
        if (!patternStartTimeRef.current) {
          patternStartTimeRef.current = now;
        }
        lastPatternDetectedRef.current = patternDetected;

        // IMPROVED: Higher threshold (15 instead of 3)
        if (suspiciousActivityCountRef.current > DETECTION_CONFIG.SUSPICIOUS_THRESHOLD) {
          return;
        }
      } else {
        // TIME-BASED DECAY: Reduce suspicious count more aggressively on genuine activity
        // Decay by 2 on genuine activity (faster recovery from false positives)
        suspiciousActivityCountRef.current = Math.max(0, suspiciousActivityCountRef.current - 2);
        if (suspiciousActivityCountRef.current === 0) {
          patternStartTimeRef.current = null;
        }
      }

      lastActivityRef.current = now;
      hasRecentActivityRef.current = true;
      onActivityDetected?.();
    };

    // Mouse activity handler with throttling
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const now = Date.now();

      // Add to history (always capture mouse positions)
      mouseHistoryRef.current.push({
        x: e.clientX,
        y: e.clientY,
        timestamp: now,
      });

      // Keep larger history for better variance calculation
      if (mouseHistoryRef.current.length > 40) {
        mouseHistoryRef.current.shift();
      }

      // THROTTLE: Only check patterns every 200ms, not on every mouse event
      // This is critical - browsers fire mousemove at 60Hz+
      if (now - lastPatternCheckRef.current < DETECTION_CONFIG.PATTERN_CHECK_THROTTLE_MS) {
        // Still count as activity even if we don't check patterns
        lastActivityRef.current = now;
        hasRecentActivityRef.current = true;
        onActivityDetected?.();
        return;
      }
      lastPatternCheckRef.current = now;

      // Check for suspicious patterns
      const patternDetected = detectSuspiciousMousePattern(mouseHistoryRef.current);

      if (patternDetected) {
        // Only increment once per 3 seconds to prevent rapid accumulation
        if (now - lastSuspiciousIncrementTimeRef.current > DETECTION_CONFIG.DECAY_INTERVAL_MS / 10) {
          suspiciousActivityCountRef.current++;
          lastSuspiciousIncrementTimeRef.current = now;
        }

        // Track when pattern first started
        if (!patternStartTimeRef.current) {
          patternStartTimeRef.current = now;
        }
        lastPatternDetectedRef.current = patternDetected;

        // IMPROVED: Higher threshold (15 instead of 3)
        if (suspiciousActivityCountRef.current > DETECTION_CONFIG.SUSPICIOUS_THRESHOLD) {
          return;
        }
      } else {
        // TIME-BASED DECAY: Reduce suspicious count more aggressively on genuine activity
        // Decay by 2 on genuine activity (faster recovery from false positives)
        suspiciousActivityCountRef.current = Math.max(0, suspiciousActivityCountRef.current - 2);
        if (suspiciousActivityCountRef.current === 0) {
          patternStartTimeRef.current = null;
        }
      }

      lastActivityRef.current = now;
      hasRecentActivityRef.current = true;
      onActivityDetected?.();
    };

    // General activity handler (for non-tracked events)
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      hasRecentActivityRef.current = true;
      onActivityDetected?.();
    };

    // Set up event listeners
    window.addEventListener('keydown', handleKeydown, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('click', handleActivity, { passive: true });

    // Send heartbeat every 30 seconds if there was genuine activity
    heartbeatIntervalRef.current = setInterval(async () => {
      if (hasRecentActivityRef.current) {
        const isSuspiciousActivity = suspiciousActivityCountRef.current > DETECTION_CONFIG.SUSPICIOUS_THRESHOLD;
        const patternInfo = lastPatternDetectedRef.current;
        const fingerprint = deviceFingerprintRef.current;
        const now = Date.now();

        // Calculate duration if pattern is ongoing
        const durationMs = patternStartTimeRef.current
          ? now - patternStartTimeRef.current
          : null;

        try {
          await fetch('/api/attendance/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timestamp: new Date().toISOString(),
              active: !isSuspiciousActivity, // Mark as inactive if suspicious
              suspicious: isSuspiciousActivity,
              patternType: patternInfo?.type || null,
              patternDetails: patternInfo?.details || null,
              // Enhanced fields
              confidence: patternInfo?.confidence || null,
              confidenceScore: patternInfo?.confidenceScore || null,
              durationMs: durationMs,
              patternStartTime: patternStartTimeRef.current
                ? new Date(patternStartTimeRef.current).toISOString()
                : null,
              // Fingerprint data
              ...fingerprint,
            }),
          });
          hasRecentActivityRef.current = false; // Reset flag after sending

          // Reset pattern info after sending
          if (isSuspiciousActivity) {
            lastPatternDetectedRef.current = null;
            patternStartTimeRef.current = null;
          }
        } catch (error) {
          // Silently fail - don't alert user
        }
      }
    }, 20 * 60 * 1000); // Every 20 minutes

    // Check for idle state every minute
    idleCheckIntervalRef.current = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      const idleThresholdMs = 5 * 60 * 1000; // 5 minutes

      if (timeSinceLastActivity > idleThresholdMs && hasRecentActivityRef.current) {
        // User has been idle for more than threshold
        hasRecentActivityRef.current = false;

        // Reset pattern detection on idle
        keystrokeHistoryRef.current = [];
        mouseHistoryRef.current = [];
        suspiciousActivityCountRef.current = 0;
      }
    }, 60000); // Check every minute

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('click', handleActivity);

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
      }
    };
  }, [isActive, onActivityDetected]);

  // This component doesn't render anything visible
  return null;
}
