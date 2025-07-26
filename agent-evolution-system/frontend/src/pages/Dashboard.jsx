import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
} from 'chart.js';
import { 
  TrendingUp, 
  TrendingDown, 
  Bot, 
  Lightbulb, 
  MessageSquare, 
  Clock,
  CheckCircle,
  AlertTriangle 
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
);

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard');
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
        <p className="mt-1 text-sm text-gray-500">
          Unable to load dashboard data. Please try again.
        </p>
      </div>
    );
  }

  const stats = [
    {
      name: 'Active Agents',
      value: dashboardData.active_agents || 0,
      change: '+12%',
      changeType: 'increase',
      icon: Bot,
    },
    {
      name: 'Code Patterns',
      value: dashboardData.total_patterns || 0,
      change: '+19%',
      changeType: 'increase',
      icon: Lightbulb,
    },
    {
      name: 'Feedback Items',
      value: dashboardData.total_feedback || 0,
      change: '+8%',
      changeType: 'increase',
      icon: MessageSquare,
    },
    {
      name: 'Avg Quality Score',
      value: dashboardData.avg_quality_score || 0,
      change: '+2.1%',
      changeType: 'increase',
      icon: CheckCircle,
    },
  ];

  const qualityTrendData = {
    labels: dashboardData.quality_trends?.labels || [],
    datasets: [
      {
        label: 'Quality Score',
        data: dashboardData.quality_trends?.data || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const agentPerformanceData = {
    labels: dashboardData.agent_performance?.labels || [],
    datasets: [
      {
        label: 'Performance Score',
        data: dashboardData.agent_performance?.data || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
      },
    ],
  };

  const patternUsageData = {
    labels: ['Database', 'API', 'Frontend', 'Security', 'Performance'],
    datasets: [
      {
        data: dashboardData.pattern_usage || [30, 25, 20, 15, 10],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your AI agent evolution system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <item.icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {typeof item.value === 'number' && item.name.includes('Score') 
                          ? item.value.toFixed(1) 
                          : item.value}
                      </div>
                      <div
                        className={`ml-2 flex items-baseline text-sm font-semibold ${
                          item.changeType === 'increase'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {item.changeType === 'increase' ? (
                          <TrendingUp className="h-4 w-4 flex-shrink-0 self-center" />
                        ) : (
                          <TrendingDown className="h-4 w-4 flex-shrink-0 self-center" />
                        )}
                        <span className="ml-1">{item.change}</span>
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Quality Trends (Last 30 Days)
          </h3>
          <Line data={qualityTrendData} options={chartOptions} />
        </div>

        {/* Agent Performance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Agent Performance
          </h3>
          <Bar data={agentPerformanceData} options={chartOptions} />
        </div>

        {/* Pattern Usage */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Pattern Usage by Category
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut 
              data={patternUsageData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {dashboardData.recent_activity?.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-blue-600 mt-2"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500 flex items-center mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {activity.timestamp}
                  </p>
                </div>
              </div>
            )) || (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
            <Bot className="h-6 w-6 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900">Create Agent</h4>
            <p className="text-sm text-gray-500">Add a new AI agent</p>
          </button>
          
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
            <Lightbulb className="h-6 w-6 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900">Extract Pattern</h4>
            <p className="text-sm text-gray-500">Extract code pattern</p>
          </button>
          
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
            <MessageSquare className="h-6 w-6 text-yellow-600 mb-2" />
            <h4 className="font-medium text-gray-900">Submit Feedback</h4>
            <p className="text-sm text-gray-500">Provide feedback</p>
          </button>
          
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
            <TrendingUp className="h-6 w-6 text-purple-600 mb-2" />
            <h4 className="font-medium text-gray-900">View Analytics</h4>
            <p className="text-sm text-gray-500">Detailed insights</p>
          </button>
        </div>
      </div>
    </div>
  );
}