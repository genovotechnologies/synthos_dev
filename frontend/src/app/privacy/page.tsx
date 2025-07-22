'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const PrivacyPage = () => {
  const { user } = useAuth();
  const [privacySettings, setPrivacySettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPrivacySettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPrivacySettings = async () => {
    try {
      const response = await apiClient.getPrivacySettings();
      setPrivacySettings(response);
    } catch (err) {
      console.error('Error fetching privacy settings:', err);
      setError('Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const updatePrivacySettings = async (settings: any) => {
    try {
      await apiClient.updatePrivacySettings(settings);
      setPrivacySettings(settings);
    } catch (err) {
      console.error('Error updating privacy settings:', err);
      setError('Failed to update privacy settings');
    }
  };
  const sections = [
    {
      title: "1. Information We Collect",
      content: `We collect information you provide directly to us, information we get from your use of our services, and information from third parties.

**Information you provide to us:**
• Account information (name, email, company)
• Profile information and preferences
• Source data files for synthetic data generation
• Payment and billing information
• Communications with our support team

**Information we collect automatically:**
• Usage data and analytics
• Device and browser information
• IP address and location data
• Cookies and similar technologies
• API usage and performance metrics

We only collect data necessary to provide and improve our services.`
    },
    {
      title: "2. How We Use Your Information",
      content: `We use the information we collect to:

**Provide our services:**
• Generate synthetic data based on your source files
• Process payments and manage your account
• Provide customer support and technical assistance
• Send service-related communications

**Improve our services:**
• Analyze usage patterns to enhance our platform
• Develop new features and capabilities
• Conduct research and development
• Monitor service performance and security

**Legal and business purposes:**
• Comply with legal obligations
• Protect our rights and prevent fraud
• Facilitate business transfers or acquisitions

We do not use your source data to train our AI models without explicit consent.`
    },
    {
      title: "3. Information Sharing and Disclosure",
      content: `We do not sell, rent, or share your personal information except in these limited circumstances:

**With your consent:**
• When you explicitly authorize sharing
• For integrations you enable with third-party services

**Service providers:**
• Cloud infrastructure providers (AWS, Azure, GCP)
• Payment processors for billing
• Analytics and monitoring services
• Customer support platforms

**Legal requirements:**
• When required by law or court order
• To protect our rights or prevent fraud
• In connection with legal proceedings

**Business transfers:**
• In case of merger, acquisition, or sale of assets

All service providers are contractually bound to protect your information.`
    },
    {
      title: "4. Data Security and Protection",
      content: `We implement comprehensive security measures to protect your information:

**Technical safeguards:**
• End-to-end encryption for data in transit and at rest
• Multi-factor authentication for account access
• Regular security audits and penetration testing
• SOC 2 Type II compliance
• Isolated processing environments

**Operational safeguards:**
• Employee background checks and training
• Principle of least privilege access
• Regular security awareness training
• Incident response procedures
• Data breach notification protocols

**Physical safeguards:**
• Secure data center facilities
• Biometric access controls
• Environmental monitoring
• 24/7 security surveillance

Despite these measures, no system is 100% secure. We continuously monitor and improve our security posture.`
    },
    {
      title: "5. Data Retention and Deletion",
      content: `We retain your information only as long as necessary for our legitimate business purposes:

**Account information:**
• Retained while your account is active
• Deleted within 30 days of account closure
• Some information may be retained for legal compliance

**Source data:**
• Processed data is deleted immediately after generation
• Temporary processing files are deleted within 24 hours
• No permanent storage of source data
• You can request immediate deletion at any time

**Usage data:**
• Aggregated analytics data retained for 2 years
• Personal identifiers removed after 90 days
• Anonymized data may be retained indefinitely

**Payment information:**
• Billing records retained for 7 years for tax purposes
• Credit card data is not stored on our systems

You can request deletion of your data at any time through your account settings or by contacting us.`
    },
    {
      title: "6. Your Privacy Rights",
      content: `Depending on your location, you may have certain rights regarding your personal information:

**Access and portability:**
• Request a copy of your personal information
• Export your data in a machine-readable format
• Receive information about how we process your data

**Correction and updating:**
• Update or correct inaccurate information
• Modify your account preferences
• Change consent settings

**Deletion and erasure:**
• Request deletion of your personal information
• Right to be forgotten under GDPR
• Object to processing for marketing purposes

**Control and restriction:**
• Opt out of marketing communications
• Restrict certain types of processing
• Withdraw consent where applicable

To exercise these rights, contact us at privacy@synthos.ai or through your account settings.`
    },
    {
      title: "7. Cookies and Tracking Technologies",
      content: `We use cookies and similar technologies to enhance your experience:

**Essential cookies:**
• Authentication and session management
• Security and fraud prevention
• Basic functionality and navigation

**Analytics cookies:**
• Google Analytics for usage insights
• Performance monitoring and optimization
• Feature usage and adoption metrics

**Marketing cookies:**
• Advertising campaign tracking
• Social media integration
• Personalized content delivery

**Cookie management:**
• You can control cookies through browser settings
• Disabling certain cookies may affect functionality
• We respect Do Not Track signals where technically feasible

For detailed cookie information, see our Cookie Policy.`
    },
    {
      title: "8. International Data Transfers",
      content: `Synthos is based in the United States, and we may transfer your information internationally:

**Transfer mechanisms:**
• Standard Contractual Clauses (SCCs) for EU transfers
• Adequacy decisions where available
• Other legally approved transfer mechanisms

**Safeguards:**
• All transfers include appropriate data protection safeguards
• Recipients must provide equivalent protection
• Regular monitoring of transfer compliance

**Data localization:**
• EU customer data can be processed within the EU upon request
• Certain regulated industries may require local processing
• Data residency options available for Enterprise customers

We ensure all international transfers comply with applicable privacy laws.`
    },
    {
      title: "9. Children's Privacy",
      content: `Synthos is not intended for use by children under 16 years of age:

• We do not knowingly collect information from children under 16
• If we discover we have collected a child's information, we will delete it promptly
• Parents can contact us to request deletion of their child's information
• We require age verification for account creation
• Educational use requires proper institutional oversight

If you believe we have collected information from a child, please contact us immediately.`
    },
    {
      title: "10. California Privacy Rights (CCPA)",
      content: `California residents have specific rights under the California Consumer Privacy Act:

**Right to know:**
• Categories of personal information collected
• Sources of personal information
• Business purposes for collection
• Categories of third parties we share with

**Right to delete:**
• Request deletion of personal information
• Exceptions for certain legal obligations
• Confirmation of deletion upon request

**Right to opt-out:**
• We do not sell personal information
• Right to opt-out of sharing for advertising
• Non-discrimination for exercising rights

**Right to non-discrimination:**
• Equal service regardless of privacy choices
• No penalties for exercising privacy rights

Contact us at privacy@synthos.ai to exercise your CCPA rights.`
    },
    {
      title: "11. European Privacy Rights (GDPR)",
      content: `European users have enhanced rights under the General Data Protection Regulation:

**Legal basis for processing:**
• Contract performance for service delivery
• Legitimate interests for service improvement
• Consent for marketing communications
• Legal compliance where required

**Data protection principles:**
• Lawfulness, fairness, and transparency
• Purpose limitation and data minimization
• Accuracy and storage limitation
• Integrity, confidentiality, and accountability

**Additional rights:**
• Right to portability
• Right to object to processing
• Right to restrict processing
• Right to complain to supervisory authorities

Our EU representative can be contacted for GDPR-related matters.`
    },
    {
      title: "12. Changes to This Privacy Policy",
      content: `We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements:

**Notification of changes:**
• Material changes will be communicated via email
• Notice posted on our website at least 30 days before effective date
• In-app notifications for significant changes

**Types of changes:**
• Updates to comply with new privacy laws
• Changes in our data processing practices
• New features or service offerings
• Clarifications or corrections

**Your options:**
• Continued use constitutes acceptance of changes
• You may close your account if you disagree with changes
• Contact us with questions about policy updates

We encourage you to review this policy periodically for updates.`
    }
  ];

  const privacyFeatures = [
    {
      title: "Differential Privacy",
      description: "Mathematical privacy guarantees with configurable epsilon values",
      icon: "🔐"
    },
    {
      title: "Zero Knowledge",
      description: "We never see your raw data - processing happens in isolated environments",
      icon: "👁️‍🗨️"
    },
    {
      title: "Data Minimization",
      description: "We collect and retain only the minimum data necessary",
      icon: "📉"
    },
    {
      title: "Encryption Everywhere",
      description: "End-to-end encryption for all data in transit and at rest",
      icon: "🔒"
    },
    {
      title: "Regular Audits",
      description: "Independent security audits and compliance certifications",
      icon: "🔍"
    },
    {
      title: "Transparent Controls",
      description: "Full control over your data with easy-to-use privacy settings",
      icon: "⚙️"
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
                <span className="text-primary font-medium">🔒 Privacy</span>
              </motion.div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text text-transparent">
                Privacy Policy
              </h1>
              
              <p className="text-xl text-muted-foreground mb-4">
                Your privacy is our priority. Learn how we protect and handle your data.
              </p>
              
              <p className="text-sm text-muted-foreground">
                Last updated: January 2025 • Effective Date: January 1, 2025
              </p>
            </motion.div>
          </div>
        </section>

        {/* Privacy Features */}
        <section className="mb-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Privacy by Design</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We've built privacy into every aspect of our platform, not as an afterthought.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {privacyFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5, scale: 1.02 }}
                >
                  <Card className="h-full text-center hover:shadow-lg transition-all duration-300">
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

        {/* Privacy Policy Content */}
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
                      <span className="text-2xl">📋</span>
                      Privacy at a Glance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <p className="mb-4 font-medium">
                        Here's what you need to know about how we handle your information:
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• We never permanently store your source data</li>
                        <li>• All data is encrypted with industry-leading security</li>
                        <li>• You have full control over your information</li>
                        <li>• We comply with GDPR, CCPA, and other privacy laws</li>
                        <li>• We don't sell or rent your personal information</li>
                        <li>• You can delete your data at any time</li>
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
                            {section.content.split('\n').map((paragraph: string, pIndex: number) => {
                              if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                                return (
                                  <h4 key={pIndex} className="font-semibold text-foreground mt-4 mb-2">
                                    {paragraph.slice(2, -2)}
                                  </h4>
                                );
                              }
                              return paragraph ? (
                                <p key={pIndex} className="mb-3 last:mb-0">
                                  {paragraph}
                                </p>
                              ) : null;
                            })}
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
                        <span className="text-2xl">📧</span>
                        Privacy Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        If you have any questions about this Privacy Policy or want to exercise your privacy rights, please contact us:
                      </p>
                      <div className="space-y-2 text-sm">
                        <p><strong>Data Protection Officer:</strong> privacy@synthos.dev</p>
                        <p><strong>EU Representative:</strong> eu-privacy@synthos.dev</p>
                        <p><strong>Address:</strong> Magodo Lagos, Nigeria 200222</p>
                        <p><strong>Phone:</strong> +234 802 970 9341</p>
                      </div>
                      
                      <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                        <p className="text-sm">
                          <strong>Response Time:</strong> We will respond to privacy requests within 30 days (72 hours for GDPR data breach notifications).
                        </p>
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

export default PrivacyPage; 