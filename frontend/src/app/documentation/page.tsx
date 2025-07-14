'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const DocumentationPage = () => {
  const [activeTab, setActiveTab] = useState('getting-started');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const documentationSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Quick start guide to begin generating synthetic data',
      icon: '🚀'
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      description: 'Complete API documentation with examples',
      icon: '📚'
    },
    {
      id: 'sdks',
      title: 'SDKs & Libraries',
      description: 'Official SDKs for Python, JavaScript, and R',
      icon: '🛠️'
    },
    {
      id: 'tutorials',
      title: 'Tutorials',
      description: 'Step-by-step guides for common use cases',
      icon: '🎓'
    },
    {
      id: 'examples',
      title: 'Code Examples',
      description: 'Real-world implementation examples',
      icon: '💡'
    },
    {
      id: 'best-practices',
      title: 'Best Practices',
      description: 'Guidelines for optimal synthetic data generation',
      icon: '⭐'
    }
  ];

  const codeExamples = {
    'python': `# Install the Synthos Python SDK
pip install synthos-sdk

# Initialize the client
from synthos import SynthosClient

client = SynthosClient(api_key="your-api-key")

# Generate synthetic data
result = client.generate_data(
    source_data="data.csv",
    model="claude-3-opus",
    privacy_level="high",
    rows=1000
)

# Save the generated data
result.to_csv("synthetic_data.csv")`,
    
    'javascript': `// Install the Synthos JavaScript SDK
npm install @synthos/sdk

// Initialize the client
import { SynthosClient } from '@synthos/sdk';

const client = new SynthosClient({
  apiKey: 'your-api-key'
});

// Generate synthetic data
const result = await client.generateData({
  sourceData: 'data.csv',
  model: 'gpt-4-turbo',
  privacyLevel: 'medium',
  rows: 1000
});

// Download the generated data
await result.download('synthetic_data.csv');`,
    
    'curl': `# Using cURL to generate synthetic data
curl -X POST "https://api.synthos.ai/v1/generate" \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source_data": "data.csv",
    "model": "claude-3-sonnet",
    "privacy_level": "high",
    "rows": 1000,
    "format": "csv"
  }'`
  };

  const apiEndpoints = [
    {
      method: 'POST',
      endpoint: '/v1/generate',
      description: 'Generate synthetic data from source dataset',
      example: 'Generate 1000 rows with high privacy'
    },
    {
      method: 'GET',
      endpoint: '/v1/jobs/{id}',
      description: 'Get generation job status and results',
      example: 'Check job progress and download results'
    },
    {
      method: 'GET',
      endpoint: '/v1/models',
      description: 'List available AI models',
      example: 'Get all Claude and GPT models'
    },
    {
      method: 'POST',
      endpoint: '/v1/validate',
      description: 'Validate synthetic data quality',
      example: 'Run 7-dimensional quality analysis'
    },
    {
      method: 'GET',
      endpoint: '/v1/usage',
      description: 'Get API usage statistics',
      example: 'Check current month consumption'
    }
  ];

  const tutorials = [
    {
      title: 'Healthcare Data Generation',
      description: 'Generate HIPAA-compliant patient records',
      duration: '15 min',
      difficulty: 'Intermediate',
      topics: ['FHIR compliance', 'Differential privacy', 'Medical terminology']
    },
    {
      title: 'Financial Data Synthesis',
      description: 'Create synthetic transaction and customer data',
      duration: '20 min',
      difficulty: 'Advanced',
      topics: ['PCI DSS compliance', 'Fraud patterns', 'Risk modeling']
    },
    {
      title: 'E-commerce Analytics',
      description: 'Build synthetic user behavior datasets',
      duration: '12 min',
      difficulty: 'Beginner',
      topics: ['Customer journeys', 'Purchase patterns', 'A/B testing']
    },
    {
      title: 'IoT Sensor Data',
      description: 'Generate time-series sensor data',
      duration: '18 min',
      difficulty: 'Intermediate',
      topics: ['Time series', 'Anomaly detection', 'Predictive maintenance']
    }
  ];

  const copyToClipboard = async (code: string, type: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(type);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'getting-started':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Quick Start Guide</h2>
              <p className="text-muted-foreground mb-6">
                Get up and running with Synthos in minutes. Follow these steps to generate your first synthetic dataset.
              </p>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                    Get Your API Key
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Sign up for a free account and get your API key from the dashboard.
                  </p>
                  <Button>Get API Key</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                    Install SDK
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Choose your preferred SDK and install it in your environment.
                  </p>
                  <div className="space-y-4">
                    {Object.entries(codeExamples).map(([lang, code]) => (
                      <div key={lang} className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium capitalize">{lang}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(code, lang)}
                          >
                            {copiedCode === lang ? '✓ Copied' : 'Copy'}
                          </Button>
                        </div>
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                          <code>{code}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                    Generate Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Run your first generation job and explore the results. Check out our tutorials for advanced use cases.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'api-reference':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">API Reference</h2>
              <p className="text-muted-foreground mb-6">
                Complete reference for all Synthos API endpoints with examples and parameters.
              </p>
            </div>

            <div className="space-y-6">
              {apiEndpoints.map((endpoint, index) => (
                <motion.div
                  key={endpoint.endpoint}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                          endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {endpoint.method}
                        </span>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {endpoint.endpoint}
                        </code>
                      </div>
                      <CardDescription>{endpoint.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Example: {endpoint.example}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'tutorials':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Tutorials</h2>
              <p className="text-muted-foreground mb-6">
                Step-by-step guides for common synthetic data generation scenarios.
              </p>
            </div>

            <div className="grid gap-6">
              {tutorials.map((tutorial, index) => (
                <motion.div
                  key={tutorial.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="mb-2">{tutorial.title}</CardTitle>
                          <CardDescription>{tutorial.description}</CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{tutorial.duration}</div>
                          <div className={`text-xs px-2 py-1 rounded mt-1 ${
                            tutorial.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                            tutorial.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {tutorial.difficulty}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {tutorial.topics.map((topic, topicIndex) => (
                          <span
                            key={topicIndex}
                            className="text-xs bg-muted px-2 py-1 rounded"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                      <Button size="sm">Start Tutorial</Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
            <p className="text-muted-foreground">
              This section is currently being developed.
            </p>
          </div>
        );
    }
  };

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
                <span className="text-primary font-medium">📚 Documentation</span>
              </motion.div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text text-transparent">
                Developer Resources
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8">
                Everything you need to integrate Synthos into your workflow. From quick start guides 
                to advanced tutorials and complete API reference.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Documentation Content */}
        <section>
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Navigation */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                  className="lg:col-span-1"
                >
                  <Card className="sticky top-24">
                    <CardHeader>
                      <CardTitle className="text-lg">Navigation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <nav className="space-y-2">
                        {documentationSections.map((section) => (
                          <motion.button
                            key={section.id}
                            onClick={() => setActiveTab(section.id)}
                            className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                              activeTab === section.id
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{section.icon}</span>
                              <div>
                                <div className="font-medium">{section.title}</div>
                                <div className={`text-xs ${
                                  activeTab === section.id 
                                    ? 'text-primary-foreground/80' 
                                    : 'text-muted-foreground'
                                }`}>
                                  {section.description}
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </nav>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Main Content */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="lg:col-span-3"
                >
                  <Card className="min-h-[600px]">
                    <CardContent className="p-8">
                      {renderContent()}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section className="mt-20 py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto"
            >
              <h2 className="text-3xl font-bold mb-4">Need Help?</h2>
              <p className="text-muted-foreground mb-8">
                Our team is here to help you succeed with synthetic data generation.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg">
                  Contact Support
                </Button>
                <Button size="lg" variant="outline">
                  Join Community
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DocumentationPage; 