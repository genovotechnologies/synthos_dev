 # 🔗 API Integration Guide

The Synthos frontend has been updated to connect seamlessly to the backend API, replacing all mock data with real API calls.

## 🚀 Quick Setup

### 1. Run the Setup Script
```bash
./setup-env.sh
```

### 2. Start Both Services
```bash
# Terminal 1 - Backend
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd frontend  
npm run dev
```

## 🔧 Changes Made

### Pages Updated to Use Real APIs

#### Dashboard (`/dashboard`)
- ✅ **Datasets**: `apiClient.getDatasets()`
- ✅ **User Usage**: `apiClient.getUserUsage()`
- ✅ **Generation Jobs**: `apiClient.getGenerationJobs()`

#### Billing (`/billing`)
- ✅ **Pricing Plans**: `apiClient.getPricingPlans()`
- ✅ **Billing Info**: `apiClient.getBillingInfo()`

#### Admin Panel (`/admin`)
- ✅ **Admin Stats**: `apiClient.getAdminStats()`
- ✅ **User Management**: `apiClient.getUsers()`

#### Data Visualization
- ✅ **Real Data**: Fetches from datasets and generation jobs APIs
- ✅ **Fallback**: Graceful degradation to sample data when APIs unavailable

## 🧪 Testing

1. Start both backend and frontend
2. Check browser DevTools → Network tab
3. Verify API calls to `http://localhost:8000/api/v1/*`
4. Pages should display real data or graceful fallbacks

Your frontend will now seamlessly connect to the backend! 🎉