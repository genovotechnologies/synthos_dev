# Payment System Setup Guide

This guide explains how to set up and configure the beautiful payment system for Synthos, supporting both Stripe and Paddle payment providers.

## 🎨 Features

- **Beautiful Modern UI**: Gradient cards, smooth animations, and professional design
- **Dual Payment Providers**: Support for both Stripe and Paddle
- **Real-time Subscription Management**: Cancel, reactivate, and monitor usage
- **Provider Selection**: Users can choose between payment providers
- **Enterprise Support**: Custom contact forms for enterprise plans
- **Mobile Responsive**: Optimized for all device sizes
- **Loading States**: Elegant loading animations and error handling

## 🚀 Components Created

### Core Components

1. **PaymentPlans** - Beautiful pricing cards with provider selection
2. **StripeCheckout** - Secure Stripe payment integration
3. **PaddleCheckout** - Global Paddle payment integration  
4. **PaymentPage** - Complete payment flow orchestration
5. **SubscriptionManager** - Subscription management dashboard

### Pages

- `/payment` - Main payment selection and checkout
- `/subscription` - Subscription management dashboard

## 🔧 Environment Variables

Create a `.env.local` file in your frontend directory with:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Paddle Configuration  
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your_paddle_client_token_here
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
```

## 🎯 Usage

### 1. Viewing Payment Plans

```tsx
import { PaymentPlans } from '@/components/Payment'

function PricingPage() {
  return (
    <PaymentPlans
      plans={plans}
      onSelectPlan={(planId, provider) => {
        // Handle plan selection
      }}
      currentPlan="starter"
    />
  )
}
```

### 2. Complete Payment Flow

```tsx
import { PaymentPage } from '@/components/Payment'

function CheckoutPage() {
  return (
    <PaymentPage
      onSuccess={() => {
        // Redirect to dashboard
        router.push('/dashboard')
      }}
    />
  )
}
```

### 3. Subscription Management

```tsx
import { SubscriptionManager } from '@/components/Payment'

function SubscriptionPage() {
  return (
    <SubscriptionManager
      onUpgrade={() => {
        // Navigate to upgrade flow
        router.push('/payment')
      }}
    />
  )
}
```

## 🔌 Backend Integration

The frontend expects these API endpoints:

### Plans
- `GET /api/v1/payment/plans` - Fetch available plans

### Checkout
- `POST /api/v1/payment/create-checkout-session` - Create checkout session

### Subscription Management
- `GET /api/v1/payment/subscription` - Get current subscription
- `POST /api/v1/payment/cancel-subscription` - Cancel subscription
- `POST /api/v1/payment/reactivate-subscription` - Reactivate subscription

## 🎨 Design System

### Color Scheme
- **Primary**: Blue gradient (`bg-primary-500` to `bg-primary-600`)
- **Secondary**: Purple gradient (`bg-purple-500` to `bg-purple-600`) 
- **Success**: Green (`bg-success-500`)
- **Error**: Red (`bg-error-500`)
- **Warning**: Yellow (`bg-warning-500`)

### Animations
- **Framer Motion**: Smooth page transitions and micro-interactions
- **Hover Effects**: Cards lift and scale on hover
- **Loading States**: Spinning indicators and skeleton loaders

### Typography
- **Headings**: Bold, large text with proper hierarchy
- **Body**: Clean, readable text with good contrast
- **Price Display**: Large, prominent pricing information

## 🔐 Security Features

- **PCI Compliance**: Both Stripe and Paddle handle sensitive data
- **SSL Encryption**: All transactions are encrypted
- **Token-based Auth**: Secure API communication
- **Input Validation**: Client and server-side validation

## 📱 Mobile Experience

- **Responsive Design**: Works perfectly on all screen sizes
- **Touch Friendly**: Large buttons and easy navigation
- **Fast Loading**: Optimized images and lazy loading

## 🛠️ Development

### Running Locally

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Set up environment variables (see above)

3. Start the development server:
```bash
npm run dev
```

4. Visit payment pages:
- `http://localhost:3000/payment` - Payment flow
- `http://localhost:3000/subscription` - Subscription management

### Building for Production

```bash
npm run build
npm start
```

## 🎯 Best Practices

1. **Error Handling**: All components include proper error states
2. **Loading States**: Show loading indicators during API calls
3. **Accessibility**: ARIA labels and keyboard navigation
4. **SEO**: Proper meta tags and structured data
5. **Analytics**: Track payment events and conversions

## 🚀 Deployment

1. Set production environment variables
2. Configure payment provider webhooks
3. Test payment flows in staging
4. Deploy to production
5. Monitor payment success rates

## 📊 Monitoring

Track these key metrics:
- Payment success rate
- Provider performance comparison
- Subscription churn rate
- Revenue growth
- Error rates

The payment system is now ready to handle enterprise-scale transactions with a beautiful, professional user experience! 🎉 