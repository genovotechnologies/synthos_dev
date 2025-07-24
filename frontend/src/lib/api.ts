// @ts-ignore
// If you see errors about 'process', ensure @types/node is installed and 'node' is in tsconfig types.
// npm i --save-dev @types/node
import axios from 'axios';

// Security configuration
const FORCE_HTTPS = process.env.NEXT_PUBLIC_FORCE_HTTPS === 'true';

// Get API base URL with security validation
const getSecureApiUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:8000';
  
  // In production or when FORCE_HTTPS is enabled, ensure HTTPS
  if (process.env.NODE_ENV === 'production' || FORCE_HTTPS) {
    if (apiUrl.startsWith('http://')) {
      console.warn('⚠️ Converting HTTP to HTTPS for security');
      return apiUrl.replace('http://', 'https://');
    }
  }
  
  return apiUrl;
};

// Create axios instance with security configurations
const api = axios.create({
  baseURL: getSecureApiUrl(),
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    // Security headers
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
});

// Enhanced request interceptor with security
api.interceptors.request.use(
  (config: any) => {
    // Add correlation ID for tracking
    config.headers['X-Correlation-ID'] = generateCorrelationId();
    
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Security: Ensure HTTPS in production
    if (config.url && (process.env.NODE_ENV === 'production' || FORCE_HTTPS)) {
      if (config.url.startsWith('http://')) {
        config.url = config.url.replace('http://', 'https://');
      }
    }
    
    console.log('🔒 API Request:', {
      url: config.url,
      method: config.method,
      secure: config.url?.startsWith('https://') || false,
      correlationId: config.headers['X-Correlation-ID']
    });
    
    return config;
  },
  (error: any) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with security logging
api.interceptors.response.use(
  (response: any) => {
    // Log security headers for monitoring
    const securityHeaders = {
      'strict-transport-security': response.headers['strict-transport-security'],
      'x-content-type-options': response.headers['x-content-type-options'],
      'x-frame-options': response.headers['x-frame-options'],
      'content-security-policy': response.headers['content-security-policy']
    };
    
    console.log('🔒 Security Headers:', securityHeaders);
    
    return response;
  },
  async (error: any) => {
    const correlationId = error.config?.headers?.['X-Correlation-ID'];
    
    // Handle HTTPS upgrade required
    if (error.response?.status === 426) {
      console.error('🚨 HTTPS Required - Redirecting to secure endpoint');
      
      // Redirect to HTTPS version
      const httpsUrl = error.response.data?.upgrade_to;
      if (httpsUrl && typeof window !== 'undefined') {
        window.location.href = httpsUrl;
        return;
      }
    }
    
    // Handle unauthorized access
    if (error.response?.status === 401) {
      console.warn('🔐 Unauthorized access - clearing credentials');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login with secure connection
      if (typeof window !== 'undefined') {
        const loginUrl = '/auth/signin';
        window.location.href = loginUrl;
      }
    }
    
    // Enhanced error logging with correlation ID
    console.error('❌ API Error:', {
      correlationId,
      status: error.response?.status,
      message: error.message,
      endpoint: error.config?.url,
      secure: error.config?.url?.startsWith('https://') || false
    });
    
    return Promise.reject(error);
  }
);

// Utility function to generate correlation IDs
const generateCorrelationId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Security validation function
export const validateSecureConnection = (): boolean => {
  if (typeof window === 'undefined') return true;
  
  const isHttps = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // In production, require HTTPS
  if (process.env.NODE_ENV === 'production' && !isHttps) {
    console.error('🚨 Insecure connection detected in production');
    return false;
  }
  
  // In development, allow HTTP only for localhost
  if (process.env.NODE_ENV === 'development' && !isHttps && !isLocalhost) {
    console.warn('⚠️ Non-HTTPS connection to non-localhost endpoint');
    return false;
  }
  
  return true;
};

// Update API endpoints to match backend FastAPI endpoints
const apiService = {
  // Admin API methods
  async getAdminStats() {
    const response = await api.get('/api/v1/admin/stats');
    return response.data;
  },

  // Dataset API methods
  async getDatasets() {
    const response = await api.get('/api/v1/datasets');
    return response.data;
  },

  async getDataset(datasetId: number) {
    const response = await api.get(`/api/v1/datasets/${datasetId}`);
    return response.data;
  },

  async uploadDataset(file: File, metadata: any) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata.name) formData.append('name', metadata.name);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.privacy_level) formData.append('privacy_level', metadata.privacy_level);
    const response = await api.post('/api/v1/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Generation API methods
  async startGeneration(config: any) {
    // config: { dataset_id, rows, privacy_level, epsilon, delta, strategy, model_type }
    const response = await api.post('/api/v1/generation/generate', config);
    return response.data;
  },

  async getGenerationJob(jobId: number) {
    const response = await api.get(`/api/v1/generation/jobs/${jobId}`);
    return response.data;
  },

  async getGenerationJobs() {
    const response = await api.get('/api/v1/generation/jobs');
    return response.data;
  },

  async downloadGeneratedData(jobId: number) {
    const response = await api.get(`/api/v1/generation/download/${jobId}`);
    return response.data;
  },

  // User API methods
  async getProfile() {
    const response = await api.get('/api/v1/users/me');
    return response.data;
  },

  async getUserUsage() {
    const response = await api.get('/api/v1/users/usage');
    return response.data;
  },

  // Billing/Payment API methods
  async getPricingPlans() {
    const response = await api.get('/api/v1/payment/plans');
    return response.data;
  },

  async createCheckoutSession(planId: string, provider: string) {
    const response = await api.post('/api/v1/payment/create-checkout-session', {
      plan_id: planId,
      provider: provider,
    });
    return response.data;
  },

  async getCurrentSubscription() {
    const response = await api.get('/api/v1/payment/subscription');
    return response.data;
  },

  // Auth API methods
  async signIn(email: string, password: string) {
    const response = await api.post('/api/v1/auth/signin', { email, password });
    return response.data;
  },

  async signUp(userData: any) {
    const response = await api.post('/api/v1/auth/signup', userData);
    return response.data;
  },

  // Marketing/Features API methods
  async getFeatures() {
    const response = await api.get('/api/v1/marketing/features');
    return response.data;
  },

  // Add testimonials API method
  async getTestimonials() {
    const response = await api.get('/api/v1/marketing/testimonials');
    return response.data;
  },

  // Analytics API methods
  async getAnalyticsPerformance() {
    const response = await api.get('/api/v1/analytics/performance');
    return response.data;
  },
  async getPromptCache() {
    const response = await api.get('/api/v1/analytics/prompt-cache');
    return response.data;
  },
  async submitFeedback(generation_id: string, quality_score: number) {
    const response = await api.post('/api/v1/analytics/feedback', { generation_id, quality_score });
    return response.data;
  },
  async getFeedback(generation_id: string) {
    const response = await api.get(`/api/v1/analytics/feedback/${generation_id}`);
    return response.data;
  },

  // Admin user management API methods
  async getUsers() {
    const response = await api.get('/api/v1/admin/users');
    return response.data;
  },
  async updateUserStatus(userId: number, status: string) {
    const response = await api.patch(`/api/v1/admin/users/${userId}/status`, { status });
    return response.data;
  },
  async deleteUser(userId: number) {
    const response = await api.delete(`/api/v1/admin/users/${userId}`);
    return response.data;
  },

  // Add any other endpoints as needed, matching backend routes
};

// API constants with security defaults
export const API_CONFIG = {
  BASE_URL: getSecureApiUrl(),
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  FORCE_HTTPS: FORCE_HTTPS || process.env.NODE_ENV === 'production'
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  HTTPS_REQUIRED: "This application requires a secure connection (HTTPS).",
  SERVER_ERROR: "Server error. Please try again later.",
  VALIDATION_ERROR: "Please check your input and try again.",
  RATE_LIMITED: "Too many requests. Please wait a moment before trying again."
};

// Named exports for compatibility
export const apiClient = apiService;

export default api; 