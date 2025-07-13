/**
 * Trusted Devices Component
 */

import React, { useState } from 'react';

interface TrustedDevice {
  id: string;
  name: string;
  lastAccess: Date;
  location: string;
  browser: string;
  current: boolean;
}

interface TrustedDevicesProps {
  className?: string;
}

export function TrustedDevices({ className = '' }: TrustedDevicesProps) {
  const [devices] = useState<TrustedDevice[]>([
    {
      id: '1',
      name: 'Current Device',
      lastAccess: new Date(),
      location: 'New York, NY',
      browser: 'Chrome',
      current: true
    }
  ]);

  return (
    <div className={`trusted-devices ${className}`}>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Trusted Devices
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage devices that can access your account
          </p>
        </div>

        <div className="space-y-3">
          {devices.map(device => (
            <div key={device.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {device.name}
                  {device.current && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {device.browser} • {device.location} • Last access: {device.lastAccess.toLocaleDateString()}
                </div>
              </div>
              {!device.current && (
                <button className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TrustedDevices;