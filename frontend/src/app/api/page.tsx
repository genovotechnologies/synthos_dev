'use client';

import React, { useState, type FC } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api';

const ApiPage: FC = () => {
  const [activeEndpoint, setActiveEndpoint] = useState('generate');
  const [testRequest, setTestRequest] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const endpoints = [
    {
      id: 'generate',
      method: 'POST',
      path: '/v1/generate',
      title: 'Generate Synthetic Data',
      description: 'Generate synthetic data from a source dataset',
      requestBody: `{
  "dataset_id": 123,
  "rows": 1000,
  "privacy_level": "medium",
  "epsilon": 1.0,
  "delta": 1e-5,
  "model_type": "claude-3-sonnet"
}`,
      response: `{
  "job_id": "job_abc123",
  "status": "pending",
  "estimated_completion": "2024-01-20T10:30:00Z",
  "rows_requested": 1000,
  "privacy_parameters": {
    "privacy_level": "medium",
    "epsilon": 1.0,
    "delta": 1e-5
  }
}`
    },
    {
      id: 'datasets',
      method: 'GET',
      path: '/v1/datasets',
      title: 'List Datasets',
      description: 'Get all your uploaded datasets',
      requestBody: '',
      response: `[
  {
    "id": 123,
    "name": "customer_data.csv",
    "status": "ready",
    "row_count": 10000,
    "column_count": 12,
    "created_at": "2024-01-20T10:00:00Z"
  }
]`
    },
    {
      id: 'upload',
      method: 'POST',
      path: '/v1/datasets/upload',
      title: 'Upload Dataset',
      description: 'Upload a new dataset file',
      requestBody: `FormData:
- file: (binary)
- name: "My Dataset"
- description: "Customer data for analysis"`,
      response: `{
  "id": 124,
  "name": "My Dataset",
  "status": "processing",
  "message": "Dataset uploaded successfully"
}`
    },
    {
      id: 'job-status',
      method: 'GET',
      path: '/v1/jobs/{job_id}',
      title: 'Check Job Status',
      description: 'Get the status of a generation job',
      requestBody: '',
      response: `{
  "id": "job_abc123",
  "status": "completed",
  "progress_percentage": 100,
  "rows_generated": 1000,
  "output_url": "https://api.synthos.dev/download/job_abc123",
  "quality_metrics": {
    "accuracy": 98.7,
    "correlation_preservation": 96.5
  }
}`
    },
    {
      id: 'models',
      method: 'GET',
      path: '/v1/models',
      title: 'List AI Models',
      description: 'Get available AI models for generation',
      requestBody: '',
      response: `[
  {
    "id": "claude-3-sonnet",
    "name": "Claude 3 Sonnet",
    "provider": "Anthropic",
    "max_context": 200000,
    "accuracy": 98.5
  },
  {
    "id": "gpt-4-turbo",
    "name": "GPT-4 Turbo",
    "provider": "OpenAI",
    "max_context": 128000,
    "accuracy": 97.8
  }
]`
    }
  ];

  const sdkExamples = [
    {
      language: 'Python',
      code: `import synthos

# Initialize client
client = synthos.Client(api_key="your_api_key")

# Upload dataset
dataset = client.datasets.upload("data.csv")

# Generate synthetic data
job = client.generate(
    dataset_id=dataset.id,
    rows=1000,
    privacy_level="medium"
)

# Wait for completion and download
result = job.wait_for_completion()
synthetic_data = result.download()`
    },
    {
      language: 'JavaScript',
      code: `import { SynthosClient } from '@synthos/js-sdk';

// Initialize client
const client = new SynthosClient({
  apiKey: 'your_api_key'
});

// Upload dataset
const dataset = await client.datasets.upload('data.csv');

// Generate synthetic data
const job = await client.generate({
  datasetId: dataset.id,
  rows: 1000,
  privacyLevel: 'medium'
});

// Wait for completion
const result = await job.waitForCompletion();
const syntheticData = await result.download();`
    },
    {
      language: 'cURL',
      code: `# Upload dataset
curl -X POST "https://api.synthos.dev/v1/datasets/upload" \\
  -H "Authorization: Bearer your_api_key" \\
  -F "file=@data.csv" \\
  -F "name=My Dataset"

# Generate synthetic data
curl -X POST "https://api.synthos.dev/v1/generate" \\
  -H "Authorization: Bearer your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "dataset_id": 123,
    "rows": 1000,
    "privacy_level": "medium"
  }'`
    }
  ];

  const testApiCall = async () => {
    setIsLoading(true);
    try {
      const endpoint = endpoints.find(e => e.id === activeEndpoint);
      let response;
      if (endpoint) {
        if (endpoint.method === 'GET') {
          const fn = (apiClient as any)[endpoint.id === 'datasets' ? 'getDatasets' : endpoint.id === 'models' ? 'getModels' : 'getProfile'];
          response = await fn();
        } else if (endpoint.method === 'POST') {
          // For demo, use example request body
          const body = testRequest ? JSON.parse(testRequest) : {};
          if (endpoint.id === 'generate') {
            response = await apiClient.startGeneration(body);
          } else if (endpoint.id === 'upload') {
            // Not implemented: file upload demo
            response = { message: 'File upload demo not implemented in browser' };
          } else {
            // Type-safe dynamic method access
            type ApiClientType = typeof apiClient;
            type ApiClientKey = keyof ApiClientType;
            if ((endpoint.id as ApiClientKey) in apiClient) {
              const fn = apiClient[endpoint.id as ApiClientKey];
              if (typeof fn === 'function') {
                response = await (fn as (body: any) => Promise<any>)(body);
              } else {
                response = { error: `API client method '${endpoint.id}' is not a function.` };
              }
            } else {
              response = { error: `API client does not have a method for endpoint id '${endpoint.id}'.` };
            }
          }
        }
      }
      setTestResponse(JSON.stringify(response, null, 2));
    } catch (error) {
      setTestResponse('{"error": "Request failed"}');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">API Documentation</h1>
            <p className="text-lg text-muted-foreground">
              Integrate Synthos into your applications with our powerful API
            </p>
          </div>

          {/* Quick Start */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>🚀 Quick Start</CardTitle>
              <CardDescription>
                Get started with the Synthos API in minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                    1
                  </div>
                  <h3 className="font-semibold mb-2">Get API Key</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate your API key in the settings page
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                    2
                  </div>
                  <h3 className="font-semibold mb-2">Upload Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload your dataset using the API or dashboard
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                    3
                  </div>
                  <h3 className="font-semibold mb-2">Generate</h3>
                  <p className="text-sm text-muted-foreground">
                    Call the generate endpoint to create synthetic data
                  </p>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Button asChild>
                  <a href="/settings">Get API Key</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* API Endpoints */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>API Endpoints</CardTitle>
                  <CardDescription>
                    Explore our API endpoints and test them directly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {endpoints.map((endpoint) => (
                      <div
                        key={endpoint.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          activeEndpoint === endpoint.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-gray-300'
                        }`}
                        onClick={() => setActiveEndpoint(endpoint.id)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 text-xs rounded font-medium ${
                            endpoint.method === 'GET' ? 'bg-green-100 text-green-700' :
                            endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {endpoint.method}
                          </span>
                          <code className="text-sm font-mono">{endpoint.path}</code>
                        </div>
                        <h3 className="font-semibold">{endpoint.title}</h3>
                        <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* API Testing */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>API Testing</CardTitle>
                  <CardDescription>
                    Test API endpoints directly from the browser
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const endpoint = endpoints.find(e => e.id === activeEndpoint);
                    return endpoint ? (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold mb-2">{endpoint.title}</h3>
                          <div className="flex items-center gap-2 mb-4">
                            <span className={`px-2 py-1 text-xs rounded font-medium ${
                              endpoint.method === 'GET' ? 'bg-green-100 text-green-700' :
                              endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {endpoint.method}
                            </span>
                            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {endpoint.path}
                            </code>
                          </div>
                        </div>

                        {endpoint.requestBody && (
                          <div>
                            <label className="block text-sm font-medium mb-2">Request Body</label>
                            <textarea
                              value={testRequest || endpoint.requestBody}
                              onChange={(e) => setTestRequest(e.target.value)}
                              className="w-full h-32 px-3 py-2 border rounded-md font-mono text-sm"
                              placeholder="Request body..."
                            />
                          </div>
                        )}

                        <Button onClick={testApiCall} disabled={isLoading} className="w-full">
                          {isLoading ? 'Testing...' : 'Test Endpoint'}
                        </Button>

                        <div>
                          <label className="block text-sm font-medium mb-2">Response</label>
                          <pre className="w-full h-40 px-3 py-2 border rounded-md bg-gray-50 text-sm overflow-auto">
                            {testResponse || endpoint.response}
                          </pre>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* SDK Examples */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>SDK Examples</CardTitle>
              <CardDescription>
                Code examples in different programming languages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sdkExamples.map((example, index) => (
                  <div key={index}>
                    <h3 className="font-semibold mb-3">{example.language}</h3>
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{example.code}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rate Limits */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Rate Limits & Quotas</CardTitle>
              <CardDescription>
                Understand your API usage limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Requests per Minute</h3>
                  <div className="text-2xl font-bold text-primary">100</div>
                  <p className="text-sm text-muted-foreground">All endpoints</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Monthly Generations</h3>
                  <div className="text-2xl font-bold text-primary">10,000</div>
                  <p className="text-sm text-muted-foreground">Free tier limit</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">File Size Limit</h3>
                  <div className="text-2xl font-bold text-primary">100MB</div>
                  <p className="text-sm text-muted-foreground">Per upload</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ApiPage; 