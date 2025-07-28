'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

interface Dataset {
  id: number;
  name: string;
  status: string;
  row_count: number;
  column_count: number;
  created_at: string;
  file_size: number;
}

interface UserUsage {
  current_month_usage: number;
  total_rows_generated: number;
  total_datasets_created: number;
  monthly_limit: number;
  storage_limit_mb: number;
  datasets_storage_mb: number;
}

interface GenerationJob {
  id: number;
  dataset_id: number;
  rows_requested: number;
  rows_generated: number;
  status: string;
  progress_percentage: number;
  created_at: string;
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [recentJobs, setRecentJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [promptCache, setPromptCache] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ [jobId: string]: number }>({});
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<{ [jobId: string]: boolean }>({});

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Use proper API client methods
        const [datasetsData, usageData, jobsData] = await Promise.all([
          apiClient.getDatasets().catch(err => {
            console.warn('Datasets API error:', err);
            return [];
          }),
          apiClient.getUserUsage().catch(err => {
            console.warn('Usage API error:', err);
            return {
              current_month_usage: 0,
              total_rows_generated: 0,
              total_datasets_created: 0,
              monthly_limit: 10000,
              storage_limit_mb: 100,
              datasets_storage_mb: 0
            };
          }),
          apiClient.getGenerationJobs().catch(err => {
            console.warn('Generation jobs API error:', err);
            return [];
          })
        ]);

