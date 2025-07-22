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
  (config) => {
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
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with security logging
api.interceptors.response.use(
  (response) => {
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
  async (error) => {
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

// Comprehensive API service methods
const apiService = {
  // Admin API methods
  async getAdminStats() {
    const response = await api.get('/api/v1/admin/stats');
    return response.data;
  },

  // Privacy settings API methods
  async getPrivacySettings() {
    const response = await api.get('/api/v1/privacy/settings');
    return response.data;
  },

  async updatePrivacySettings(settings: any) {
    const response = await api.put('/api/v1/privacy/settings', settings);
    return response.data;
  },

  // Dataset API methods
  async getDatasets() {
    const response = await api.get('/api/v1/datasets');
    return response.data;
  },

  async getGenerationJobs() {
    const response = await api.get('/api/v1/generation/jobs');
    return response.data;
  },

  async uploadDataset(file: File, metadata: any) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    const response = await api.post('/api/v1/datasets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async deleteDataset(datasetId: string | number) {
    const response = await api.delete(`/api/v1/datasets/${datasetId}`);
    return response.data;
  },

  async downloadDataset(datasetId: string | number) {
    const response = await api.get(`/api/v1/datasets/${datasetId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async startGeneration(config: any) {
    const response = await api.post('/api/v1/generation/start', config);
    return response.data;
  },

  // Billing API methods
  async getPricingPlans() {
    const response = await api.get('/api/v1/billing/plans');
    return response.data;
  },

  async createCheckoutSession(planId: string, provider: string) {
    const response = await api.post('/api/v1/billing/checkout', {
      plan_id: planId,
      provider: provider,
    });
    return response.data;
  },

  async createPortalSession() {
    const response = await api.post('/api/v1/billing/portal');
    return response.data;
  },

  // Custom models API methods
  async getCustomModels() {
    const response = await api.get('/api/v1/custom-models');
    return response.data;
  },

  async uploadCustomModel(file: File, metadata: any) {
    const formData = new FormData();
    formData.append('model', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    const response = await api.post('/api/v1/custom-models/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async deleteCustomModel(modelId: string | number) {
    const response = await api.delete(`/api/v1/custom-models/${modelId}`);
    return response.data;
  },

  // Authentication API methods
  async signIn(email: string, password: string) {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      return { access_token: 'demo-token', user: DEMO_USER };
    }
    const response = await api.post('/api/v1/auth/signin', {
      email,
      password,
    });
    return response.data;
  },

  async signUp(userData: any) {
    const response = await api.post('/api/v1/auth/signup', userData);
    return response.data;
  },

  async signOut() {
    const response = await api.post('/api/v1/auth/signout');
    return response.data;
  },

  async refreshToken() {
    const response = await api.post('/api/v1/auth/refresh');
    return response.data;
  },

  async resetPassword(email: string) {
    const response = await api.post('/api/v1/auth/reset-password', { email });
    return response.data;
  },

  async confirmResetPassword(token: string, newPassword: string) {
    const response = await api.post('/api/v1/auth/confirm-reset', {
      token,
      new_password: newPassword,
    });
    return response.data;
  },

  // User profile API methods
  async getProfile() {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      return DEMO_USER;
    }
    const response = await api.get('/api/v1/users/me');
    return response.data;
  },

  async updateProfile(profileData: any) {
    const response = await api.put('/api/v1/users/me', profileData);
    return response.data;
  },

  async getUserUsage() {
    const response = await api.get('/api/v1/users/usage');
    return response.data;
  },

  // Billing status and subscription methods
  async getBillingInfo() {
    const response = await api.get('/api/v1/payment/billing-info');
    return response.data;
  },

  async getBillingHistory() {
    const response = await api.get('/api/v1/payment/billing-history');
    return response.data;
  },

  // Admin user management methods
  async getUsers() {
    const response = await api.get('/api/v1/admin/users');
    return response.data;
  },

  async updateUserStatus(userId: string, isActive: boolean) {
    const response = await api.put(`/api/v1/admin/users/${userId}/status`, { is_active: isActive });
    return response.data;
  },

  async deleteUser(userId: string) {
    const response = await api.delete(`/api/v1/admin/users/${userId}`);
    return response.data;
  },

  // System health and monitoring
  async getSystemHealth() {
    const response = await api.get('/api/v1/system/health');
    return response.data;
  },

  // AI Models API methods
  async getModels() {
    const response = await api.get('/api/v1/models');
    return response.data;
  },
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