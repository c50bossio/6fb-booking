import React, { useState, useEffect } from 'react';
import { Search, Bell, User, Activity } from 'lucide-react';

export default function Header() {
  const [systemHealth, setSystemHealth] = useState('checking');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Check system health
    fetch('/health')
      .then(res => res.json())
      .then(data => setSystemHealth(data.status))
      .catch(() => setSystemHealth('error'));
  }, []);

  const getHealthColor = () => {
    switch (systemHealth) {
      case 'healthy': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search agents, patterns, feedback..."
              className="pl-10 pr-4 py-2 w-96 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Activity className={`w-4 h-4 ${getHealthColor()}`} />
            <span className={`text-sm font-medium ${getHealthColor()}`}>
              {systemHealth === 'healthy' ? 'System Healthy' : 
               systemHealth === 'error' ? 'System Error' : 'Checking...'}
            </span>
          </div>

          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-600"></span>
          </button>

          <button className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <User className="w-5 h-5" />
            <span className="text-sm font-medium">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
}