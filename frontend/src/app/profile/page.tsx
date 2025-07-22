'use client';

import React, { useState, useEffect, type FC } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api';

const ProfilePage: FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const [profile, usage, jobs, datasets] = await Promise.all([
          apiClient.getProfile(),
          apiClient.getUserUsage(),
          apiClient.getGenerationJobs(),
          apiClient.getDatasets()
        ]);
        setProfileData(profile);
        setStats({
          total_datasets: usage.total_datasets_created,
          total_rows_generated: usage.total_rows_generated,
          current_month_usage: usage.current_month_usage,
          monthly_limit: usage.monthly_limit,
          storage_used: (usage.datasets_storage_mb / 1024).toFixed(2),
          api_calls_this_month: usage.api_calls_this_month,
          favorite_model: jobs.length > 0 ? jobs[0].generation_parameters?.model_type || '-' : '-',
          accuracy_average: jobs.length > 0 ? (jobs[0].quality_score || 0).toFixed(1) : 'N/A'
        });
        // Recent activity: combine jobs and datasets
        const activity = [
          ...jobs.map((job: any) => ({
            id: `job-${job.job_id}`,
            type: 'generation',
            description: `Generated ${job.rows_generated || job.rows_requested} rows from ${job.dataset_name || 'dataset'}`,
            timestamp: new Date(job.created_at).toLocaleString(),
            status: job.status
          })),
          ...datasets.map((ds: any) => ({
            id: `ds-${ds.id}`,
            type: 'upload',
            description: `Uploaded ${ds.name} (${(ds.file_size / 1024 / 1024).toFixed(2)} MB)`,
            timestamp: new Date(ds.created_at).toLocaleString(),
            status: ds.status
          }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
        setRecentActivity(activity);
        // Achievements: try user_metadata, else fallback
        if (profile.user_metadata && profile.user_metadata.achievements) {
          setAchievements(profile.user_metadata.achievements);
        } else {
          setAchievements([
            // fallback mock
            { id: 1, title: 'Data Pioneer', description: 'Generated your first synthetic dataset', icon: '🚀', earned: true, date: '2024-01-16' }
          ]);
        }
        setError(null);
      } catch (err) {
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

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

  if (loading) {
    return <div className="flex flex-col min-h-screen"><Header /><main className="flex-1 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div><p className="text-lg text-muted-foreground">Loading profile...</p></div></main></div>;
  }
  if (error) {
    return <div className="flex flex-col min-h-screen"><Header /><main className="flex-1 flex items-center justify-center"><div className="text-center text-red-600">{error}</div></main></div>;
  }

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
                    {profileData?.full_name?.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <CardTitle>{profileData?.full_name}</CardTitle>
                  <CardDescription>
                    {profileData?.role} at {profileData?.company}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={profileData?.full_name}
                        onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Full Name"
                      />
                      <input
                        type="text"
                        value={profileData?.company}
                        onChange={(e) => setProfileData({...profileData, company: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Company"
                      />
                      <input
                        type="text"
                        value={profileData?.role}
                        onChange={(e) => setProfileData({...profileData, role: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Role"
                      />
                      <textarea
                        value={profileData?.bio}
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
                      <div className="text-sm text-muted-foreground">{profileData?.bio}</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span>{profileData?.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span>Joined {new Date(profileData?.joined_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>🎯</span>
                          <span>{profileData?.subscription_tier} Plan</span>
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
                      <span className="font-semibold">{stats?.total_datasets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Rows Generated</span>
                      <span className="font-semibold">{stats?.total_rows_generated.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg. Accuracy</span>
                      <span className="font-semibold">{stats?.accuracy_average}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Favorite Model</span>
                      <span className="font-semibold text-xs">{stats?.favorite_model}</span>
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
                        <span>{stats?.current_month_usage.toLocaleString()} / {stats?.monthly_limit.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${(stats?.current_month_usage / stats?.monthly_limit) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Storage Used</span>
                      <span>{stats?.storage_used} GB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>API Calls</span>
                      <span>{stats?.api_calls_this_month.toLocaleString()}</span>
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