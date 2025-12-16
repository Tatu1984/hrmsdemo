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
 * - Sends heartbeat every 30 seconds if GENUINE activity detected
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
   */
  const detectSuspiciousKeystrokePattern = (history: KeystrokeEvent[]): PatternResult | null => {
    if (history.length < 10) return null;

    // Check last 10 keystrokes
    const recent = history.slice(-10);

    // Pattern 1: Same key pressed repeatedly
    const keys = recent.map(e => e.key);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size === 1) {
      const { confidence, score } = calculateConfidence(1.0, 0.9);
      return {
        type: 'REPETITIVE_KEY',
        details: `Same key "${keys[0]}" pressed ${keys.length} times consecutively`,
        confidence,
        confidenceScore: score
      };
    }

    // Pattern 2: Keys pressed at exact intervals (within 100ms tolerance)
    const intervals: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      intervals.push(recent[i].timestamp - recent[i - 1].timestamp);
    }

    // Check if intervals are suspiciously similar
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const tolerance = 100; // 100ms tolerance

    let similarIntervals = 0;
    for (const interval of intervals) {
      if (Math.abs(interval - avgInterval) < tolerance) {
        similarIntervals++;
      }
    }

    // If 8 out of 9 intervals are almost identical, it's suspicious
    if (similarIntervals >= 8) {
      const matchRatio = similarIntervals / 9;
      // Lower avgInterval = more likely automated (humans can't type that consistently)
      const patternStrength = avgInterval < 200 ? 0.95 : avgInterval < 500 ? 0.8 : 0.6;
      const { confidence, score } = calculateConfidence(matchRatio, patternStrength);
      return {
        type: 'REGULAR_INTERVAL_KEYSTROKES',
        details: `Keys pressed at regular ${Math.round(avgInterval)}ms intervals (${similarIntervals}/9 similar) - Auto-typer detected`,
        confidence,
        confidenceScore: score
      };
    }

    // Pattern 3: Alternating between exactly 2 keys repeatedly
    if (uniqueKeys.size === 2) {
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
          details: `Keys "${key1}" and "${key2}" alternating in perfect pattern - Macro detected`,
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
   */
  const detectSuspiciousMousePattern = (history: MouseEvent[]): PatternResult | null => {
    if (history.length < 10) return null;

    const recent = history.slice(-10);

    // Pattern 1: Mouse moving in exact straight lines
    const movements = recent.slice(1).map((curr, i) => ({
      dx: curr.x - recent[i].x,
      dy: curr.y - recent[i].y,
      timestamp: curr.timestamp - recent[i].timestamp,
    }));

    // Check if all movements have the same direction and similar magnitude
    const directions = movements.map(m => Math.atan2(m.dy, m.dx));
    const avgDirection = directions.reduce((a, b) => a + b, 0) / directions.length;
    const avgDirectionDegrees = Math.round((avgDirection * 180) / Math.PI);

    let similarDirections = 0;
    for (const dir of directions) {
      if (Math.abs(dir - avgDirection) < 0.1) { // ~5 degree tolerance
        similarDirections++;
      }
    }

    if (similarDirections >= 8) {
      const matchRatio = similarDirections / 9;
      // Check if movements are also at regular intervals (stronger indicator)
      const timeIntervals = movements.map(m => m.timestamp);
      const avgTimeInterval = timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length;
      let regularTimeIntervals = 0;
      for (const t of timeIntervals) {
        if (Math.abs(t - avgTimeInterval) < 50) regularTimeIntervals++;
      }
      const patternStrength = regularTimeIntervals >= 7 ? 0.95 : 0.75;
      const { confidence, score } = calculateConfidence(matchRatio, patternStrength);
      return {
        type: 'LINEAR_MOUSE_MOVEMENT',
        details: `Mouse moving in straight line at ${avgDirectionDegrees}° (${similarDirections}/9 movements) - Mouse jiggler detected`,
        confidence,
        confidenceScore: score
      };
    }

    // Pattern 2: Mouse not moving at all (stuck at same position)
    const positions = recent.map(e => `${e.x},${e.y}`);
    const uniquePositions = new Set(positions);
    if (uniquePositions.size === 1) {
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

    // Pattern 3: Oscillating mouse (back and forth pattern - common in jigglers)
    let oscillationCount = 0;
    for (let i = 2; i < movements.length; i++) {
      const prev = movements[i - 1];
      const curr = movements[i];
      // Check if direction reversed
      if ((prev.dx > 0 && curr.dx < 0) || (prev.dx < 0 && curr.dx > 0) ||
          (prev.dy > 0 && curr.dy < 0) || (prev.dy < 0 && curr.dy > 0)) {
        oscillationCount++;
      }
    }
    if (oscillationCount >= 6) { // 6+ direction reversals in 9 movements
      const matchRatio = oscillationCount / 7;
      const { confidence, score } = calculateConfidence(matchRatio, 0.8);
      return {
        type: 'OSCILLATING_MOUSE',
        details: `Mouse oscillating back and forth (${oscillationCount} direction reversals) - Mouse jiggler pattern detected`,
        confidence,
        confidenceScore: score
      };
    }

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

    // Keyboard activity handler
    const handleKeydown = (e: KeyboardEvent) => {
      const now = Date.now();

      // Add to history
      keystrokeHistoryRef.current.push({
        key: e.key,
        timestamp: now,
      });

      // Keep only last 20 keystrokes
      if (keystrokeHistoryRef.current.length > 20) {
        keystrokeHistoryRef.current.shift();
      }

      // Check for suspicious patterns
      const patternDetected = detectSuspiciousKeystrokePattern(keystrokeHistoryRef.current);

      if (patternDetected) {
        suspiciousActivityCountRef.current++;
        // Track when pattern first started
        if (!patternStartTimeRef.current) {
          patternStartTimeRef.current = now;
        }
        lastPatternDetectedRef.current = patternDetected;

        // If more than 3 suspicious patterns detected, don't count as activity
        if (suspiciousActivityCountRef.current > 3) {
          return;
        }
      } else {
        // Reset suspicious count on genuine activity
        suspiciousActivityCountRef.current = Math.max(0, suspiciousActivityCountRef.current - 1);
        if (suspiciousActivityCountRef.current === 0) {
          patternStartTimeRef.current = null;
        }
      }

      lastActivityRef.current = now;
      hasRecentActivityRef.current = true;
      onActivityDetected?.();
    };

    // Mouse activity handler
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const now = Date.now();

      // Add to history
      mouseHistoryRef.current.push({
        x: e.clientX,
        y: e.clientY,
        timestamp: now,
      });

      // Keep only last 20 positions
      if (mouseHistoryRef.current.length > 20) {
        mouseHistoryRef.current.shift();
      }

      // Check for suspicious patterns
      const patternDetected = detectSuspiciousMousePattern(mouseHistoryRef.current);

      if (patternDetected) {
        suspiciousActivityCountRef.current++;
        // Track when pattern first started
        if (!patternStartTimeRef.current) {
          patternStartTimeRef.current = now;
        }
        lastPatternDetectedRef.current = patternDetected;

        if (suspiciousActivityCountRef.current > 3) {
          return;
        }
      } else {
        suspiciousActivityCountRef.current = Math.max(0, suspiciousActivityCountRef.current - 1);
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
        const isSuspiciousActivity = suspiciousActivityCountRef.current > 3;
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
    }, 30000); // Every 30 seconds

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