        setDatasets(datasetsData);
        setUsage(usageData);
        setRecentJobs(jobsData);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Fetch analytics and prompt cache
    const fetchAnalytics = async () => {
      try {
        const analyticsData = await apiClient.getAnalyticsPerformance();
        setAnalytics(analyticsData);
        const promptCacheData = await apiClient.getPromptCache();
        setPromptCache(promptCacheData);
      } catch (err) {
        // Ignore analytics errors for now
      }
    };
    fetchAnalytics();
  }, [isAuthenticated, router]);

  // Replace direct fetch with apiClient for upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await apiClient.uploadDataset(file, { name: file.name });
      // Optionally, refetch datasets instead of reload
      setDatasets(await apiClient.getDatasets());
      setError(null);
    } catch (err) {
      setError('Failed to upload file');
    }
  };

  // Replace direct fetch with apiClient for generation
  const startGeneration = async (datasetId: number) => {
    try {
      await apiClient.startGeneration({
        dataset_id: datasetId,
        rows: 1000,
        privacy_level: 'medium'
      });
      setRecentJobs(await apiClient.getGenerationJobs());
      setError(null);
    } catch (err) {
      setError('Failed to start generation');
    }
  };

  const handleFeedbackChange = (jobId: string, value: number) => {
    setFeedback((prev) => ({ ...prev, [jobId]: value }));
  };

  const handleFeedbackSubmit = async (jobId: string) => {
    if (!feedback[jobId]) return;
    await apiClient.submitFeedback(jobId, feedback[jobId]);
    setFeedbackSubmitted((prev) => ({ ...prev, [jobId]: true }));
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center" role="status" aria-live="polite" aria-busy="true">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" tabIndex={0}></div>
            <p className="text-lg text-muted-foreground">Loading dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700" role="alert" aria-live="assertive" tabIndex={-1}>
              {error}
            </div>
          )}

          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              Welcome back, {user?.full_name || user?.email}! 👋
            </h1>
          <p className="text-lg text-muted-foreground">
              Generate high-quality synthetic data with privacy-first AI models
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usage?.current_month_usage || 0}</div>
                <p className="text-xs text-muted-foreground">
                  of {usage?.monthly_limit || 10000} rows
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ 
                      width: `${Math.min((usage?.current_month_usage || 0) / (usage?.monthly_limit || 10000) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Datasets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{datasets.length}</div>
                <p className="text-xs text-muted-foreground">
                  {usage?.datasets_storage_mb || 0}MB used
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Rows Generated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usage?.total_rows_generated || 0}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {recentJobs.filter(job => job.status === 'running').length}
                </div>
                <p className="text-xs text-muted-foreground">Currently running</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Datasets Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Your Datasets</CardTitle>
                  <div>
                    <input
                      type="file"
                      accept=".csv,.json,.parquet,.xlsx"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button asChild className="touch-target">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Upload Dataset
                      </label>
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Manage your uploaded datasets and generate synthetic data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {datasets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-4">📊</div>
                    <p>No datasets uploaded yet</p>
                    <p className="text-sm">Upload your first dataset to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {datasets.slice(0, 3).map((dataset) => (
                      <div key={dataset.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{dataset.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {dataset.row_count} rows, {dataset.column_count} columns
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(dataset.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            dataset.status === 'ready' ? 'bg-green-100 text-green-700' :
                            dataset.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {dataset.status}
                          </span>
                          {dataset.status === 'ready' && (
                            <Button 
                              size="sm" 
                              onClick={() => startGeneration(dataset.id)}
                              className="touch-target"
                            >
                              Generate
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Generation Jobs</CardTitle>
                <CardDescription>
                  Track your synthetic data generation progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentJobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-4">⚡</div>
                    <p>No generation jobs yet</p>
                    <p className="text-sm">Upload a dataset to start generating</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentJobs.slice(0, 3).map((job) => (
                      <div key={job.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">Job #{job.id}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            job.status === 'completed' ? 'bg-green-100 text-green-700' :
                            job.status === 'running' ? 'bg-blue-100 text-blue-700' :
                            job.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {job.rows_generated || 0} of {job.rows_requested} rows
                        </p>
                        {job.status === 'running' && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${job.progress_percentage}%` }}
                            ></div>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(job.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks to get you started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col items-center gap-2 touch-target" asChild>
                    <Link href="/datasets">
                      <span className="text-2xl">📊</span>
                      <span>View Analytics</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center gap-2 touch-target" asChild>
                    <Link href="/api">
                      <span className="text-2xl">⚙️</span>
                      <span>API Settings</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center gap-2 touch-target" asChild>
                    <Link href="/documentation">
                      <span className="text-2xl">📚</span>
                      <span>Documentation</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Section */}
          <AnalyticsSection 
            analytics={analytics}
            promptCache={promptCache}
            recentJobs={recentJobs}
            feedback={feedback}
            feedbackSubmitted={feedbackSubmitted}
            handleFeedbackChange={handleFeedbackChange}
            handleFeedbackSubmit={handleFeedbackSubmit}
          />
        </div>
      </main>
    </div>
  );
}

  // --- Analytics Section ---
  const AnalyticsSection = ({ analytics, promptCache, recentJobs, feedback, feedbackSubmitted, handleFeedbackChange, handleFeedbackSubmit }: {
    analytics: any;
    promptCache: any;
    recentJobs: GenerationJob[];
    feedback: { [jobId: string]: number };
    feedbackSubmitted: { [jobId: string]: boolean };
    handleFeedbackChange: (jobId: string, value: number) => void;
    handleFeedbackSubmit: (jobId: string) => Promise<void>;
  }) => (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Generation Analytics & Feedback</CardTitle>
        <CardDescription>
          View performance, prompt optimization, and provide feedback on generation jobs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {analytics && (
          <div className="mb-6">
            <h4 className="font-semibold mb-2">Performance Log (last 5)</h4>
            <ul className="text-xs space-y-1">
              {analytics.performance_log.slice(-5).map((entry: any, i: number) => (
                <li key={i}>
                  Time: {new Date(entry[0] * 1000).toLocaleString()}, Response: {entry[1] || '-'}s, Quality: {entry[2] || '-'}, Cost: {entry[3] || '-'}
                </li>
              ))}
            </ul>
            <div className="mt-2 text-xs text-muted-foreground">
              Quality Degradation Events: {analytics.quality_degradation_events.length}
            </div>
          </div>
        )}
        {promptCache && (
          <div className="mb-6">
            <h4 className="font-semibold mb-2">Prompt Cache</h4>
            <div className="text-xs">Cached prompts: {Object.keys(promptCache).length}</div>
          </div>
        )}
        <div className="mb-2">
          <h4 className="font-semibold mb-2">Job Feedback</h4>
          {recentJobs.slice(0, 3).map((job) => (
            <div key={job.id} className="mb-2 flex items-center gap-2">
              <span className="text-xs">Job #{job.id}</span>
              <input
                type="number"
                min={1}
                max={10}
                value={feedback[String(job.id)] || ''}
                onChange={(e) => handleFeedbackChange(String(job.id), Number(e.target.value))}
                className="w-16 px-2 py-1 border rounded text-xs"
                placeholder="1-10"
                disabled={feedbackSubmitted[String(job.id)]}
              />
              <Button
                size="sm"
                className="touch-target"
                onClick={() => handleFeedbackSubmit(String(job.id))}
                disabled={feedbackSubmitted[String(job.id)] || !feedback[String(job.id)]}
                              >
                  {feedbackSubmitted[String(job.id)] ? 'Submitted' : 'Submit Feedback'}
                </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );