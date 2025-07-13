/**
 * Social Accounts Manager Component
 * Manages connected social accounts and OAuth integrations
 */

import React, { useState } from 'react';

interface SocialAccount {
  provider: string;
  email: string;
  connected: boolean;
  connectedAt?: Date;
}

interface SocialAccountsManagerProps {
  className?: string;
}

export function SocialAccountsManager({ className = '' }: SocialAccountsManagerProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([
    { provider: 'Google', email: '', connected: false },
    { provider: 'Microsoft', email: '', connected: false },
    { provider: 'Apple', email: '', connected: false }
  ]);

  const handleConnect = async (provider: string) => {
    // Placeholder for OAuth connection logic
    console.log(`Connecting to ${provider}...`);
    
    // Simulate connection
    setAccounts(prev => prev.map(account => 
      account.provider === provider 
        ? { ...account, connected: true, email: 'user@example.com', connectedAt: new Date() }
        : account
    ));
  };

  const handleDisconnect = async (provider: string) => {
    // Placeholder for disconnection logic
    console.log(`Disconnecting from ${provider}...`);
    
    setAccounts(prev => prev.map(account => 
      account.provider === provider 
        ? { ...account, connected: false, email: '', connectedAt: undefined }
        : account
    ));
  };

  return (
    <div className={`social-accounts-manager ${className}`}>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Connected Accounts
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Link your social accounts for easier sign-in and data sync.
          </p>
        </div>

        <div className="space-y-4">
          {accounts.map(account => (
            <div key={account.provider} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {account.provider[0]}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {account.provider}
                  </div>
                  {account.connected && account.email && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {account.email}
                    </div>
                  )}
                  {account.connected && account.connectedAt && (
                    <div className="text-xs text-green-600 dark:text-green-400">
                      Connected {account.connectedAt.toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              <div>
                {account.connected ? (
                  <button
                    onClick={() => handleDisconnect(account.provider)}
                    className="px-3 py-1 text-sm border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(account.provider)}
                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Benefits of connecting accounts:
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Faster sign-in with social authentication</li>
            <li>• Automatic calendar sync (Google, Outlook)</li>
            <li>• Enhanced security with multi-factor authentication</li>
            <li>• Streamlined data backup and recovery</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default SocialAccountsManager;