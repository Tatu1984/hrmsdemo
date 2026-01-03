'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Activity Heartbeat Component with Bot Detection
 *
 * Tracks employee activity and sends heartbeats every 5 minutes.
 * INCLUDES sophisticated bot/auto-clicker detection to prevent fake activity.
 *
 * Detection capabilities:
 * - Mouse jiggler detection (oscillating patterns with low variance)
 * - Auto-clicker detection (clicks at exact intervals)
 * - Auto-typer detection (keystrokes at exact intervals)
 * - Static mouse detection (mouse not actually moving)
 */

interface MouseEvent {
  x: number;
  y: number;
  timestamp: number;
}

interface KeystrokeEvent {
  key: string;
  timestamp: number;
}

interface ClickEvent {
  timestamp: number;
}

// Detection configuration - tuned to catch real bots, not humans
const DETECTION_CONFIG = {
  // Minimum samples needed for reliable detection
  MIN_MOUSE_SAMPLES: 15,
  MIN_KEYSTROKE_SAMPLES: 10,
  MIN_CLICK_SAMPLES: 8,
  // Variance thresholds - bots have near-zero variance
  MAX_BOT_DISTANCE_VARIANCE: 3, // pixels - jigglers move exact amounts
  MAX_BOT_INTERVAL_VARIANCE: 25, // ms - bots have exact timing
  // Oscillation detection
  MIN_OSCILLATION_RATIO: 0.7, // 70% of movements must be reversals
  // Suspicious threshold - how many patterns before flagging
  SUSPICIOUS_THRESHOLD: 10,
  // Time decay - reduce suspicion count every 30s of clean activity
  DECAY_INTERVAL_MS: 30000,
};

