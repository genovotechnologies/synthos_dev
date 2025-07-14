// Application Constants
export const APP_NAME = 'Synthos'
export const APP_DESCRIPTION = 'Enterprise Synthetic Data Platform with Agentive AI'
export const APP_VERSION = '1.0.0'

// Subscription Tiers (matches backend configuration)
export const SUBSCRIPTION_TIERS = [
  {
    id: "free",
    name: "Free",
    monthly_limit: 10000,
    features: ["Basic generation", "Watermarked data", "Community support"],
    price: 0,
    stripe_price_id: null,
    aiModels: ["Claude 3 Sonnet"],
    customModels: 0,
    support: "Community",
    apiAccess: false,
    popular: false,
    interval: "month",
  },
  {
    id: "starter",
    name: "Starter",
    monthly_limit: 50000,
    features: [
      "Advanced generation",
      "No watermarks", 
      "Email support",
      "CSV/JSON export"
    ],
    price: 99,
    stripe_price_id: "price_starter_monthly",
    aiModels: ["Claude 3 Sonnet"],
    customModels: 0,
    support: "Email",
    apiAccess: false,
    popular: true,
    interval: "month",
  },
  {
    id: "professional",
    name: "Professional", 
    monthly_limit: 1000000,
    features: [
      "Multi-model AI (Claude + GPT-3.5)",
      "Advanced generation",
      "No watermarks",
      "API access",
      "Priority support",
      "All export formats"
    ],
    price: 599,
    stripe_price_id: "price_professional_monthly",
    aiModels: ["Claude 3 Sonnet", "GPT-3.5 Turbo"],
    customModels: 0,
    support: "Priority",
    apiAccess: true,
    popular: false,
    interval: "month",
  },
  {
    id: "growth",
    name: "Growth",
    monthly_limit: 5000000,
    features: [
      "GPT-4 Turbo generation",
      "Custom models (10 models)",
      "Advanced privacy controls", 
      "Priority support",
      "GPU inference",
      "All export formats"
    ],
    price: 1299,
    stripe_price_id: "price_growth_monthly",
    aiModels: ["GPT-4 Turbo", "Claude 3 Sonnet", "GPT-3.5 Turbo","Claude 3 Haiku","Custom Models"],
    customModels: 10,
    support: "Dedicated",
    apiAccess: true,
    popular: false,
    interval: "month",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthly_limit: -1, // Unlimited
    features: [
      "Claude 3 Opus + Ensemble",
      "Unlimited custom models",
      "24/7 dedicated support",
      "On-premise deployment",
      "Custom integrations",
      "SLA guarantee"
    ],
    price: null, // Contact Sales
    stripe_price_id: null,
    aiModels: ["Claude 3 Opus", "GPT-4 Turbo","Claude 3 Haiku", "Custom Models", "Ensemble"],
    customModels: -1, // Unlimited
    support: "Enterprise",
    apiAccess: true,
    popular: false,
    interval: "month",
  },
] as const

// AI Models with performance metrics
export const AI_MODELS = [
  {
    id: "claude-3-sonnet",
    name: "Claude 3 Sonnet",
    provider: "Anthropic",
    speed: "Medium",
    accuracy: 0.96,
    tier_required: "free",
    description: "Balanced performance for most use cases",
    best_for: "General purpose data generation",
    context_length: "200K tokens",
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic", 
    speed: "Slow",
    accuracy: 0.98,
    tier_required: "enterprise",
    description: "Highest accuracy for critical applications",
    best_for: "Critical accuracy requirements",
    context_length: "200K tokens",
  },
  {
    id: "claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    speed: "Very Fast",
    accuracy: 0.92,
    tier_required: "growth",
    description: "Fast generation for high volume",
    best_for: "Speed optimization",
    context_length: "200K tokens",
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    speed: "Fast",
    accuracy: 0.89,
    tier_required: "growth",
    description: "Fast and accurate generation",
    best_for: "Balanced speed and accuracy",
    context_length: "128K tokens",
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    speed: "Very Fast",
    accuracy: 0.82,
    tier_required: "professional",
    description: "High volume, budget-friendly",
    best_for: "High volume, cost efficiency",
    context_length: "16K tokens",
  }
] as const

// Privacy Levels
export const PRIVACY_LEVELS = {
  low: {
    name: "Low Privacy",
    epsilon: 10.0,
    delta: 1e-3,
    description: "Basic privacy protection",
    recommended_for: ["Development", "Testing"],
  },
  medium: {
    name: "Medium Privacy",
    epsilon: 1.0,
    delta: 1e-5,
    description: "Balanced privacy and utility",
    recommended_for: ["Production", "Analytics"],
  },
  high: {
    name: "High Privacy", 
    epsilon: 0.1,
    delta: 1e-6,
    description: "Maximum privacy protection",
    recommended_for: ["Healthcare", "Finance", "PII"],
  },
} as const

