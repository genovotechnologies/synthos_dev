'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ThreeBackgroundSafe from '@/components/ui/ThreeBackgroundSafe';
import DataVisualization3D from '@/components/ui/DataVisualization3D';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { SUBSCRIPTION_TIERS, AI_MODELS } from '@/lib/constants';
import { apiClient } from '@/lib/api';
import { ArrowRight, Check, Zap, Shield, BarChart3, Database, Globe, Star } from 'lucide-react';

// Data visualization component that fetches real data
function DataVisualizationWithData() {
  const [visualizationData, setVisualizationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVisualizationData = async () => {
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
  }, []);

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

export default function LandingPage() {
  const [features, setFeatures] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [featuresData, testimonialsData] = await Promise.all([
          apiClient.getFeatures(),
          apiClient.getTestimonials()
        ]);
        setFeatures(featuresData);
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
        <ThreeBackgroundSafe quality="medium" interactive={false} />
      </ErrorBoundary>

      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center py-20 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Hero Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center lg:text-left space-y-6 lg:space-y-8"
              >
                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                    The Future of
                    <span className="block text-gradient glow-white">
                      Synthetic Data
                    </span>
                  </h1>
                  <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                    Generate high-quality synthetic data with AI-powered privacy protection.
                    Perfect for ML training, testing, and analytics.
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
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
                      Request Demo
                    </Link>
                  </Button>
                </div>

                {/* Trust Indicators */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-1 text-green-500" />
                    SOC 2 Compliant
                  </div>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 mr-1 text-yellow-500" />
                    GDPR Ready
                  </div>
                  <div className="flex items-center">
                    <Database className="h-4 w-4 mr-1 text-blue-500" />
                    99.9% Uptime
                  </div>
                </div>
              </motion.div>

              {/* Hero Visualization */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                <div className="relative rounded-2xl overflow-hidden glass-strong">
                  <ErrorBoundary 
                    fallback={() => (
                      <div className="h-96 bg-gradient-to-br from-primary/20 to-blue-600/20 flex items-center justify-center">
                        <div className="text-center space-y-4">
                          <BarChart3 className="h-16 w-16 mx-auto text-primary" />
                          <p className="text-sm text-muted-foreground">Interactive Data Visualization</p>
                        </div>
                      </div>
                    )}
                  >
                    <DataVisualizationWithData />
                  </ErrorBoundary>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full text-center hover:glow-primary transition-all duration-300 cursor-pointer group">
                    <CardHeader className="pb-4">
                      <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <div className="text-primary">
                          {feature.icon}
                        </div>
                      </div>
                      <CardTitle className="text-lg sm:text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm sm:text-base">
                        {feature.description}
                      </CardDescription>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
              {SUBSCRIPTION_TIERS.slice(0, 3).map((tier, index) => (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 50, scale: 0.8 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ 
                    y: -10, 
                    scale: 1.02,
                    transition: { type: "spring", stiffness: 300, damping: 20 }
                  }}
                  transition={{ 
                    duration: 0.6, 
                    delay: index * 0.2,
                    type: "spring",
                    stiffness: 100,
                    damping: 15
                  }}
                  viewport={{ once: true }}
                  className={tier.popular ? 'relative z-10' : 'relative'}
                >
                  {tier.popular && (
                    <motion.div 
                      className="absolute -top-4 left-1/2 transform -translate-x-1/2"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + index * 0.2, type: "spring" }}
                    >
                      <div className="bg-gradient-to-r from-primary to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm">
                        Most Popular
                      </div>
                    </motion.div>
                  )}
                  <Card className={`h-full relative overflow-hidden group transition-all duration-500 ${
                    tier.popular 
                      ? 'border-primary/50 shadow-2xl bg-gradient-to-br from-background/80 via-background/60 to-primary/5 backdrop-blur-md border-2' 
                      : 'bg-gradient-to-br from-background/40 via-background/20 to-background/10 backdrop-blur-md border border-border/30 hover:border-primary/30'
                  }`}>
                    <CardHeader className="text-center pb-6 relative">
                      {/* Glassmorphism accent */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-t-lg" />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="relative z-10"
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
                Trusted by <span className="text-gradient">Data Teams</span>
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                See what our customers say about their experience with Synthos.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full">
                    <CardContent className="pt-6">
                      <blockquote className="text-lg mb-6">"{testimonial.content}"</blockquote>
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm mr-3">
                          {testimonial.avatar}
                        </div>
                        <div>
                          <div className="font-semibold">{testimonial.name}</div>
                          <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary via-blue-600 to-purple-700">
          <div className="container mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Ready to Transform Your Data Workflow?
              </h2>
              <p className="text-lg sm:text-xl text-white/90 mb-8 leading-relaxed">
                Join thousands of developers and data scientists who trust Synthos
                for their synthetic data needs. Start your free trial today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  variant="secondary" 
                  asChild
                  className="touch-target text-base sm:text-lg px-8 py-4 hover:scale-105 transition-transform"
                >
                  <Link href="/auth/signup" className="flex items-center">
                    Start Building Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white/20 text-white hover:bg-white/10 touch-target text-base sm:text-lg px-8 py-4 hover:scale-105 transition-transform" 
                  asChild
                >
                  <Link href="/contact">
                    Talk to Sales
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
                <li><Link href="/features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="/api" className="hover:text-foreground transition-colors">API</Link></li>
                <li><Link href="/datasets" className="hover:text-foreground transition-colors">Datasets</Link></li>
                <li><Link href="/custom-models" className="hover:text-foreground transition-colors">Custom Models</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/documentation" className="hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Help Center</Link></li>
                <li><Link href="/billing" className="hover:text-foreground transition-colors">Billing</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border/40 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Synthos. All rights reserved.
            </p>
            <div className="flex items-center space-x-4">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
