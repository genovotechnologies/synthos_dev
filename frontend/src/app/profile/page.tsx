'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Corporation',
    role: 'Data Scientist',
    location: 'San Francisco, CA',
    bio: 'Passionate about synthetic data and privacy-preserving analytics. Building the future of data generation.',
    avatar_url: '',
    joined_date: '2024-01-15',
    subscription_tier: 'Professional',
    timezone: 'PST'
  });

  const stats = {
    total_datasets: 15,
    total_rows_generated: 2500000,
    current_month_usage: 45000,
    monthly_limit: 1000000,
    storage_used: 2.5, // GB
    api_calls_this_month: 1250,
    favorite_model: 'Claude 3 Sonnet',
    accuracy_average: 98.7
  };

  const recentActivity = [
    {
      id: 1,
      type: 'generation',
      description: 'Generated 5,000 rows from customer_data.csv',
      timestamp: '2 hours ago',
      status: 'completed'
    },
    {
      id: 2,
      type: 'upload',
      description: 'Uploaded sales_records.json (2.1 MB)',
      timestamp: '1 day ago',
      status: 'success'
    },
    {
      id: 3,
      type: 'api_call',
      description: 'API request to /v1/generate endpoint',
      timestamp: '2 days ago',
      status: 'success'
    },
    {
      id: 4,
      type: 'generation',
      description: 'Generated 10,000 rows from user_analytics.csv',
      timestamp: '3 days ago',
      status: 'completed'
    },
    {
      id: 5,
      type: 'subscription',
      description: 'Upgraded to Professional plan',
      timestamp: '1 week ago',
      status: 'success'
    }
  ];

  const achievements = [
    {
      id: 1,
      title: 'Data Pioneer',
      description: 'Generated your first synthetic dataset',
      icon: '🚀',
      earned: true,
      date: '2024-01-16'
    },
    {
      id: 2,
      title: 'Privacy Champion',
      description: 'Used high privacy settings for 10 generations',
      icon: '🛡️',
      earned: true,
      date: '2024-01-20'
    },
    {
      id: 3,
      title: 'Scale Master',
      description: 'Generated over 1M rows in total',
      icon: '📈',
      earned: true,
      date: '2024-01-25'
    },
    {
      id: 4,
      title: 'API Expert',
      description: 'Made 1000+ successful API calls',
      icon: '🔧',
      earned: true,
      date: '2024-01-28'
    },
    {
      id: 5,
      title: 'Quality Guru',
      description: 'Maintain 99%+ accuracy for 30 days',
      icon: '⭐',
      earned: false,
      progress: 87
    },
    {
      id: 6,
      title: 'Community Leader',
      description: 'Share 10 datasets with the community',
      icon: '👥',
      earned: false,
      progress: 3
    }
  ];

  const handleSaveProfile = () => {
    setIsEditing(false);
    // TODO: Save to API
    console.log('Saving profile:', profileData);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'generation': return '⚡';
      case 'upload': return '📤';
      case 'api_call': return '🔧';
      case 'subscription': return '💳';
      default: return '📝';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Profile</h1>
            <p className="text-lg text-muted-foreground">
              Manage your profile and view your activity
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Profile Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Profile Card */}
              <Card>
                <CardHeader className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    {profileData.full_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <CardTitle>{profileData.full_name}</CardTitle>
                  <CardDescription>
                    {profileData.role} at {profileData.company}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Full Name"
                      />
                      <input
                        type="text"
                        value={profileData.company}
                        onChange={(e) => setProfileData({...profileData, company: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Company"
                      />
                      <input
                        type="text"
                        value={profileData.role}
                        onChange={(e) => setProfileData({...profileData, role: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Role"
                      />
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md"
                        rows={3}
                        placeholder="Bio"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleSaveProfile} size="sm">Save</Button>
                        <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">{profileData.bio}</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span>{profileData.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span>Joined {new Date(profileData.joined_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>🎯</span>
                          <span>{profileData.subscription_tier} Plan</span>
                        </div>
                      </div>
                      <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                        Edit Profile
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Datasets Created</span>
                      <span className="font-semibold">{stats.total_datasets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Rows Generated</span>
                      <span className="font-semibold">{stats.total_rows_generated.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg. Accuracy</span>
                      <span className="font-semibold">{stats.accuracy_average}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Favorite Model</span>
                      <span className="font-semibold text-xs">{stats.favorite_model}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Usage This Month */}
              <Card>
                <CardHeader>
                  <CardTitle>Usage This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Rows Generated</span>
                        <span>{stats.current_month_usage.toLocaleString()} / {stats.monthly_limit.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${(stats.current_month_usage / stats.monthly_limit) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Storage Used</span>
                      <span>{stats.storage_used} GB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>API Calls</span>
                      <span>{stats.api_calls_this_month.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Activity & Achievements */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Your latest actions and generations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                        <div className="flex-1">
                          <p className="font-medium">{activity.description}</p>
                          <p className="text-sm text-muted-foreground">{activity.timestamp}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(activity.status)}`}>
                          {activity.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle>Achievements</CardTitle>
                  <CardDescription>
                    Your milestones and accomplishments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.map((achievement) => (
                      <div 
                        key={achievement.id} 
                        className={`p-4 border rounded-lg ${
                          achievement.earned ? 'border-green-200 bg-green-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`text-2xl ${achievement.earned ? '' : 'opacity-50'}`}>
                            {achievement.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-semibold ${achievement.earned ? 'text-green-700' : ''}`}>
                              {achievement.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {achievement.description}
                            </p>
                            {achievement.earned ? (
                              <div className="flex items-center gap-2 text-xs text-green-600">
                                <span>✓ Earned on {achievement.date}</span>
                              </div>
                            ) : achievement.progress ? (
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span>Progress</span>
                                  <span>{achievement.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-blue-600 h-1.5 rounded-full" 
                                    style={{ width: `${achievement.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">Not earned yet</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Data Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Data Insights</CardTitle>
                  <CardDescription>
                    Personalized insights based on your usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="font-semibold text-blue-700 mb-2">📊 Most Active Day</h3>
                      <p className="text-sm">You generate the most data on Tuesdays, averaging 15,000 rows per session.</p>
                    </div>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h3 className="font-semibold text-green-700 mb-2">🎯 Quality Streak</h3>
                      <p className="text-sm">You've maintained above 98% accuracy for the last 15 generations!</p>
                    </div>
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h3 className="font-semibold text-purple-700 mb-2">🚀 Efficiency Tip</h3>
                      <p className="text-sm">Consider using batch processing for your larger datasets to improve generation speed.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage; 