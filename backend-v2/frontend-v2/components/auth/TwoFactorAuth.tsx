/**
 * Two Factor Authentication Component
 */

import React, { useState } from 'react';

interface TwoFactorAuthProps {
  className?: string;
  onEnable?: () => void;
  onDisable?: () => void;
}

export function TwoFactorAuth({ className = '', onEnable, onDisable }: TwoFactorAuthProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  const handleToggle = async () => {
    setIsEnabling(true);
    try {
      if (isEnabled) {
        await onDisable?.();
        setIsEnabled(false);
      } else {
        await onEnable?.();
        setIsEnabled(true);
      }
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <div className={`two-factor-auth ${className}`}>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Two-Factor Authentication
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add an extra layer of security to your account
          </p>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              Authenticator App
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Use an app like Google Authenticator or Authy
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={isEnabling}
            className={`px-4 py-2 rounded-md transition-colors ${
              isEnabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } disabled:opacity-50`}
          >
            {isEnabling ? 'Processing...' : isEnabled ? 'Disable' : 'Enable'}
          </button>
        </div>

        {isEnabled && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="text-green-800 dark:text-green-200">
              <strong>Two-factor authentication is enabled.</strong>
              <div className="text-sm mt-1">
                Your account is protected with an additional security layer.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TwoFactorAuth;

// Export alias for compatibility
export { TwoFactorAuth as TwoFactorSetup };