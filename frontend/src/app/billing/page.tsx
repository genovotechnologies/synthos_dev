'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  monthly_limit: number;
  features: string[];
  stripe_price_id?: string;
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

interface BillingInfo {
  current_plan: PaymentPlan;
  usage_this_month: number;
  next_billing_date: string;
  payment_method: {
    type: string;
    last_four: string;
    expires: string;
  };
  billing_history: {
    id: string;
    amount: number;
    date: string;
    status: string;
    download_url: string;
  }[];
}

export default function BillingPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('paddle');
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    fetchBillingData();
  }, [isAuthenticated, router]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [plansResponse, billingResponse] = await Promise.all([
        apiClient.getPricingPlans(),
        apiClient.getBillingInfo().catch(err => {
          console.warn('Billing info API error:', err);
          return {
            current_plan: { id: 'free', name: 'Free', price: 0, monthly_limit: 10000, features: [] },
            usage_this_month: 0,
            next_billing_date: null,
            payment_method: null,
            billing_history: []
          };
        })
      ]);

      setPlans(plansResponse.plans);
      setPaymentProviders(plansResponse.payment_providers || []);
      // Set default provider to the first available one
      const availableProvider = plansResponse.payment_providers?.find((p: PaymentProvider) => p.available);
      if (availableProvider) {
        setSelectedProvider(availableProvider.id);
      }
      setBillingInfo(billingResponse);
    } catch (err) {
      console.error('Error fetching billing data:', err);
      setError('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePlan = async (planId: string) => {
    try {
      setUpgradeLoading(planId);
      
      const selectedProviderData = paymentProviders.find(p => p.id === selectedProvider);
      if (!selectedProviderData?.available) {
        setError(`${selectedProviderData?.name || 'Selected payment provider'} is not currently available`);
        setUpgradeLoading(null);
        return;
      }
      
      const response = await apiClient.createCheckoutSession(planId, selectedProvider);
      window.location.href = response.checkout_url;
    } catch (err) {
      console.error('Error upgrading plan:', err);
      setError('Failed to initiate upgrade');
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await apiClient.createPortalSession();
      window.location.href = response.portal_url;
    } catch (err) {
      console.error('Error accessing billing portal:', err);
      setError('Failed to access billing portal');
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'free': return 'border-gray-300 bg-gray-50';
      case 'starter': return 'border-blue-300 bg-blue-50';
      case 'professional': return 'border-purple-300 bg-purple-50';
      case 'enterprise': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getUsagePercentage = () => {
    if (!billingInfo) return 0;
    return (billingInfo.usage_this_month / billingInfo.current_plan.monthly_limit) * 100;
  };

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

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Billing & Subscriptions</h1>
            <p className="text-lg text-muted-foreground">
              Manage your subscription, billing, and payment information
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Current Plan */}
          {billingInfo && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Current Plan
                  <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {billingInfo.current_plan.name}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Monthly Usage</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Rows Generated</span>
                        <span>{billingInfo.usage_this_month.toLocaleString()} / {billingInfo.current_plan.monthly_limit.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(getUsagePercentage(), 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(getUsagePercentage())}% of monthly limit used
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Billing</h3>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Current:</span> ${billingInfo.current_plan.price}/month
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Next billing:</span> {new Date(billingInfo.next_billing_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Payment method:</span> •••• {billingInfo.payment_method.last_four}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Actions</h3>
                    <div className="space-y-2">
                      <Button 
                        onClick={handleManageSubscription}
                        variant="outline"
                        className="w-full"
                      >
                        Manage Subscription
                      </Button>
                      <Button 
                        onClick={() => router.push('/pricing')}
                        className="w-full"
                      >
                        Upgrade Plan
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Provider Selection */}
          {paymentProviders.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>
                  Choose your preferred payment provider for upgrades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentProviders.map(provider => (
                    <div
                      key={provider.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedProvider === provider.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      } ${!provider.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => provider.available && setSelectedProvider(provider.id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">{provider.name}</h3>
                        {provider.available ? (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                            Available
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{provider.description}</p>
                      <div className="space-y-2">
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">Payment Methods</h4>
                          <div className="flex flex-wrap gap-1">
                            {provider.payment_methods.slice(0, 3).map(method => (
                              <span key={method} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                                {method.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                        {provider.features && provider.features.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-1">Key Feature</h4>
                            <p className="text-xs text-green-600">{provider.features[0]}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Selected: {paymentProviders.find(p => p.id === selectedProvider)?.name}
                      </p>
                      <p className="text-xs text-blue-700">
                        {paymentProviders.find(p => p.id === selectedProvider)?.description}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Plans */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>
                Choose the plan that best fits your needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map(plan => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`p-4 rounded-lg border-2 relative ${getPlanColor(plan.id)}`}
                  >
                    {plan.most_popular && (
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs">
                          Most Popular
                        </span>
                      </div>
                    )}
                    <div className="text-center">
                      <h3 className="font-bold text-lg mb-2">{plan.name}</h3>
                      <div className="mb-4">
                        {plan.price === 0 ? (
                          <span className="text-2xl font-bold">Free</span>
                        ) : plan.enterprise ? (
                          <span className="text-2xl font-bold">Custom</span>
                        ) : (
                          <span className="text-2xl font-bold">${plan.price}/mo</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {plan.monthly_limit === -1 ? 'Unlimited' : `${plan.monthly_limit.toLocaleString()}`} rows/month
                      </p>
                      <ul className="text-sm space-y-1 mb-4">
                        {plan.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="text-green-600">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => handleUpgradePlan(plan.id)}
                        disabled={upgradeLoading === plan.id || billingInfo?.current_plan.id === plan.id}
                        className="w-full"
                        variant={plan.most_popular ? "default" : "outline"}
                      >
                        {upgradeLoading === plan.id ? 'Processing...' : 
                         billingInfo?.current_plan.id === plan.id ? 'Current Plan' : 
                         plan.enterprise ? 'Contact Sales' : 'Upgrade'}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                Download invoices and view payment history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {billingInfo?.billing_history.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📄</div>
                  <h3 className="text-lg font-semibold mb-2">No Billing History</h3>
                  <p className="text-muted-foreground">
                    Your billing history will appear here once you upgrade to a paid plan
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {billingInfo?.billing_history.map(invoice => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">${invoice.amount}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(invoice.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {invoice.status}
                        </span>
                        <Button variant="outline" size="sm">
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 