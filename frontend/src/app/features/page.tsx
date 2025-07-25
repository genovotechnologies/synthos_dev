'use client';

import React, { useState, useEffect, type FC } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AI_MODELS } from '@/lib/constants';
import { apiClient } from '@/lib/api';
import Link from 'next/link';

const FeaturesPage: FC = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use static AI_MODELS constant for demo
    setModels(AI_MODELS);
    setLoading(false);
    setError(null);
  }, []);

  const mainFeatures = [
    {
      id: 'ai-models',
      title: 'Multi-Model AI Generation',
      description: 'Choose from the world\'s most advanced AI models including Claude 3, GPT-4, and custom models.',
      icon: '🤖',
      benefits: [
        'Access to Claude 3 Opus, Sonnet, and Haiku',
        'GPT-4 Turbo and GPT-3.5 Turbo integration',
        'Custom model fine-tuning capabilities',
        'Ensemble model combinations for maximum accuracy'
      ],
      stats: { accuracy: '98.7%', speed: '10x faster', models: '15+' }
    },
    {
      id: 'privacy',
      title: 'Privacy-First Architecture',
      description: 'Industry-leading differential privacy and compliance with GDPR, HIPAA, and SOC 2.',
      icon: '🔒',
      benefits: [
        'Differential privacy with configurable epsilon',
        'GDPR and HIPAA compliant data generation',
        'SOC 2 Type II certified infrastructure',
        'Zero-knowledge architecture'
      ],
      stats: { compliance: '100%', privacy: 'ε ≤ 0.1', certifications: '4' }
    },
    {
      id: 'quality',
      title: 'Unmatched Data Quality',
      description: 'Advanced quality assessment with 7-dimensional analysis ensuring statistical accuracy.',
      icon: '📊',
      benefits: [
        '7-dimensional quality scoring',
        'Statistical distribution preservation',
        'Correlation analysis and validation',
        'Real-time quality monitoring'
      ],
      stats: { accuracy: '99.2%', dimensions: '7', validation: 'Real-time' }
    },
    {
      id: 'scale',
      title: 'Enterprise-Grade Scale',
      description: 'Generate millions of rows in minutes with our optimized cloud infrastructure.',
      icon: '⚡',
      benefits: [
        'Horizontal auto-scaling',
        'Global CDN distribution',
        '99.99% uptime SLA',
        'Multi-region deployments'
      ],
      stats: { uptime: '99.99%', throughput: '1M+ rows/min', regions: '12' }
    },
    {
      id: 'integration',
      title: 'Seamless Integrations',
      description: 'RESTful APIs, SDKs, and pre-built integrations for your existing workflow.',
      icon: '🔌',
      benefits: [
        'RESTful API with OpenAPI specs',
        'Python, JavaScript, and R SDKs',
        'Database connectors (PostgreSQL, MongoDB)',
        'CI/CD pipeline integrations'
      ],
      stats: { apis: '100+', sdks: '3', connectors: '10+' }
    },
    {
      id: 'industries',
      title: 'Industry Specialization',
      description: 'Tailored solutions for healthcare, finance, manufacturing, and more.',
      icon: '🏭',
      benefits: [
        'Healthcare (FHIR, HL7 compliance)',
        'Financial services (PCI DSS)',
        'Manufacturing (IoT sensor data)',
        'E-commerce and retail analytics'
      ],
      stats: { industries: '12+', compliance: '100%', templates: '50+' }
    }
  ];

  const technicalFeatures = [
    {
      title: 'Real-time Generation',
      description: 'Generate synthetic data on-demand with sub-second response times',
      icon: '⚡'
    },
    {
      title: 'Batch Processing',
      description: 'Process large datasets efficiently with our distributed computing platform',
      icon: '📦'
    },
    {
      title: 'Custom Schemas',
      description: 'Define complex data relationships and maintain referential integrity',
      icon: '🏗️'
    },
    {
      title: 'Version Control',
      description: 'Track and manage different versions of your synthetic datasets',
      icon: '📚'
    },
    {
      title: 'A/B Testing',
      description: 'Compare different generation strategies and optimize for your use case',
      icon: '🧪'
    },
    {
      title: 'Monitoring & Alerts',
      description: 'Real-time monitoring with custom alerts and performance metrics',
      icon: '📈'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <main className="pt-32 pb-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-20"
            >
              {/* Floating Icons */}
              <div className="absolute inset-0 overflow-hidden">
                {['🤖', '🔒', '📊', '⚡', '🔌', '🏭'].map((icon, index) => (
                  <motion.div
                    key={index}
                    className="absolute text-4xl opacity-10"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [0, -20, 0],
                      rotate: [0, 360],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 10 + index * 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {icon}
                  </motion.div>
                ))}
              </div>
              
              <div className="relative z-10">
                <motion.div
                  className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6"
                  whileHover={{ scale: 1.05 }}
                >
                  <span className="text-primary font-medium">🚀 Advanced Features</span>
                </motion.div>
                
                <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text text-transparent">
                  Powerful Features
                  <br />
                  <span className="block">Built for Scale</span>
                </h1>
                
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                  Discover the comprehensive suite of features that make Synthos the most advanced 
                  synthetic data platform for enterprises.
                </p>
                
                <motion.div
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                  whileHover={{ scale: 1.02 }}
                >
                  <Button asChild size="lg" className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 touch-target">
                    <Link href="/auth/signup">Try All Features Free</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="touch-target">
                    <Link href="/contact">Schedule Demo</Link>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Main Features Grid */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {mainFeatures.map((feature, index) => (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  onHoverStart={() => setActiveFeature(index)}
                  className="group"
                >
                  <motion.div
                    whileHover={{ 
                      y: -10,
                      rotateY: 5,
                      scale: 1.02 
                    }}
                    transition={{ duration: 0.3 }}
                    style={{ perspective: '1000px' }}
                  >
                    <Card className="h-full relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300">
                      {/* Glow Effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-primary/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        animate={{
                          background: activeFeature === index 
                            ? "linear-gradient(135deg, rgba(var(--primary), 0.1), rgba(59, 130, 246, 0.1))"
                            : "linear-gradient(135deg, transparent, transparent)"
                        }}
                        viewport={{ once: true }}
                      />
                      
                      <CardHeader className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <motion.div
                            className="text-5xl"
                            whileHover={{ 
                              scale: 1.2,
                              rotate: 360 
                            }}
                            transition={{ duration: 0.6 }}
                            viewport={{ once: true }}
                          >
                            {feature.icon}
                          </motion.div>
                          
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Key Metric</div>
                            <div className="text-lg font-bold text-primary">
                              {Object.values(feature.stats)[0]}
                            </div>
                          </div>
                        </div>
                        
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {feature.title}
                        </CardTitle>
                        <CardDescription className="text-base">
                          {feature.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="relative z-10">
                        <ul className="space-y-2 mb-6">
                          {feature.benefits.map((benefit, benefitIndex) => (
                            <motion.li
                              key={benefitIndex}
                              initial={{ opacity: 0, x: -10 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 + benefitIndex * 0.05 }}
                              className="flex items-center gap-2 text-sm"
                              viewport={{ once: true }}
                            >
                              <div className="w-2 h-2 bg-primary rounded-full" />
                              {benefit}
                            </motion.li>
                          ))}
                        </ul>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          {Object.entries(feature.stats).map(([key, value], statIndex) => (
                            <div key={key} className="p-2 bg-muted/50 rounded-lg">
                              <div className="text-xs text-muted-foreground capitalize">{key}</div>
                              <div className="text-sm font-semibold">{value}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Models Showcase */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                AI Models at Your Fingertips
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Choose from the world's most advanced AI models, each optimized for different use cases and requirements.
              </p>
            </motion.div>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <span className="ml-4 text-muted-foreground">Loading models...</span>
              </div>
            ) : error ? (
              <div className="text-center text-red-600">{error}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {models.slice(0, 6).map((model, index) => (
                  <motion.div
                    key={model.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -5, scale: 1.02 }}
                  >
                    <Card className="h-full hover:shadow-xl transition-all duration-300">
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <CardTitle className="text-lg">{model.name}</CardTitle>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {model.provider}
                          </span>
                        </div>
                        <CardDescription>{model.description || ''}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Accuracy</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                                  initial={{ width: 0 }}
                                  whileInView={{ width: `${(model.accuracy * 100 || 0)}%` }}
                                  transition={{ duration: 1, delay: index * 0.1 }}
                                />
                              </div>
                              <span className="font-medium">{(model.accuracy * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Context</span>
                            <span className="font-medium">{model.max_context || model.context_length}</span>
                          </div>
                          <div className="pt-2 border-t border-border">
                            <p className="text-xs text-muted-foreground">
                              <strong>Best for:</strong> {model.best_for || ''}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Technical Features */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Technical Excellence
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Built on cutting-edge technology with enterprise-grade reliability and performance.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {technicalFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Card className="h-full text-center hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-card/50">
                    <CardHeader>
                      <motion.div
                        className="text-4xl mb-3"
                        whileHover={{ scale: 1.2, rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        {feature.icon}
                      </motion.div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-primary/10 to-blue-500/10">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Experience These Features?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Start your free trial today and see why thousands of companies trust Synthos 
                for their synthetic data needs.
              </p>
              
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center"
                whileHover={{ scale: 1.02 }}
              >
                <Button asChild size="lg" className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 touch-target">
                  <Link href="/auth/signup">Start Free Trial</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="touch-target">
                  <Link href="/documentation">View Documentation</Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default FeaturesPage; 