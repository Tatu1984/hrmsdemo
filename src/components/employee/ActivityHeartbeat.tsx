'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Activity Heartbeat Component
 * Tracks employee activity and sends heartbeats every 3 minutes
 * Continues heartbeat even when tab is closed/minimized using localStorage
 */
export function ActivityHeartbeat() {
  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    console.log('[ActivityHeartbeat] Component mounted');

    // Check if user is punched in by checking localStorage
    const checkPunchInStatus = () => {
      const punchedIn = localStorage.getItem('hrms_punched_in');
      return punchedIn === 'true';
    };

    // Track user activity
    const trackActivity = () => {
      lastActivityRef.current = Date.now();
      localStorage.setItem('hrms_last_activity', Date.now().toString());
    };

    // Listen for keyboard and mouse activity
    window.addEventListener('keydown', trackActivity);
    window.addEventListener('mousemove', trackActivity);
    window.addEventListener('click', trackActivity);
    window.addEventListener('scroll', trackActivity);

    // Send heartbeat every 3 minutes
    const sendHeartbeat = async () => {
      if (!checkPunchInStatus()) {
        console.log('[Heartbeat] Skipping - not punched in');
        return;
      }

      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      const wasActive = timeSinceLastActivity < 5 * 60 * 1000;

      console.log('[Heartbeat] Sending... Active:', wasActive, 'LastActivity:', Math.floor(timeSinceLastActivity / 1000) + 's ago');

      try {
        const response = await fetch('/api/attendance/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: wasActive }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('[Heartbeat] Failed:', error);
          setDebugInfo('Failed: ' + JSON.stringify(error));
        } else {
          const data = await response.json();
          console.log('[Heartbeat] Success:', data);
          setDebugInfo('Success at ' + new Date().toLocaleTimeString());
          localStorage.setItem('hrms_last_heartbeat', Date.now().toString());
        }
      } catch (error) {
        console.error('[Heartbeat] Error:', error);
        setDebugInfo('Error: ' + String(error));
      }
    };

    // Send initial heartbeat immediately
    console.log('[ActivityHeartbeat] Sending initial heartbeat');
    sendHeartbeat();

    // Set up interval to send heartbeat every 3 minutes (180000ms)
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 3 * 60 * 1000);
    console.log('[ActivityHeartbeat] Interval set up for every 3 minutes');

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Heartbeat] Tab became visible - checking for missed heartbeats');
        const lastHeartbeat = parseInt(localStorage.getItem('hrms_last_heartbeat') || '0');
        const timeSince = Date.now() - lastHeartbeat;

        // If more than 3 minutes passed, send heartbeat immediately
        if (timeSince > 3 * 60 * 1000) {
          console.log('[Heartbeat] Missed heartbeat detected, sending now');
          sendHeartbeat();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for storage events (when other tabs update punch status)
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
      window.removeEventListener('keydown', trackActivity);
      window.removeEventListener('mousemove', trackActivity);
      window.removeEventListener('click', trackActivity);
      window.removeEventListener('scroll', trackActivity);
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
