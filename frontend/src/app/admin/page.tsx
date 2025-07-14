'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

interface AdminStats {
  total_users: number;
  active_users: number;
  total_datasets: number;
  total_generations: number;
  total_revenue: number;
  system_health: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    api_response_time: number;
  };
  recent_activity: {
    id: string;
    type: string;
    user_email: string;
    description: string;
    timestamp: string;
  }[];
}

interface User {
  id: string;
  email: string;
  full_name: string;
  subscription_tier: string;
  created_at: string;
  last_login: string;
  is_active: boolean;
  total_usage: number;
}

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    // Check if user is admin
    if (user?.role !== 'admin') {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }

    fetchAdminData();
  }, [isAuthenticated, user, router]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsResponse, usersResponse] = await Promise.all([
        apiClient.getAdminStats(),
        // Mock users data - replace with actual API call
        Promise.resolve([
          {
            id: '1',
            email: 'user1@example.com',
            full_name: 'John Doe',
            subscription_tier: 'professional',
            created_at: '2024-01-15',
            last_login: '2024-01-20',
            is_active: true,
            total_usage: 50000
          },
          {
            id: '2',
            email: 'user2@example.com',
            full_name: 'Jane Smith',
            subscription_tier: 'free',
            created_at: '2024-01-10',
            last_login: '2024-01-19',
            is_active: true,
            total_usage: 5000
          }
        ])
      ]);

      setStats(statsResponse);
      setUsers(usersResponse);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    try {
      // Implement user actions (activate/deactivate/delete)
      console.log(`${action} user ${userId}`);
      // Refresh user data
      await fetchAdminData();
    } catch (err) {
      console.error(`Error ${action} user:`, err);
      setError(`Failed to ${action} user`);
    }
  };

  const getHealthColor = (percentage: number) => {
    if (percentage < 60) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBg = (percentage: number) => {
    if (percentage < 60) return 'bg-green-100';
    if (percentage < 80) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'system', label: 'System', icon: '⚙️' },
    { id: 'analytics', label: 'Analytics', icon: '📈' }
  ];

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-center">🚫 Access Denied</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.push('/dashboard')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-lg text-muted-foreground">
              System administration and monitoring
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex space-x-4 mb-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total_users.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.active_users} active
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Datasets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total_datasets.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total uploaded
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Generations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total_generations.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total jobs
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${stats.total_revenue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total revenue
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-lg ${getHealthBg(stats.system_health.cpu_usage)}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">CPU Usage</span>
                        <span className={`text-lg font-bold ${getHealthColor(stats.system_health.cpu_usage)}`}>
                          {stats.system_health.cpu_usage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-current h-2 rounded-full transition-all duration-300"
                          style={{ width: `${stats.system_health.cpu_usage}%` }}
                        />
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg ${getHealthBg(stats.system_health.memory_usage)}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Memory</span>
                        <span className={`text-lg font-bold ${getHealthColor(stats.system_health.memory_usage)}`}>
                          {stats.system_health.memory_usage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-current h-2 rounded-full transition-all duration-300"
                          style={{ width: `${stats.system_health.memory_usage}%` }}
                        />
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg ${getHealthBg(stats.system_health.disk_usage)}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Disk Usage</span>
                        <span className={`text-lg font-bold ${getHealthColor(stats.system_health.disk_usage)}`}>
                          {stats.system_health.disk_usage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-current h-2 rounded-full transition-all duration-300"
                          style={{ width: `${stats.system_health.disk_usage}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">API Response</span>
                        <span className="text-lg font-bold text-blue-600">
                          {stats.system_health.api_response_time}ms
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Average response time
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.recent_activity.map(activity => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{activity.description}</p>
                          <p className="text-sm text-muted-foreground">{activity.user_email}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs ${
                            activity.type === 'generation' ? 'bg-green-100 text-green-800' :
                            activity.type === 'upload' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {activity.type}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts and subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.subscription_tier === 'enterprise' ? 'bg-yellow-100 text-yellow-800' :
                            user.subscription_tier === 'professional' ? 'bg-purple-100 text-purple-800' :
                            user.subscription_tier === 'starter' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.subscription_tier}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span>Usage: {user.total_usage.toLocaleString()} rows</span>
                          <span className="mx-2">•</span>
                          <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                          <span className="mx-2">•</span>
                          <span>Last login: {new Date(user.last_login).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUserAction(user.id, user.is_active ? 'deactivate' : 'activate')}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUserAction(user.id, 'view')}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Max file size (MB)</label>
                        <input 
                          type="number" 
                          defaultValue={100}
                          className="w-full p-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Rate limit (requests/minute)</label>
                        <input 
                          type="number" 
                          defaultValue={100}
                          className="w-full p-2 border rounded-md"
                        />
                      </div>
                    </div>
                    <Button>Save Configuration</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Maintenance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">System Backup</p>
                        <p className="text-sm text-muted-foreground">Create a full system backup</p>
                      </div>
                      <Button>Create Backup</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Clear Cache</p>
                        <p className="text-sm text-muted-foreground">Clear system cache and temporary files</p>
                      </div>
                      <Button variant="outline">Clear Cache</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">System Restart</p>
                        <p className="text-sm text-muted-foreground">Restart all system services</p>
                      </div>
                      <Button variant="destructive">Restart System</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📊</div>
                    <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
                    <p className="text-muted-foreground">
                      Detailed analytics and reporting features will be available here
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 