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
import { ArrowRight, Check, Zap, Shield, BarChart3, Database, Globe, Star } from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: <Database className="h-6 w-6" />,
      title: "Smart Data Generation",
      description: "Generate high-quality synthetic data that maintains statistical properties"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Privacy-First",
      description: "Built-in privacy protection with GDPR compliance and differential privacy"
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Quality Analytics",
      description: "Comprehensive quality metrics and statistical validation for your data"
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "API-First Design",
      description: "Robust REST API with SDKs for Python, JavaScript, and R"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Data Scientist at TechCorp",
      content: "Synthos has revolutionized our data pipeline. The quality is exceptional.",
      avatar: "SC"
    },
    {
      name: "Michael Rodriguez",
      role: "ML Engineer at DataFlow",
      content: "The privacy features give us confidence to work with sensitive datasets.",
      avatar: "MR"
    },
    {
      name: "Emma Thompson",
      role: "CTO at StartupXYZ",
      content: "Easy integration and fantastic API. Our development time dropped by 60%.",
      avatar: "ET"
    }
  ];

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
                    <DataVisualization3D
                      height="400px"
                      quality="medium"
                      interactive={true}
                      className="rounded-2xl"
                    />
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
                                  i < Math.floor(model.quality_score * 5) 
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
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className={tier.popular ? 'relative' : ''}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </div>
                    </div>
                  )}
                  <Card className={`h-full relative ${tier.popular ? 'border-primary shadow-lg glow-primary' : ''}`}>
                    <CardHeader className="text-center pb-6">
                      <CardTitle className="text-2xl">{tier.name}</CardTitle>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">
                          {tier.price === 0 ? 'Free' : `$${tier.price}`}
                        </span>
                        {tier.price > 0 && (
                          <span className="text-muted-foreground">/month</span>
                        )}
                      </div>
                      <CardDescription className="mt-2">
                        {tier.monthly_limit.toLocaleString()} synthetic records per month
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <ul className="space-y-3">
                        {tier.features.slice(0, 5).map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start">
                            <Check className="h-4 w-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button 
                        className={`w-full touch-target ${tier.popular ? 'glow-primary' : ''}`}
                        variant={tier.popular ? 'default' : 'outline'}
                        asChild
                      >
                        <Link href={tier.price === 0 ? '/auth/signup' : '/pricing'}>
                          {tier.price === 0 ? 'Get Started Free' : 'Choose Plan'}
                        </Link>
                      </Button>
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
