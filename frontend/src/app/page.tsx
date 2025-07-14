'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ThreeBackgroundSafe from '@/components/ui/ThreeBackgroundSafe';
import DataVisualization3D from '@/components/ui/DataVisualization3D';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { SUBSCRIPTION_TIERS, AI_MODELS } from '@/lib/constants';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Safe 3D Background with Error Boundary */}
      <ThreeBackgroundSafe interactive={true} quality="high" />
      
      <Header />
      
      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 glass-hero rounded-3xl m-8"></div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="px-3 py-1 bg-primary/30 text-primary rounded-full text-sm font-medium backdrop-blur-md border border-primary/20 glow-blue">
                  🚀 AI-Powered
                </span>
                <span className="px-3 py-1 bg-green-500/30 text-green-400 rounded-full text-sm font-medium backdrop-blur-md border border-green-500/20 glow-green">
                  ✨ Enterprise Ready
                </span>
                <span className="px-3 py-1 bg-blue-500/30 text-blue-400 rounded-full text-sm font-medium backdrop-blur-md border border-blue-500/20 glow-blue">
                  🔒 Privacy First
                </span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-high-contrast text-3d">
                The Ultimate AI-Powered
                <br />
                <span className="bg-gradient-to-r from-primary to-blue-400 dark:from-primary dark:to-white bg-clip-text text-transparent glow-white">
                  Synthetic Data
                </span> Platform
              </h1>
              
              <div className="max-w-2xl mx-auto mb-10">
                <p className="text-lg text-high-contrast text-readable">
                  Generate high-quality, privacy-compliant synthetic data in minutes.
                  Accelerate your development, testing, and machine learning workflows with
                  industry-leading AI models.
                </p>
              </div>
              
              <div className="flex justify-center gap-4 mb-12">
                <Button size="lg" asChild className="glow-blue hover:glow-blue transition-all duration-300 transform hover:scale-105">
                  <Link href="/auth/signup">
                    Get Started Free
                    <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="backdrop-blur-md bg-white/10 border-white/20 text-high-contrast hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
                  <Link href="/contact">
                    Request Demo
                  </Link>
                </Button>
              </div>

              <div className="flex items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2 text-readable">
                  <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-high-contrast">No credit card required</span>
                </div>
                <div className="flex items-center gap-2 text-readable">
                  <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-high-contrast">10,000 rows free</span>
                </div>
                <div className="flex items-center gap-2 text-readable">
                  <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-high-contrast">Enterprise support</span>
                </div>
              </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
        <section className="py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-black/60"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-high-contrast text-3d">
                Why Choose Synthos?
              </h2>
              <div className="max-w-2xl mx-auto">
                <p className="text-lg text-high-contrast text-readable">
                  Enterprise-grade synthetic data platform with cutting-edge AI models
                </p>
              </div>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                  icon: "🤖",
                  title: "Multi-Model AI",
                  description: "Choose from Claude 3, GPT-4, and custom models for optimal results"
                },
                {
                  icon: "🔒",
                  title: "Privacy First",
                  description: "Differential privacy, GDPR & HIPAA compliant data generation"
                },
                {
                  icon: "⚡",
                  title: "Lightning Fast",
                  description: "Generate millions of rows in minutes with our optimized pipeline"
                },
                {
                  icon: "🎯",
                  title: "Industry Specific",
                  description: "Healthcare, finance, manufacturing - tailored for your domain"
                },
                {
                  icon: "📊",
                  title: "High Quality",
                  description: "98%+ statistical accuracy with 7-dimensional quality assessment"
                },
                {
                  icon: "🔌",
                  title: "API First",
                  description: "RESTful API, SDKs, and integrations for seamless workflows"
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="transform hover:scale-105 transition-all duration-300"
                >
                  <Card className="h-full glass-card hover:bg-white/15 dark:hover:bg-black/40 transition-all duration-300 group">
                    <CardHeader>
                      <div className="text-4xl mb-2 transform group-hover:scale-110 transition-transform duration-300">
                        {feature.icon}
                      </div>
                      <CardTitle className="text-xl text-high-contrast">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base text-high-contrast">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 3D Data Visualization Section */}
        <section className="py-20 bg-gradient-to-br from-purple-900/30 to-blue-900/30 relative">
          <div className="absolute inset-0 glass-hero rounded-3xl m-8"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-high-contrast text-3d">
                Interactive Analytics Dashboard
              </h2>
              <div className="max-w-2xl mx-auto">
                <p className="text-lg text-high-contrast text-readable">
                  Visualize your synthetic data generation progress with our immersive 3D analytics platform
                </p>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="max-w-6xl mx-auto transform hover:scale-[1.02] transition-transform duration-500"
            >
              <ErrorBoundary>
                <div className="glow-blue rounded-lg">
                  <DataVisualization3D
                    className="shadow-2xl border border-white/20 backdrop-blur-md bg-white/5 rounded-lg"
                    title="Real-time Generation Metrics"
                  />
                </div>
              </ErrorBoundary>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
              <motion.div 
                className="text-center text-readable transform hover:scale-110 transition-all duration-300"
                whileHover={{ y: -5 }}
              >
                <div className="text-3xl font-bold text-primary mb-2 text-3d glow-blue">98.7%</div>
                <p className="text-high-contrast">Data Quality Score</p>
              </motion.div>
              <motion.div 
                className="text-center text-readable transform hover:scale-110 transition-all duration-300"
                whileHover={{ y: -5 }}
              >
                <div className="text-3xl font-bold text-green-400 mb-2 text-3d glow-green">2.3M</div>
                <p className="text-high-contrast">Rows Generated Today</p>
              </motion.div>
              <motion.div 
                className="text-center text-readable transform hover:scale-110 transition-all duration-300"
                whileHover={{ y: -5 }}
              >
                <div className="text-3xl font-bold text-blue-400 mb-2 text-3d glow-blue">45ms</div>
                <p className="text-high-contrast">Avg Processing Time</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* AI Models Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                Powered by Leading AI Models
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Choose from the world's most advanced AI models for your data generation needs
              </p>
                </div>
                
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {AI_MODELS.map((model, index) => (
                <motion.div
                  key={model.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full glass-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{model.name}</CardTitle>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {model.provider}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Speed</span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  i < Math.round(model.accuracy * 5) ? 'bg-green-500' : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Quality</span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  i < Math.round(model.accuracy * 5) ? 'bg-blue-500' : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
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
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                Simple, Transparent Pricing
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Start free and scale as you grow. No hidden fees, no vendor lock-in.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {SUBSCRIPTION_TIERS.slice(0, 4).map((tier, index) => (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className={`h-full ${tier.popular ? 'border-primary shadow-lg' : ''}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl">{tier.name}</CardTitle>
                        {tier.popular && (
                          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm">
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">${tier.price}</span>
                        <span className="text-muted-foreground">/{tier.interval}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 mb-6">
                        {tier.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start gap-2">
                            <svg className="h-5 w-5 text-green-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button 
                        className="w-full" 
                        variant={tier.popular ? "default" : "outline"}
                        asChild
                      >
                        <a href="/auth/register">
                          {tier.price === 0 ? 'Get Started Free' : 'Start'}
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary to-blue-600">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to Transform Your Data Workflow?
              </h2>
              <p className="text-lg text-white/90 max-w-2xl mx-auto mb-8">
                Join thousands of developers and data scientists who trust Synthos
                for their synthetic data needs.
              </p>
              <div className="flex justify-center gap-4">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/auth/signup">
                    Start Building Now
                    <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/20 text-blue hover:bg-white/10" asChild>
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
      <footer className="bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
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
                <li><Link href="/features" className="hover:text-foreground">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="/api" className="hover:text-foreground">API</Link></li>
                <li><Link href="/datasets" className="hover:text-foreground">Datasets</Link></li>
                <li><Link href="/custom-models" className="hover:text-foreground">Custom Models</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/documentation" className="hover:text-foreground">Documentation</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Help Center</Link></li>
                <li><Link href="/billing" className="hover:text-foreground">Billing</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border/40 mt-8 pt-8 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              © 2025 Synthos. All rights reserved.
            </p>
            <div className="flex items-center space-x-4">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
