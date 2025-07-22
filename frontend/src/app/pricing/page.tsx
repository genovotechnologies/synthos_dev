'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { SUBSCRIPTION_TIERS } from '@/lib/constants';

interface PaymentPlan {
  id: string;
  name: string;
  price: number | null;
  monthly_limit: number;
  features: string[];
  stripe_price_id?: string | null;
  paddle_product_id?: string;
  most_popular?: boolean;
  enterprise?: boolean;
}

interface PaymentProvider {
  id: string;
  name: string;
  available: boolean;
  description: string;
  supported_countries: string[];
  payment_methods: string[];
  features?: string[];
}

const PricingPage = () => {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('paddle');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchPricingPlans();
  }, []);

  const fetchPricingPlans = async () => {
    try {
      const response = await apiClient.getPricingPlans();
      setPlans(response.plans || []);
      setPaymentProviders(response.payment_providers || []);
      // Set default provider to the first available one
      const availableProvider = response.payment_providers?.find((p: PaymentProvider) => p.available);
      if (availableProvider) {
        setSelectedProvider(availableProvider.id);
      }
    } catch (err) {
      console.error('Error fetching pricing plans:', err);
      setError('Failed to load pricing plans. Please try again later.');
      setPlans([]);
      setPaymentProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      const selectedProviderData = paymentProviders.find(p => p.id === selectedProvider);
      if (!selectedProviderData?.available) {
        setError(`${selectedProviderData?.name || 'Selected payment provider'} is not currently available`);
        return;
      }
      
      // Use the correct API client method
      const data = await apiClient.createCheckoutSession(planId, selectedProvider);

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Error creating checkout session:', err);
      // For development, show a user-friendly message
      if (err.message?.includes('404') || err.message?.includes('Network Error')) {
        setError('Payment system is currently unavailable. Please try again later or contact support.');
      } else {
      setError(err.message || 'Failed to initiate upgrade');
      }
    }
  };

  // Enhanced pricing tiers with annual discounts
  const enhancedTiers = plans.map(tier => ({
    ...tier,
    annualPrice: tier.price ? Math.floor(tier.price * 12 * 0.95) : null,
    savings: tier.price ? Math.floor(tier.price * 12 * 0.05) : 0,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center text-red-600 text-xl">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700 text-center">
              {error}
            </div>
          )}
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Choose Your Perfect Plan
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              From startups to enterprises, we have the perfect plan to accelerate your data generation workflows.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Monthly
              </span>
              <motion.button
                className="relative w-16 h-8 bg-muted rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => setBilling(billing === 'monthly' ? 'annual' : 'monthly')}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="w-6 h-6 bg-primary rounded-full shadow-lg"
                  animate={{
                    x: billing === 'annual' ? 32 : 0
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </motion.button>
              <span className={`text-sm font-medium ${billing === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Annual
              </span>
              <span className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-sm font-medium">
                Save 5%
              </span>
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {enhancedTiers.map((tier, index) => {
              const isPopular = tier.most_popular;
              const currentPrice = billing === 'annual' && tier.annualPrice ? tier.annualPrice : tier.price;
              
              return (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 50, rotateX: -15 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={`relative ${isPopular ? 'lg:scale-105 z-10' : ''}`}
                  onHoverStart={() => setHoveredCard(tier.id)}
                  onHoverEnd={() => setHoveredCard(null)}
                  style={{ perspective: '1000px' }}
                >
                  <motion.div
                    className="relative h-full transform-gpu"
                    animate={{
                      rotateY: hoveredCard === tier.id ? 5 : 0,
                      scale: hoveredCard === tier.id ? 1.02 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Glow Effect */}
                    {(isPopular || hoveredCard === tier.id) && (
                      <motion.div
                        className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-xl opacity-20 blur-lg"
                        animate={{
                          opacity: hoveredCard === tier.id ? 0.4 : 0.2,
                        }}
                      />
                    )}
                    
                    <Card className={`h-full relative overflow-hidden ${
                      isPopular 
                        ? 'border-primary shadow-xl shadow-primary/20' 
                        : 'border-border hover:border-primary/50'
                    } transition-all duration-300`}>
                      {/* Popular Badge */}
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                          <div className="bg-gradient-to-r from-primary to-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                            Most Popular
                          </div>
                        </div>
                      )}

                      <CardHeader className="text-center relative z-10">
                        <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                        <div className="py-4">
                          {tier.price === null ? (
                            <div>
                              <p className="text-3xl font-bold">Custom</p>
                              <p className="text-muted-foreground">Contact Sales</p>
                            </div>
                          ) : tier.price === 0 ? (
                            <div>
                              <p className="text-4xl font-bold">Free</p>
                              <p className="text-muted-foreground">Forever</p>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-baseline justify-center gap-1">
                                <span className="text-4xl font-bold">${currentPrice}</span>
                                <span className="text-muted-foreground">/{billing === 'annual' ? 'year' : 'month'}</span>
                              </div>
                              {billing === 'annual' && tier.savings > 0 && (
                                <p className="text-green-600 text-sm mt-1">
                                  Save ${tier.savings}/year
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <CardDescription>
                          {tier.monthly_limit === -1 
                            ? 'Unlimited rows/month' 
                            : `${tier.monthly_limit.toLocaleString()} rows/month`}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <ul className="space-y-3">
                          {tier.features.map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-start gap-3">
                              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="pt-6">
                          <Button
                            className={`w-full ${
                              isPopular 
                                ? 'bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90' 
                                : ''
                            } transition-all duration-300 transform hover:scale-105`}
                            size="lg"
                            variant={isPopular ? "default" : "outline"}
                            onClick={() => {
                              if (tier.id === 'enterprise') {
                                window.location.href = 'mailto:sales@synthos.com';
                              } else {
                                handleUpgrade(tier.id);
                              }
                            }}
                            className="touch-target"
                          >
                            {tier.id === 'enterprise' ? 'Contact Sales' : tier.price === 0 ? 'Get Started Free' : 'Start '}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PricingPage; 