export function ActivityHeartbeat() {
  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [debugInfo, setDebugInfo] = useState('');

  // Bot detection state
  const mouseHistoryRef = useRef<MouseEvent[]>([]);
  const keystrokeHistoryRef = useRef<KeystrokeEvent[]>([]);
  const clickHistoryRef = useRef<ClickEvent[]>([]);
  const suspiciousCountRef = useRef<number>(0);
  const lastDecayTimeRef = useRef<number>(Date.now());
  const isBotDetectedRef = useRef<boolean>(false);
  const lastPatternRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('[ActivityHeartbeat] Component mounted with bot detection');

    // Check if user is punched in
    const checkPunchInStatus = () => {
      const punchedIn = localStorage.getItem('hrms_punched_in');
      return punchedIn === 'true';
    };

    /**
     * Calculate variance of a number array
     * Key for distinguishing bots from humans - bots have near-zero variance
     */
    const calculateVariance = (values: number[]): number => {
      if (values.length < 2) return Infinity;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
      return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
    };

    /**
     * Detect mouse jiggler patterns
     * Real jigglers have: exact same distance, exact timing, oscillating pattern
     */
    const detectMouseJiggler = (): string | null => {
      const history = mouseHistoryRef.current;
      if (history.length < DETECTION_CONFIG.MIN_MOUSE_SAMPLES) return null;

      const recent = history.slice(-DETECTION_CONFIG.MIN_MOUSE_SAMPLES);

      // Check for static mouse (not actually moving)
      const positions = recent.map(e => `${e.x},${e.y}`);
      const uniquePositions = new Set(positions);
      if (uniquePositions.size <= 2) {
        return 'STATIC_MOUSE: Mouse not actually moving - fake movement detected';
      }

      // Calculate movements
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

      // Calculate variances
      const distances = movements.map(m => m.distance);
      const intervals = movements.map(m => m.interval);
      const distanceVariance = calculateVariance(distances);
      const intervalVariance = calculateVariance(intervals);

      // Detect oscillation pattern (back and forth)
      let oscillationCount = 0;
      for (let i = 1; i < movements.length; i++) {
        const prev = movements[i - 1];
        const curr = movements[i];
        const xReversed = (prev.dx > 0 && curr.dx < 0) || (prev.dx < 0 && curr.dx > 0);
        const yReversed = (prev.dy > 0 && curr.dy < 0) || (prev.dy < 0 && curr.dy > 0);
        if (xReversed || yReversed) oscillationCount++;
      }

      const oscillationRatio = oscillationCount / (movements.length - 1);

      // Bot detection: low variance + high oscillation = jiggler
      if (
        distanceVariance < DETECTION_CONFIG.MAX_BOT_DISTANCE_VARIANCE &&
        intervalVariance < DETECTION_CONFIG.MAX_BOT_INTERVAL_VARIANCE &&
        oscillationRatio > DETECTION_CONFIG.MIN_OSCILLATION_RATIO
      ) {
        return `MOUSE_JIGGLER: Oscillating pattern (${(oscillationRatio * 100).toFixed(0)}% reversals, ${distanceVariance.toFixed(1)}px variance, ${intervalVariance.toFixed(0)}ms timing)`;
      }

      // Also detect linear movement with exact intervals (jiggler moving in one direction)
      if (
        distanceVariance < DETECTION_CONFIG.MAX_BOT_DISTANCE_VARIANCE &&
        intervalVariance < DETECTION_CONFIG.MAX_BOT_INTERVAL_VARIANCE
      ) {
        return `LINEAR_JIGGLER: Exact movements (${distanceVariance.toFixed(1)}px variance, ${intervalVariance.toFixed(0)}ms timing)`;
      }

      return null;
    };

    /**
     * Detect auto-clicker patterns
     * Real auto-clickers click at exact intervals with near-zero variance
     */
    const detectAutoClicker = (): string | null => {
      const history = clickHistoryRef.current;
      if (history.length < DETECTION_CONFIG.MIN_CLICK_SAMPLES) return null;

      const recent = history.slice(-DETECTION_CONFIG.MIN_CLICK_SAMPLES);
      const intervals: number[] = [];
      for (let i = 1; i < recent.length; i++) {
        intervals.push(recent[i].timestamp - recent[i - 1].timestamp);
      }

      const intervalVariance = calculateVariance(intervals);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      // Auto-clickers have very low variance in click timing
      if (intervalVariance < DETECTION_CONFIG.MAX_BOT_INTERVAL_VARIANCE) {
        return `AUTO_CLICKER: Clicks at exact ${Math.round(avgInterval)}ms intervals (${intervalVariance.toFixed(1)}ms variance)`;
      }

      return null;
    };

    /**
     * Detect auto-typer patterns
     * Real auto-typers have exact timing or same key repeated
     */
    const detectAutoTyper = (): string | null => {
      const history = keystrokeHistoryRef.current;
      if (history.length < DETECTION_CONFIG.MIN_KEYSTROKE_SAMPLES) return null;

      const recent = history.slice(-DETECTION_CONFIG.MIN_KEYSTROKE_SAMPLES);

      // Check for same key repeated
      const keys = recent.map(e => e.key);
      const uniqueKeys = new Set(keys);
      if (uniqueKeys.size === 1) {
        return `REPETITIVE_KEY: Same key "${keys[0]}" pressed ${keys.length} times`;
      }

      // Check for exact interval typing
      const intervals: number[] = [];
      for (let i = 1; i < recent.length; i++) {
        intervals.push(recent[i].timestamp - recent[i - 1].timestamp);
      }

      const intervalVariance = calculateVariance(intervals);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      if (intervalVariance < DETECTION_CONFIG.MAX_BOT_INTERVAL_VARIANCE && avgInterval < 200) {
        return `AUTO_TYPER: Keys at exact ${Math.round(avgInterval)}ms intervals (${intervalVariance.toFixed(1)}ms variance)`;
      }

      // Check for alternating pattern with exact timing
      if (uniqueKeys.size === 2 && intervalVariance < DETECTION_CONFIG.MAX_BOT_INTERVAL_VARIANCE * 2) {
        const [key1, key2] = Array.from(uniqueKeys);
        let isAlternating = true;
        for (let i = 1; i < keys.length; i++) {
          if (keys[i] === keys[i - 1]) {
            isAlternating = false;
            break;
          }
        }
        if (isAlternating) {
          return `ALTERNATING_MACRO: Keys "${key1}" and "${key2}" alternating perfectly`;
        }
      }

      return null;
    };

    /**
     * Run all bot detection checks
     */
    const runBotDetection = (): { isBot: boolean; pattern: string | null } => {
      // Apply time decay to suspicious count
      const now = Date.now();
      if (now - lastDecayTimeRef.current > DETECTION_CONFIG.DECAY_INTERVAL_MS) {
        suspiciousCountRef.current = Math.max(0, suspiciousCountRef.current - 1);
        lastDecayTimeRef.current = now;
      }

      // Run all detection checks
      const mousePattern = detectMouseJiggler();
      const clickPattern = detectAutoClicker();
      const keyPattern = detectAutoTyper();

      const detectedPattern = mousePattern || clickPattern || keyPattern;

      if (detectedPattern) {
        suspiciousCountRef.current++;
        lastPatternRef.current = detectedPattern;
        console.log('[BotDetection] Suspicious pattern:', detectedPattern, 'Count:', suspiciousCountRef.current);
      } else {
        // Clean activity - decay faster
        suspiciousCountRef.current = Math.max(0, suspiciousCountRef.current - 2);
        if (suspiciousCountRef.current === 0) {
          lastPatternRef.current = null;
        }
      }

      const isBot = suspiciousCountRef.current >= DETECTION_CONFIG.SUSPICIOUS_THRESHOLD;
      isBotDetectedRef.current = isBot;

      return { isBot, pattern: isBot ? lastPatternRef.current : null };
    };

    // Track keyboard activity with history
    const trackKeydown = (e: KeyboardEvent) => {
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem('hrms_last_activity', now.toString());

      keystrokeHistoryRef.current.push({ key: e.key, timestamp: now });
      if (keystrokeHistoryRef.current.length > 30) {
        keystrokeHistoryRef.current.shift();
      }
    };

    // Track mouse movement with history
    const trackMouseMove = (e: globalThis.MouseEvent) => {
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem('hrms_last_activity', now.toString());

      mouseHistoryRef.current.push({ x: e.clientX, y: e.clientY, timestamp: now });
      if (mouseHistoryRef.current.length > 50) {
        mouseHistoryRef.current.shift();
      }
    };

    // Track clicks with history
    const trackClick = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem('hrms_last_activity', now.toString());

      clickHistoryRef.current.push({ timestamp: now });
      if (clickHistoryRef.current.length > 20) {
        clickHistoryRef.current.shift();
      }
    };

    // Track scroll (no history needed)
    const trackScroll = () => {
      lastActivityRef.current = Date.now();
      localStorage.setItem('hrms_last_activity', Date.now().toString());
    };

    // Set up event listeners
    window.addEventListener('keydown', trackKeydown);
    window.addEventListener('mousemove', trackMouseMove);
    window.addEventListener('click', trackClick);
    window.addEventListener('scroll', trackScroll);

    // Send heartbeat every 5 minutes
    const sendHeartbeat = async () => {
      if (!checkPunchInStatus()) {
        console.log('[Heartbeat] Skipping - not punched in');
        return;
      }

      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      const hadRecentActivity = timeSinceLastActivity < 5 * 60 * 1000;

      // Run bot detection
      const { isBot, pattern } = runBotDetection();

      // If bot detected, mark as inactive even if there was "activity"
      const wasActive = hadRecentActivity && !isBot;

      console.log('[Heartbeat] Sending...', {
        hadActivity: hadRecentActivity,
        isBot,
        pattern,
        suspiciousCount: suspiciousCountRef.current,
        active: wasActive
      });

      try {
        const response = await fetch('/api/attendance/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            active: wasActive,
            suspicious: isBot,
            patternType: pattern ? pattern.split(':')[0] : null,
            patternDetails: pattern,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('[Heartbeat] Failed:', error);
          setDebugInfo('Failed: ' + JSON.stringify(error));
        } else {
          const data = await response.json();
          console.log('[Heartbeat] Success:', data);
          const status = isBot ? '⚠️ BOT DETECTED' : (wasActive ? '✓ Active' : '○ Idle');
          setDebugInfo(`${status} at ${new Date().toLocaleTimeString()}`);
          localStorage.setItem('hrms_last_heartbeat', now.toString());
        }
      } catch (error) {
        console.error('[Heartbeat] Error:', error);
        setDebugInfo('Error: ' + String(error));
      }
    };

    // Send initial heartbeat immediately
    console.log('[ActivityHeartbeat] Sending initial heartbeat');
    sendHeartbeat();

    // Set up interval for every 5 minutes
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 5 * 60 * 1000);
    console.log('[ActivityHeartbeat] Interval set up for every 5 minutes');

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Heartbeat] Tab became visible - checking for missed heartbeats');
        const lastHeartbeat = parseInt(localStorage.getItem('hrms_last_heartbeat') || '0');
        const timeSince = Date.now() - lastHeartbeat;

        if (timeSince > 5 * 60 * 1000) {
          console.log('[Heartbeat] Missed heartbeat detected, sending now');
          sendHeartbeat();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for storage events (punch out in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hrms_punched_in' && e.newValue === 'false') {
        console.log('[Heartbeat] Punch out detected, stopping heartbeat');
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      console.log('[ActivityHeartbeat] Component unmounting, cleaning up');
      window.removeEventListener('keydown', trackKeydown);
      window.removeEventListener('mousemove', trackMouseMove);
      window.removeEventListener('click', trackClick);
      window.removeEventListener('scroll', trackScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  // Show debug info in development
  if (process.env.NODE_ENV === 'development' && debugInfo) {
    return (
      <div className="fixed bottom-4 right-4 bg-black text-white text-xs p-2 rounded opacity-50 z-50">
        Heartbeat: {debugInfo}
      </div>
    );
  }

  return null;
}