// Industry Domains for Enhanced Realism
export const INDUSTRY_DOMAINS = {
  healthcare: {
    name: "Healthcare",
    compliance: ["HIPAA", "FDA"],
    realism_accuracy: 0.987,
    business_rules: [
      "systolic_bp > diastolic_bp",
      "bmi = weight_kg / (height_cm/100)^2",
      "age_category consistent with birth_date",
    ],
  },
  finance: {
    name: "Finance",
    compliance: ["SOX", "PCI-DSS"],
    realism_accuracy: 0.978,
    business_rules: [
      "credit_limit <= annual_income * 5",
      "monthly_payment <= annual_income / 12 * 0.43",
      "debt_to_income_ratio = total_debt / annual_income * 100",
    ],
  },
  manufacturing: {
    name: "Manufacturing", 
    compliance: ["ISO-9001"],
    realism_accuracy: 0.992,
    business_rules: [
      "process_parameters within specification limits",
      "quality_control correlates with process variations",
      "safety_compliance within thresholds",
    ],
  },
  general: {
    name: "General",
    compliance: ["GDPR", "CCPA"],
    realism_accuracy: 0.94,
    business_rules: [],
  },
} as const

// File Types
export const ALLOWED_FILE_TYPES = [
  'csv', 'json', 'parquet', 'xlsx', 'xls'
] as const

export const FILE_TYPE_DESCRIPTIONS = {
  csv: "Comma-separated values",
  json: "JavaScript Object Notation",
  parquet: "Apache Parquet (columnar storage)",
  xlsx: "Excel spreadsheet",
  xls: "Legacy Excel format",
} as const

// Generation Strategies
export const GENERATION_STRATEGIES = {
  fast: {
    name: "Fast Generation",
    description: "Optimized for speed",
    recommended_model: "gpt-3.5-turbo",
  },
  balanced: {
    name: "Balanced",
    description: "Balance of speed and accuracy",
    recommended_model: "claude-3-sonnet",
  },
  accuracy: {
    name: "Maximum Accuracy",
    description: "Optimized for highest quality",
    recommended_model: "claude-3-opus",
  },
  hybrid: {
    name: "Hybrid",
    description: "AI chooses optimal approach",
    recommended_model: "auto",
  },
} as const

// Status Types
export const GENERATION_STATUS = {
  pending: { label: "Pending", color: "gray" },
  processing: { label: "Processing", color: "blue" },
  completed: { label: "Completed", color: "green" },
  failed: { label: "Failed", color: "red" },
  cancelled: { label: "Cancelled", color: "gray" },
} as const

export const DATASET_STATUS = {
  uploading: { label: "Uploading", color: "blue" },
  processing: { label: "Processing", color: "yellow" },
  ready: { label: "Ready", color: "green" },
  error: { label: "Error", color: "red" },
} as const

// Navigation Items
export const NAVIGATION_ITEMS = [
  {
    name: "Dashboard",
    href: "/dashboard", 
    icon: "LayoutDashboard",
    description: "Overview and analytics",
    tier_required: "free",
  },
  {
    name: "Datasets",
    href: "/datasets",
    icon: "Database",
    description: "Manage your datasets",
    tier_required: "free",
  },
  {
    name: "Generation",
    href: "/datasets",
    icon: "Wand2",
    description: "Generate synthetic data",
    tier_required: "free",
  },
  {
    name: "Models",
    href: "/custom-models",
    icon: "Brain",
    description: "Custom AI models",
    tier_required: "growth",
  },
  {
    name: "API Keys", 
    href: "/api",
    icon: "Key",
    description: "Manage API access",
    tier_required: "professional",
  },
  {
    name: "Billing",
    href: "/billing",
    icon: "CreditCard",
    description: "Subscription and usage",
    tier_required: "free",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: "Settings",
    description: "Account preferences",
    tier_required: "free",
  },
] as const

// Support Tiers
export const SUPPORT_TIERS = {
  community: {
    name: "Community Support",
    response_time: "Best effort",
    channels: ["GitHub Issues", "Documentation"],
  },
  email: {
    name: "Email Support",
    response_time: "48 hours",
    channels: ["Email", "GitHub Issues"],
  },
  priority: {
    name: "Priority Support", 
    response_time: "4 hours",
    channels: ["Email", "Live Chat", "Phone"],
  },
  enterprise: {
    name: "Enterprise Support",
    response_time: "1 hour",
    channels: ["Dedicated Support", "Phone", "Video Calls", "On-site"],
    sla: "99.9% uptime guarantee",
  },
} as const

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  UNAUTHORIZED: "Your session has expired. Please log in again.",
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  SERVER_ERROR: "Server error. Please try again later.",
  VALIDATION_ERROR: "Please check your input and try again.",
  FILE_TOO_LARGE: "File size exceeds the maximum limit.",
  INVALID_FILE_TYPE: "Invalid file type. Please upload a supported format.",
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  DATASET_UPLOADED: 'Dataset uploaded successfully!',
  GENERATION_STARTED: 'Synthetic data generation started!',
  MODEL_UPLOADED: 'Custom model uploaded successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PASSWORD_CHANGED: 'Password changed successfully!',
  SUBSCRIPTION_UPDATED: 'Subscription updated successfully!',
} as const

// Chart Colors
export const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#ec4899', // pink-500
] as const 