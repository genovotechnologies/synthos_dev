'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TermsPage = () => {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: `By accessing and using Synthos ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.

These Terms of Service ("Terms") govern your use of our synthetic data generation platform and services. By creating an account or using our services, you agree to these terms in full.`
    },
    {
      title: "2. Service Description",
      content: `Synthos provides AI-powered synthetic data generation services that allow users to create privacy-preserving synthetic datasets. Our platform uses advanced machine learning models including Claude 3, GPT-4, and custom models to generate high-quality synthetic data.

Key features include:
• Multi-model AI generation capabilities
• Privacy-first architecture with differential privacy
• Enterprise-grade scaling and reliability
• Comprehensive API and SDK access
• Industry-specific compliance (HIPAA, GDPR, SOC 2)`
    },
    {
      title: "3. User Accounts and Registration",
      content: `To access our services, you must register for an account. You agree to:
• Provide accurate, current, and complete information during registration
• Maintain the security of your password and account
• Accept responsibility for all activities under your account
• Notify us immediately of any unauthorized use

You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.`
    },
    {
      title: "4. Acceptable Use Policy",
      content: `You agree not to use the Service to:
• Generate data that violates any applicable laws or regulations
• Create synthetic data that could be used to harm individuals or organizations
• Attempt to reverse-engineer our AI models or algorithms
• Share your API keys or account credentials with unauthorized parties
• Exceed rate limits or attempt to circumvent usage restrictions
• Upload data containing personally identifiable information without proper consent

We reserve the right to suspend or terminate accounts that violate these policies.`
    },
    {
      title: "5. Data Privacy and Security",
      content: `We take data privacy seriously and implement industry-leading security measures:

• All data is encrypted in transit and at rest
• We employ differential privacy techniques to protect individual privacy
• Source data used for generation is not stored permanently
• We comply with GDPR, HIPAA, and other applicable privacy regulations
• Regular security audits and penetration testing

You retain ownership of any data you provide, and we only use it to generate synthetic datasets as requested.`
    },
    {
      title: "6. Intellectual Property Rights",
      content: `Synthos retains all rights to our platform, algorithms, and underlying technology. You retain rights to:
• Source data you provide to our platform
• Generated synthetic datasets created through our service
• Any derivative works you create using our synthetic data

Our AI models, software, and documentation are protected by copyright, trademark, and other intellectual property laws.`
    },
    {
      title: "7. Service Availability and Support",
      content: `We strive to maintain high service availability but cannot guarantee uninterrupted access. We provide:
• 99.9% uptime SLA for paid plans
• 24/7 technical support for Enterprise customers
• Community support for all users
• Regular maintenance windows with advance notice

Service interruptions may occur for maintenance, updates, or unforeseen circumstances.`
    },
    {
      title: "8. Billing and Payment Terms",
      content: `Payment terms vary by subscription plan:
• Free tier: Limited usage with no payment required
• Paid plans: Monthly or annual billing cycles
• Usage-based pricing for API calls and data generation
• All fees are non-refundable unless otherwise specified

We reserve the right to modify pricing with 30 days notice for existing customers.`
    },
    {
      title: "9. Limitation of Liability",
      content: `To the maximum extent permitted by law, Synthos shall not be liable for:
• Any indirect, incidental, special, or consequential damages
• Loss of profits, data, or business opportunities
• Damages arising from use of synthetic data in production systems
• Third-party claims related to generated datasets

Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.`
    },
    {
      title: "10. Termination",
      content: `Either party may terminate this agreement:
• You may cancel your account at any time through your dashboard
• We may terminate accounts for violation of these terms
• We may discontinue the service with 90 days notice
• Termination does not affect obligations incurred before termination

Upon termination, your access to the service will be immediately suspended.`
    },
    {
      title: "11. Changes to Terms",
      content: `We reserve the right to modify these terms at any time. We will:
• Notify users of material changes via email or platform notifications
• Provide at least 30 days notice for significant changes
• Post updated terms on our website with the effective date
• Consider continued use as acceptance of modified terms

We encourage you to review these terms periodically for updates.`
    },
    {
      title: "12. Governing Law and Disputes",
      content: `These terms are governed by the laws of Delaware, United States. Any disputes will be resolved through:
• Good faith negotiation as the first step
• Binding arbitration if negotiation fails
• Delaware state courts for any matters not subject to arbitration
• English language for all proceedings

Class action waivers apply to the extent permitted by law.`
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <main className="pt-32 pb-20">
        {/* Hero Section */}
        <section className="mb-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              <motion.div
                className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6"
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-primary font-medium">📋 Legal</span>
              </motion.div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text text-transparent">
                Terms of Service
              </h1>
              
              <p className="text-xl text-muted-foreground mb-4">
                Please read these terms carefully before using Synthos.
              </p>
              
              <p className="text-sm text-muted-foreground">
                Last updated: January 2025 • Effective Date: January 1, 2025
              </p>
            </motion.div>
          </div>
        </section>

        {/* Terms Content */}
        <section>
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">⚖️</span>
                      Quick Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <p className="mb-4 font-medium">
                        This is a human-readable summary of our Terms of Service. The full legal terms below are binding.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• You can use Synthos to generate synthetic data for legitimate purposes</li>
                        <li>• We protect your privacy and don't store your source data permanently</li>
                        <li>• You're responsible for using our service lawfully and ethically</li>
                        <li>• We provide the service "as is" with industry-standard support</li>
                        <li>• Either party can terminate this agreement with proper notice</li>
                        <li>• Disputes will be resolved through arbitration in Delaware</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-8">
                  {sections.map((section, index) => (
                    <motion.div
                      key={section.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-xl">{section.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm max-w-none text-muted-foreground">
                            {section.content.split('\n').map((paragraph: string, pIndex: number) => (
                              <p key={pIndex} className="mb-4 last:mb-0">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Contact Information */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="mt-12"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">📞</span>
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        If you have any questions about these Terms of Service, please contact us:
                      </p>
                      <div className="space-y-2 text-sm">
                        <p><strong>Email:</strong> legal@synthos.dev</p>
                        <p><strong>Address:</strong> Magodo Lagos, Nigeria</p>
                        <p><strong>Phone:</strong> +2348029709341</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TermsPage; 