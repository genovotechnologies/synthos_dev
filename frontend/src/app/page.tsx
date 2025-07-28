'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ThreeBackgroundSafe from '@/components/ui/ThreeBackgroundSafe';
import DataVisualization3D from '@/components/ui/DataVisualization3D';
import Floating3DElements from '@/components/ui/Floating3DElements';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { SUBSCRIPTION_TIERS, AI_MODELS, FEATURES } from '@/lib/constants';
import { apiClient } from '@/lib/api';
import { ArrowRight, Check, Zap, Shield, BarChart3, Database, Globe, Star, TrendingUp, Cpu, Lock, Zap as ZapIcon, Target, Code, Building2, Activity, DollarSign, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Data visualization component that fetches real data
function DataVisualizationWithData() {
  const [visualizationData, setVisualizationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchVisualizationData = async () => {
      if (!isAuthenticated) {
        // Demo data for unauthenticated users
        setVisualizationData([
          { value: 0.8, label: 'Demo Dataset A', category: 'Datasets', timestamp: '2024-01-01' },
          { value: 0.6, label: 'Demo Dataset B', category: 'Datasets', timestamp: '2024-01-02' },
          { value: 0.9, label: 'Demo Generation 1', category: 'Generation', timestamp: '2024-01-03' },
          { value: 0.7, label: 'Demo Generation 2', category: 'Generation', timestamp: '2024-01-04' },
        ]);
        setLoading(false);
        setError(null);
        return;
      }
      try {
        const datasets = await apiClient.getDatasets();
        const generationJobs = await apiClient.getGenerationJobs();
        const combinedData = [
          ...datasets.map((dataset: any, i: number) => ({
            value: Math.min(dataset.row_count / 10000, 1),
            label: dataset.name || `Dataset ${i + 1}`,
            category: 'Datasets',
            timestamp: dataset.created_at
          })),
          ...generationJobs.map((job: any, i: number) => ({
            value: (job.progress_percentage || 0) / 100,
            label: `Generation Job ${i + 1}`,
            category: 'Generation',
            timestamp: job.created_at
          }))
        ];
        setVisualizationData(combinedData);
        setError(null);
      } catch (error) {
        setError('Failed to fetch visualization data');
        setVisualizationData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVisualizationData();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="h-96 bg-gradient-to-br from-primary/20 to-blue-600/20 flex items-center justify-center rounded-2xl">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading data visualization...</p>
        </div>
      </div>
    );
  }
  if (error || visualizationData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center rounded-2xl bg-muted">
        <div className="text-center space-y-4">
          <BarChart3 className="h-16 w-16 mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">No data available for visualization.</p>
        </div>
      </div>
    );
  }
  return (
    <DataVisualization3D
      data={visualizationData}
      height="400px"
      quality="medium"
      interactive={true}
      className="rounded-2xl"
    />
  );
}

// Custom icon component for features
function FeatureIcon({ icon, color }: { icon: string; color: string }) {
  const iconMap: { [key: string]: React.ReactNode } = {
    '🤖': <Cpu className="h-6 w-6" />,
    '🔒': <Lock className="h-6 w-6" />,
    '⚡': <ZapIcon className="h-6 w-6" />,
    '📊': <BarChart3 className="h-6 w-6" />,
    '🔌': <Code className="h-6 w-6" />,
    '🏭': <Building2 className="h-6 w-6" />,
    '📈': <TrendingUp className="h-6 w-6" />,
    '💰': <DollarSign className="h-6 w-6" />,
  };

  // Special non-circular icon designs
  const specialIconMap: { [key: string]: React.ReactNode } = {
    '🤖': (
      <div className="relative">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
          <Cpu className="h-5 w-5 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-sm"></div>
      </div>
    ),
    '🔒': (
      <div className="relative">
        <div className="w-8 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-t-lg flex items-center justify-center">
          <Lock className="h-4 w-4 text-white" />
        </div>
        <div className="w-6 h-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-b-lg mx-auto"></div>
      </div>
    ),
    '⚡': (
      <div className="relative">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 transform rotate-45 flex items-center justify-center">
          <ZapIcon className="h-5 w-5 text-white transform -rotate-45" />
        </div>
      </div>
    ),
    '📊': (
      <div className="relative">
        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-500 rounded-full"></div>
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
      </div>
    ),
    '🔌': (
      <div className="relative">
        <div className="w-8 h-6 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center">
          <Code className="h-4 w-4 text-white" />
        </div>
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-indigo-500 rounded-full"></div>
      </div>
    ),
    '🏭': (
      <div className="relative">
        <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-teal-500 rounded-full"></div>
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-teal-500 rounded-full"></div>
      </div>
    ),
    '📈': (
      <div className="relative">
        <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div className="absolute -top-1 -left-1 w-2 h-2 bg-green-500 rounded-full"></div>
        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
      </div>
    ),
    '💰': (
      <div className="relative">
        <div className="w-8 h-8 bg-gradient-to-br from-lime-500 to-green-500 rounded-lg flex items-center justify-center">
          <DollarSign className="h-5 w-5 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-sm transform rotate-12"></div>
      </div>
    ),
  };

  return (
    <div className={`w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-all duration-300`}>
      {specialIconMap[icon] || (
        <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-all duration-300`}>
          {iconMap[icon] || <span className="text-2xl">{icon}</span>}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const testimonialsData = await apiClient.getTestimonials();
        setTestimonials(testimonialsData);
        setError(null);
      } catch (err) {
        setError('Failed to load landing page data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col min-h-screen relative overflow-x-hidden">
      {/* Background */}
      <ErrorBoundary fallback={() => <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-primary/5" />}>
        <ThreeBackgroundSafe quality="high" interactive={true} particleCount={10000} />
      </ErrorBoundary>

      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
          
          {/* Content */}
          <div className="relative z-20 text-center px-4 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              {/* Main Heading */}
              <div className="space-y-6">
                <motion.h1 
                  className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text text-transparent leading-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  Generate Synthetic Data
                  <br />
                  <span className="text-4xl md:text-6xl">with AI</span>
                </motion.h1>
                
                <motion.p 
                  className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  Create high-quality, privacy-safe synthetic datasets for testing, 
                  development, and AI training with our advanced platform.
                </motion.p>
              </div>

              {/* CTA Buttons */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Get Started Free
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-6 border-2 hover:bg-background/50 transition-all duration-300"
                >
                  Schedule Demo
                </Button>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div 
                className="flex flex-wrap justify-center items-center gap-8 text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <span>GDPR compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span>Setup in minutes</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section - Why Choose Synthos */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Why Choose <span className="text-gradient">Synthos</span>?
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                Built for data scientists, by data scientists. Experience the next generation of synthetic data generation.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group"
                >
                  <Card className="h-full text-center hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 bg-gradient-to-br from-background/50 to-background/30 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <div className="flex justify-center mb-4">
                        <FeatureIcon icon={feature.icon} color={feature.color} />
                      </div>
                      <CardTitle className="text-lg sm:text-xl font-bold">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <CardDescription className="text-sm sm:text-base leading-relaxed">
                        {feature.description}
                      </CardDescription>
                      
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 pt-4">
                        {Object.entries(feature.stats).map(([key, value], statIndex) => (
                          <motion.div 
                            key={key}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 + statIndex * 0.05 }}
                            className="text-center p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg"
                          >
                            <div className="text-xs text-muted-foreground capitalize">{key}</div>
                            <div className="text-sm font-semibold text-primary">{value}</div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Models Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Powered by <span className="text-gradient">Advanced AI</span>
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                Choose from the world's most advanced AI models for synthetic data generation.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {AI_MODELS.slice(0, 6).map((model, index) => (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-lg">{model.name}</CardTitle>
                        <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {model.provider}
                        </div>
                      </div>
                      <CardDescription>{model.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Quality:</span>
                          <div className="flex">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < Math.floor(model.accuracy * 5) 
                                    ? 'text-yellow-500 fill-current' 
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Speed:</span>
                          <span className="font-medium">{model.speed}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Choose Your <span className="text-gradient">Plan</span>
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                Start free and scale as you grow. No hidden fees, cancel anytime.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 lg:gap-8 max-w-7xl mx-auto">
              {SUBSCRIPTION_TIERS.map((tier, index) => (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className={`relative ${tier.popular ? 'md:col-span-2 lg:col-span-1 xl:col-span-1' : ''}`}
                >
                  <Card className={`h-full relative group transition-all duration-500 w-full ${
                    tier.popular 
                      ? 'border-primary/50 bg-gradient-to-br from-background/80 via-background/60 to-primary/5 backdrop-blur-md border-2 shadow-xl' 
                      : 'bg-gradient-to-br from-background/40 via-background/20 to-background/10 backdrop-blur-md border border-border/30 hover:border-primary/30 hover:shadow-2xl hover:z-20'
                  }`}>
                    {tier.popular && (
                      <motion.div 
                        className="absolute -top-5 left-1/2 -translate-x-1/2 z-30 flex justify-center"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 + index * 0.2, type: "spring" }}
                        viewport={{ once: true }}
                      >
                        <div className="bg-gradient-to-r from-primary to-purple-600 text-white px-5 py-1.5 rounded-full text-base font-semibold shadow-lg backdrop-blur-sm border-2 border-white/80 dark:border-background/80">
                          Most Popular
                        </div>
                      </motion.div>
                    )}
                    
                    <CardHeader className="relative">
                      {/* Glassmorphism accent */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-t-lg" />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="relative z-10"
                        viewport={{ once: true }}
                      >
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                          {tier.name}
                        </CardTitle>
                      </motion.div>
                      
                      <motion.div 
                        className="mt-4 relative z-10"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + index * 0.1, type: "spring" }}
                        viewport={{ once: true }}
                      >
                        <span className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                          {tier.price === null ? 'Contact Sales' : tier.price === 0 ? 'Free' : `$${tier.price}`}
                        </span>
                        {tier.price !== null && tier.price > 0 && (
                          <span className="text-muted-foreground ml-1">/month</span>
                        )}
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="relative z-10"
                        viewport={{ once: true }}
                      >
                        <CardDescription className="mt-2 text-muted-foreground/80">
                          {tier.monthly_limit === -1 ? 'Unlimited' : tier.monthly_limit.toLocaleString()} synthetic records per month
                        </CardDescription>
                      </motion.div>
                    </CardHeader>
                    <CardContent className="space-y-6 relative">
                      {/* Glassmorphism content background */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/2 to-white/5 rounded-b-lg" />
                      
                      <motion.ul
                        className="space-y-3 relative z-10"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        viewport={{ once: true }}
                      >
                        {tier.features.slice(0, 5).map((feature, featureIndex) => (
                          <motion.li 
                            key={featureIndex} 
                            className="flex items-start group"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ 
                              delay: 0.7 + index * 0.1 + featureIndex * 0.05,
                              type: "spring",
                              stiffness: 100
                            }}
                            whileHover={{ x: 5 }}
                            viewport={{ once: true }}
                          >
                            <Check className="h-4 w-4 text-green-500 mr-3 mt-0.5 flex-shrink-0 transition-transform group-hover:scale-110" />
                            <span className="text-sm text-foreground/90 group-hover:text-foreground transition-colors">
                              {feature}
                            </span>
                          </motion.li>
                        ))}
                      </motion.ul>
                      
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + index * 0.1, type: "spring" }}
                        className="relative z-10"
                        viewport={{ once: true }}
                      >
                        <Button 
                          className={`w-full touch-target relative overflow-hidden group transition-all duration-300 ${
                            tier.popular 
                              ? 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg hover:shadow-xl' 
                              : 'bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-sm border-border/50 hover:border-primary/50 hover:bg-gradient-to-r hover:from-primary/10 hover:to-purple-600/10'
                          }`}
                          variant={tier.popular ? 'default' : 'outline'}
                          asChild
                        >
                          <Link href={tier.price === 0 ? '/auth/signup' : '/pricing'} className="relative z-10">
                            <span className="relative z-10">
                              {tier.price === 0 ? 'Get Started Free' : 'Choose Plan'}
                            </span>
                            {/* Hover effect overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                          </Link>
                        </Button>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Trusted by <span className="text-gradient">Data Scientists</span>
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                See what our customers say about Synthos.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Example testimonials, replace or map from data as needed */}
              <div className="bg-white dark:bg-background rounded-2xl shadow-lg p-8 flex flex-col justify-between">
                <blockquote className="text-lg mb-6">"Synthos has revolutionized our data pipeline. The quality is exceptional."</blockquote>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm mr-3">CB</div>
                  <div>
                    <div className="font-semibold">CHIBOY</div>
                    <div className="text-sm text-muted-foreground">Data Scientist</div>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-background rounded-2xl shadow-lg p-8 flex flex-col justify-between">
                <blockquote className="text-lg mb-6">"The privacy features give us confidence to work with sensitive datasets."</blockquote>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-sm mr-3">GS</div>
                  <div>
                    <div className="font-semibold">Gasper Samuel</div>
                    <div className="text-sm text-muted-foreground">ML Engineer</div>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-background rounded-2xl shadow-lg p-8 flex flex-col justify-between">
                <blockquote className="text-lg mb-6">"The API integration is seamless and the documentation is excellent."</blockquote>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold text-sm mr-3">AS</div>
                  <div>
                    <div className="font-semibold">Alex Smith</div>
                    <div className="text-sm text-muted-foreground">Software Engineer</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 via-primary/5 to-blue-600/10">
          <div className="container mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Ready to Transform Your <span className="text-gradient">Data Strategy</span>?
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8">
                Join thousands of data scientists and engineers who trust Synthos for their synthetic data needs.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  asChild 
                  className="glow-primary hover:glow-primary transition-all duration-300 transform hover:scale-105 touch-target text-base sm:text-lg px-8 py-4"
                >
                  <Link href="/auth/signup" className="flex items-center">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  asChild 
                  className="glass hover:glass-strong transition-all duration-300 transform hover:scale-105 touch-target text-base sm:text-lg px-8 py-4"
                >
                  <Link href="/contact" className="flex items-center">
                    <Zap className="mr-2 h-5 w-5" />
                    Schedule Demo
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <span className="font-bold text-xl">Synthos</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The world's most advanced synthetic data platform.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-foreground transition-colors touch-target">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors touch-target">Pricing</Link></li>
                <li><Link href="/api" className="hover:text-foreground transition-colors touch-target">API</Link></li>
                <li><Link href="/datasets" className="hover:text-foreground transition-colors touch-target">Datasets</Link></li>
                <li><Link href="/custom-models" className="hover:text-foreground transition-colors touch-target">Custom Models</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors touch-target">About</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors touch-target">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors touch-target">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors touch-target">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/documentation" className="hover:text-foreground transition-colors touch-target">Documentation</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors touch-target">Help Center</Link></li>
                <li><Link href="/billing" className="hover:text-foreground transition-colors touch-target">Billing</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors touch-target">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border/40 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Synthos. All rights reserved.
            </p>
            <div className="flex items-center space-x-4">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors touch-target">Terms</Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors touch-target">Privacy</Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors touch-target">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
