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
  const lastPatternDetectedRef = useRef<{ type: string; details: string } | null>(null);

  /**
   * Detects if keystrokes are following a suspicious pattern
   * Returns pattern details if detected, null otherwise
   */
  const detectSuspiciousKeystrokePattern = (history: KeystrokeEvent[]): { type: string; details: string } | null => {
    if (history.length < 10) return null;

    // Check last 10 keystrokes
    const recent = history.slice(-10);

    // Pattern 1: Same key pressed repeatedly
    const keys = recent.map(e => e.key);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size === 1) {
      return {
        type: 'REPETITIVE_KEY',
        details: `Same key "${keys[0]}" pressed ${keys.length} times consecutively`
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
      return {
        type: 'REGULAR_INTERVAL_KEYSTROKES',
        details: `Keys pressed at regular ${Math.round(avgInterval)}ms intervals (${similarIntervals}/9 similar) - Auto-typer detected`
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
        return {
          type: 'ALTERNATING_KEYS',
          details: `Keys "${key1}" and "${key2}" alternating in perfect pattern - Macro detected`
        };
      }
    }

    return null;
  };

  /**
   * Detects if mouse movements are following a suspicious pattern
   * Returns pattern details if detected, null otherwise
   */
  const detectSuspiciousMousePattern = (history: MouseEvent[]): { type: string; details: string } | null => {
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
      return {
        type: 'LINEAR_MOUSE_MOVEMENT',
        details: `Mouse moving in straight line at ${avgDirectionDegrees}° (${similarDirections}/9 movements) - Mouse jiggler detected`
      };
    }

    // Pattern 2: Mouse not moving at all (stuck at same position)
    const positions = recent.map(e => `${e.x},${e.y}`);
    const uniquePositions = new Set(positions);
    if (uniquePositions.size === 1) {
      const x = recent[0].x;
      const y = recent[0].y;
      return {
        type: 'STATIC_MOUSE',
        details: `Mouse stuck at position (${x}, ${y}) - Fake mouse movement app detected`
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
      return;
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
        lastPatternDetectedRef.current = patternDetected;

        // If more than 3 suspicious patterns detected, don't count as activity
        if (suspiciousActivityCountRef.current > 3) {
          return;
        }
      } else {
        // Reset suspicious count on genuine activity
        suspiciousActivityCountRef.current = Math.max(0, suspiciousActivityCountRef.current - 1);
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
        lastPatternDetectedRef.current = patternDetected;

        if (suspiciousActivityCountRef.current > 3) {
          return;
        }
      } else {
        suspiciousActivityCountRef.current = Math.max(0, suspiciousActivityCountRef.current - 1);
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
            }),
          });
          hasRecentActivityRef.current = false; // Reset flag after sending

          // Reset pattern info after sending
          if (isSuspiciousActivity) {
            lastPatternDetectedRef.current = null;
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
