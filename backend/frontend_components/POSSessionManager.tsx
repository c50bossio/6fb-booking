/**
 * POS Session Manager Component
 * Handles session timeout warnings and CSRF token management for POS system
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';

interface SessionManagerProps {
  sessionToken: string;
  csrfToken: string;
  onSessionExpired: () => void;
  onSessionWarning?: (remainingMinutes: number) => void;
  checkInterval?: number; // in seconds, default 60
}

interface SessionStatus {
  valid: boolean;
  expired: boolean;
  warning: boolean;
  remaining_minutes: number;
  warning_threshold?: number;
  expires_at?: string;
}

export const POSSessionManager: React.FC<SessionManagerProps> = ({
  sessionToken,
  csrfToken,
  onSessionExpired,
  onSessionWarning,
  checkInterval = 60
}) => {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check session timeout status
  const checkSessionTimeout = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/barber-pin/check-timeout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ session_token: sessionToken })
      });

      if (!response.ok) {
        throw new Error('Failed to check session status');
      }

      const status: SessionStatus = await response.json();
      setSessionStatus(status);

      if (status.expired) {
        onSessionExpired();
        return;
      }

      if (status.warning && !showWarning) {
        setShowWarning(true);
        if (onSessionWarning) {
          onSessionWarning(status.remaining_minutes);
        }
      } else if (!status.warning && showWarning) {
        setShowWarning(false);
      }
    } catch (error) {
      console.error('Error checking session timeout:', error);
    }
  }, [sessionToken, csrfToken, onSessionExpired, onSessionWarning, showWarning]);

  // Extend session on activity
  const extendSessionOnActivity = useCallback(async () => {
    try {
      await fetch('/api/v1/barber-pin/extend-activity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ session_token: sessionToken })
      });
    } catch (error) {
      console.error('Error extending session:', error);
    }
  }, [sessionToken, csrfToken]);

  // Track user activity
  const handleUserActivity = useCallback(() => {
    // Clear existing timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    // Set new timeout for activity-based extension (5 minutes)
    activityTimeoutRef.current = setTimeout(() => {
      extendSessionOnActivity();
    }, 5 * 60 * 1000);
  }, [extendSessionOnActivity]);

  // Set up session checking interval
  useEffect(() => {
    // Initial check
    checkSessionTimeout();

    // Set up interval
    intervalRef.current = setInterval(checkSessionTimeout, checkInterval * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkSessionTimeout, checkInterval]);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];

    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });

      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [handleUserActivity]);

  // Session Warning Modal Component
  if (showWarning && sessionStatus) {
    return (
      <SessionWarningModal
        remainingMinutes={sessionStatus.remaining_minutes}
        onExtend={async () => {
          await extendSessionOnActivity();
          setShowWarning(false);
        }}
        onLogout={onSessionExpired}
      />
    );
  }

  return null;
};

// Session Warning Modal Component
interface SessionWarningModalProps {
  remainingMinutes: number;
  onExtend: () => void;
  onLogout: () => void;
}

const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  remainingMinutes,
  onExtend,
  onLogout
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-semibold">Session Timeout Warning</h3>
        </div>

        <p className="text-gray-600 mb-6">
          Your session will expire in {remainingMinutes} minutes due to inactivity.
          Would you like to continue working?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onExtend}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Continue Working
          </button>
          <button
            onClick={onLogout}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

// CSRF Token Manager Hook
export const useCSRFToken = (csrfToken: string) => {
  const getHeaders = useCallback((additionalHeaders?: HeadersInit): HeadersInit => {
    return {
      'X-CSRF-Token': csrfToken,
      ...additionalHeaders
    };
  }, [csrfToken]);

  const secureFetch = useCallback(async (
    url: string,
    options?: RequestInit
  ): Promise<Response> => {
    const secureOptions: RequestInit = {
      ...options,
      headers: getHeaders(options?.headers)
    };

    return fetch(url, secureOptions);
  }, [getHeaders]);

  return { getHeaders, secureFetch };
};

// Example usage in a POS component
export const POSExample: React.FC = () => {
  const [sessionToken, setSessionToken] = useState<string>('');
  const [csrfToken, setCSRFToken] = useState<string>('');

  // Use CSRF token hook
  const { secureFetch } = useCSRFToken(csrfToken);

  const handleTransaction = async (transactionData: any) => {
    try {
      const response = await secureFetch('/api/v1/pos/transaction', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionData)
      });

      if (!response.ok) {
        throw new Error('Transaction failed');
      }

      const result = await response.json();
      console.log('Transaction successful:', result);
    } catch (error) {
      console.error('Transaction error:', error);
    }
  };

  return (
    <>
      <POSSessionManager
        sessionToken={sessionToken}
        csrfToken={csrfToken}
        onSessionExpired={() => {
          // Handle logout
          window.location.href = '/login';
        }}
        onSessionWarning={(minutes) => {
          console.log(`Session expiring in ${minutes} minutes`);
        }}
      />

      {/* Your POS UI here */}
      <div>POS Interface</div>
    </>
  );
};
