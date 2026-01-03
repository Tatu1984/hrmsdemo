'use client';

import { useEffect, useRef } from 'react';

type BrowserEventType =
  | 'TAB_OPENED'
  | 'TAB_CLOSED'
  | 'TAB_VISIBLE'
  | 'TAB_HIDDEN'
  | 'TAB_FOCUSED'
  | 'TAB_BLURRED'
  | 'SESSION_START'
  | 'SESSION_END'
  | 'PAGE_LOAD'
  | 'PAGE_UNLOAD'
  | 'WINDOW_MINIMIZED'
  | 'WINDOW_RESTORED';

interface BrowserInfo {
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  deviceType: string;
}

/**
 * Browser Activity Tracker Component
 * Tracks tab visibility, focus, and session events for audit logging
 */
export function BrowserActivityTracker() {
  const sessionIdRef = useRef<string>('');
  const tabIdRef = useRef<string>('');
  const sessionStartTimeRef = useRef<number>(Date.now());
  const lastVisibilityStateRef = useRef<string>('visible');

  useEffect(() => {
    // Generate unique session and tab IDs
    const generateId = () => {
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    // Check for existing session or create new one
    let storedSessionId = sessionStorage.getItem('hrms_browser_session_id');
    if (!storedSessionId) {
      storedSessionId = generateId();
      sessionStorage.setItem('hrms_browser_session_id', storedSessionId);
    }
    sessionIdRef.current = storedSessionId;
    tabIdRef.current = generateId();

    // Parse user agent for browser/OS info
    const getBrowserInfo = (): BrowserInfo => {
      const ua = navigator.userAgent;
      let browserName = 'Unknown';
      let browserVersion = '';
      let osName = 'Unknown';
      let osVersion = '';
      let deviceType = 'Desktop';

      // Detect browser
      if (ua.includes('Firefox/')) {
        browserName = 'Firefox';
        browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || '';
      } else if (ua.includes('Edg/')) {
        browserName = 'Edge';
        browserVersion = ua.match(/Edg\/(\d+\.\d+)/)?.[1] || '';
      } else if (ua.includes('Chrome/')) {
        browserName = 'Chrome';
        browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || '';
      } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
        browserName = 'Safari';
        browserVersion = ua.match(/Version\/(\d+\.\d+)/)?.[1] || '';
      }

      // Detect OS
      if (ua.includes('Windows NT')) {
        osName = 'Windows';
        const version = ua.match(/Windows NT (\d+\.\d+)/)?.[1];
        osVersion = version === '10.0' ? '10/11' : version || '';
      } else if (ua.includes('Mac OS X')) {
        osName = 'macOS';
        osVersion = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.') || '';
      } else if (ua.includes('Linux')) {
        osName = 'Linux';
      } else if (ua.includes('Android')) {
        osName = 'Android';
        osVersion = ua.match(/Android (\d+\.?\d*)/)?.[1] || '';
      } else if (ua.includes('iPhone') || ua.includes('iPad')) {
        osName = 'iOS';
        osVersion = ua.match(/OS (\d+_\d+)/)?.[1]?.replace('_', '.') || '';
      }

      // Detect device type
      if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
        deviceType = /iPad/i.test(ua) ? 'Tablet' : 'Mobile';
      }

      return { browserName, browserVersion, osName, osVersion, deviceType };
    };

    const browserInfo = getBrowserInfo();

    // Log event to server
    const logEvent = async (
      eventType: BrowserEventType,
      duration?: number,
      metadata?: Record<string, any>
    ) => {
      try {
        await fetch('/api/browser-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType,
            sessionId: sessionIdRef.current,
            tabId: tabIdRef.current,
            ...browserInfo,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            pageUrl: window.location.href,
            pagePath: window.location.pathname,
            duration,
            metadata,
          }),
        });
      } catch (error) {
        console.error('[BrowserActivityTracker] Failed to log event:', error);
      }
    };

    // Log session start / page load
    logEvent('SESSION_START');
    logEvent('PAGE_LOAD');

    // Handle visibility change (tab hidden/visible)
    const handleVisibilityChange = () => {
      const newState = document.visibilityState;

      if (newState === 'hidden' && lastVisibilityStateRef.current === 'visible') {
        logEvent('TAB_HIDDEN');
      } else if (newState === 'visible' && lastVisibilityStateRef.current === 'hidden') {
        logEvent('TAB_VISIBLE');
      }

      lastVisibilityStateRef.current = newState;
    };

    // Handle window focus/blur
    const handleFocus = () => {
      logEvent('TAB_FOCUSED');
    };

    const handleBlur = () => {
      logEvent('TAB_BLURRED');
    };

    // Handle page unload / tab close
    const handleBeforeUnload = () => {
      const duration = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

      // Use sendBeacon for reliable delivery on page close
      const data = JSON.stringify({
        eventType: 'TAB_CLOSED',
        sessionId: sessionIdRef.current,
        tabId: tabIdRef.current,
        ...browserInfo,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        pageUrl: window.location.href,
        pagePath: window.location.pathname,
        duration,
        metadata: { closedAt: new Date().toISOString() },
      });

      // sendBeacon is more reliable for unload events
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/browser-activity', data);
      }
    };

    // Handle page hide (more reliable than beforeunload on mobile)
    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page is being cached (bfcache), not actually closed
        logEvent('TAB_HIDDEN');
      } else {
        const duration = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

        const data = JSON.stringify({
          eventType: 'PAGE_UNLOAD',
          sessionId: sessionIdRef.current,
          tabId: tabIdRef.current,
          ...browserInfo,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          pageUrl: window.location.href,
          pagePath: window.location.pathname,
          duration,
        });

        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/browser-activity', data);
        }
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
