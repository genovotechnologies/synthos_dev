package payments

import (
	"context"
	"fmt"
	"time"
)

// PaymentProvider represents different payment providers
type PaymentProvider string

const (
	ProviderStripe PaymentProvider = "stripe"
	ProviderPaddle PaymentProvider = "paddle"
)

// PaymentStatus represents the status of a payment
type PaymentStatus string

const (
	StatusPending   PaymentStatus = "pending"
	StatusCompleted PaymentStatus = "completed"
	StatusFailed    PaymentStatus = "failed"
	StatusCancelled PaymentStatus = "cancelled"
	StatusRefunded  PaymentStatus = "refunded"
)

// SubscriptionStatus represents the status of a subscription
type SubscriptionStatus string

const (
	SubStatusActive    SubscriptionStatus = "active"
	SubStatusInactive  SubscriptionStatus = "inactive"
	SubStatusCancelled SubscriptionStatus = "cancelled"
	SubStatusPaused    SubscriptionStatus = "paused"
	SubStatusPastDue   SubscriptionStatus = "past_due"
)

// PricingTier represents a pricing tier
type PricingTier string

const (
	TierFree         PricingTier = "free"
	TierStarter      PricingTier = "starter"
	TierProfessional PricingTier = "professional"
	TierGrowth       PricingTier = "growth"
	TierEnterprise   PricingTier = "enterprise"
)

// PaymentPlan represents a payment plan
type PaymentPlan struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Tier        PricingTier `json:"tier"`
	Price       float64     `json:"price"`
	Currency    string      `json:"currency"`
	Interval    string      `json:"interval"` // monthly, yearly
	Features    []string    `json:"features"`
	Limits      PlanLimits  `json:"limits"`
	Active      bool        `json:"active"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

// PlanLimits represents the limits of a plan
type PlanLimits struct {
	MonthlyRows     int64    `json:"monthly_rows"`
	APIRequests     int64    `json:"api_requests"`
	StorageGB       int64    `json:"storage_gb"`
	CustomModels    int      `json:"custom_models"`
	ConcurrentJobs  int      `json:"concurrent_jobs"`
	SupportLevel    string   `json:"support_level"`
	RetentionDays   int      `json:"retention_days"`
	ExportFormats   []string `json:"export_formats"`
	AdvancedPrivacy bool     `json:"advanced_privacy"`
	WhiteLabel      bool     `json:"white_label"`
}

// Payment represents a payment transaction
type Payment struct {
	ID          string                 `json:"id"`
	UserID      string                 `json:"user_id"`
	PlanID      string                 `json:"plan_id"`
	Amount      float64                `json:"amount"`
	Currency    string                 `json:"currency"`
	Status      PaymentStatus          `json:"status"`
	Provider    PaymentProvider        `json:"provider"`
	ProviderID  string                 `json:"provider_id"`
	CheckoutURL string                 `json:"checkout_url,omitempty"`
	WebhookURL  string                 `json:"webhook_url,omitempty"`
	Metadata    map[string]interface{} `json:"metadata"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
	CompletedAt *time.Time             `json:"completed_at,omitempty"`
}

// Subscription represents a user subscription
type Subscription struct {
	ID                 string                 `json:"id"`
	UserID             string                 `json:"user_id"`
	PlanID             string                 `json:"plan_id"`
	Status             SubscriptionStatus     `json:"status"`
	Provider           PaymentProvider        `json:"provider"`
	ProviderID         string                 `json:"provider_id"`
	CurrentPeriodStart time.Time              `json:"current_period_start"`
	CurrentPeriodEnd   time.Time              `json:"current_period_end"`
	CancelAtPeriodEnd  bool                   `json:"cancel_at_period_end"`
	Metadata           map[string]interface{} `json:"metadata"`
	CreatedAt          time.Time              `json:"created_at"`
	UpdatedAt          time.Time              `json:"updated_at"`
}

// PaymentService handles payment operations
type PaymentService struct {
	stripeClient  *StripeClient
	paddleClient  *PaddleClient
	plans         map[string]*PaymentPlan
	payments      map[string]*Payment
	subscriptions map[string]*Subscription
}

// NewPaymentService creates a new payment service
func NewPaymentService(stripeSecretKey, paddleVendorID, paddleVendorAuthCode string) *PaymentService {
	return &PaymentService{
		stripeClient:  NewStripeClient(stripeSecretKey),
		paddleClient:  NewPaddleClient(paddleVendorID, paddleVendorAuthCode),
		plans:         make(map[string]*PaymentPlan),
		payments:      make(map[string]*Payment),
		subscriptions: make(map[string]*Subscription),
	}
}

// InitializePlans initializes the default pricing plans
func (ps *PaymentService) InitializePlans() {
	plans := []*PaymentPlan{
		{
			ID:          "free",
			Name:        "Free",
			Description: "Perfect for getting started",
			Tier:        TierFree,
			Price:       0.0,
			Currency:    "USD",
			Interval:    "monthly",
			Features:    []string{"Basic generation", "Watermarked data", "Community support"},
			Limits: PlanLimits{
				MonthlyRows:     10000,
				APIRequests:     1000,
				StorageGB:       1,
				CustomModels:    0,
				ConcurrentJobs:  1,
				SupportLevel:    "community",
				RetentionDays:   30,
				ExportFormats:   []string{"csv", "json"},
				AdvancedPrivacy: false,
				WhiteLabel:      false,
			},
			Active:    true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:          "starter",
			Name:        "Starter",
			Description: "For small teams and projects",
			Tier:        TierStarter,
			Price:       99.0,
			Currency:    "USD",
			Interval:    "monthly",
			Features:    []string{"Advanced generation", "No watermarks", "Email support", "API access"},
			Limits: PlanLimits{
				MonthlyRows:     50000,
				APIRequests:     10000,
				StorageGB:       10,
				CustomModels:    0,
				ConcurrentJobs:  3,
				SupportLevel:    "email",
				RetentionDays:   90,
				ExportFormats:   []string{"csv", "json", "parquet"},
				AdvancedPrivacy: true,
				WhiteLabel:      false,
			},
			Active:    true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:          "professional",
			Name:        "Professional",
			Description: "For growing businesses",
			Tier:        TierProfessional,
			Price:       599.0,
			Currency:    "USD",
			Interval:    "monthly",
			Features:    []string{"Premium generation", "Priority support", "Advanced analytics", "Custom integrations"},
			Limits: PlanLimits{
				MonthlyRows:     1000000,
				APIRequests:     100000,
				StorageGB:       100,
				CustomModels:    5,
				ConcurrentJobs:  10,
				SupportLevel:    "priority",
				RetentionDays:   365,
				ExportFormats:   []string{"csv", "json", "parquet", "avro"},
				AdvancedPrivacy: true,
				WhiteLabel:      true,
			},
			Active:    true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:          "growth",
			Name:        "Growth",
			Description: "For scaling organizations",
			Tier:        TierGrowth,
			Price:       1299.0,
			Currency:    "USD",
			Interval:    "monthly",
			Features:    []string{"Enterprise features", "Custom models", "Dedicated support", "SLA guarantee"},
			Limits: PlanLimits{
				MonthlyRows:     5000000,
				APIRequests:     500000,
				StorageGB:       500,
				CustomModels:    20,
				ConcurrentJobs:  25,
				SupportLevel:    "dedicated",
				RetentionDays:   2555,
				ExportFormats:   []string{"csv", "json", "parquet", "avro", "hdf5"},
				AdvancedPrivacy: true,
				WhiteLabel:      true,
			},
			Active:    true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:          "enterprise",
			Name:        "Enterprise",
			Description: "Custom solutions for large organizations",
			Tier:        TierEnterprise,
			Price:       0.0, // Custom pricing
			Currency:    "USD",
			Interval:    "custom",
			Features:    []string{"Unlimited everything", "On-premise deployment", "Custom integrations", "24/7 support"},
			Limits: PlanLimits{
				MonthlyRows:     -1, // Unlimited
				APIRequests:     -1, // Unlimited
				StorageGB:       -1, // Unlimited
				CustomModels:    -1, // Unlimited
				ConcurrentJobs:  -1, // Unlimited
				SupportLevel:    "24/7",
				RetentionDays:   2555,
				ExportFormats:   []string{"csv", "json", "parquet", "avro", "hdf5", "custom"},
				AdvancedPrivacy: true,
				WhiteLabel:      true,
			},
			Active:    true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	for _, plan := range plans {
		ps.plans[plan.ID] = plan
	}
}

// GetPlans returns all available payment plans
func (ps *PaymentService) GetPlans() []*PaymentPlan {
	var plans []*PaymentPlan
	for _, plan := range ps.plans {
		if plan.Active {
			plans = append(plans, plan)
		}
	}
	return plans
}

// GetPlan returns a specific payment plan
func (ps *PaymentService) GetPlan(planID string) (*PaymentPlan, error) {
	plan, exists := ps.plans[planID]
	if !exists {
		return nil, fmt.Errorf("plan not found: %s", planID)
	}
	return plan, nil
}

// CreateCheckout creates a checkout session
func (ps *PaymentService) CreateCheckout(ctx context.Context, userID, planID string, provider PaymentProvider) (*Payment, error) {
	plan, err := ps.GetPlan(planID)
	if err != nil {
		return nil, err
	}

	payment := &Payment{
		ID:        generatePaymentID(),
		UserID:    userID,
		PlanID:    planID,
		Amount:    plan.Price,
		Currency:  plan.Currency,
		Status:    StatusPending,
		Provider:  provider,
		Metadata:  make(map[string]interface{}),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Create checkout session based on provider
	switch provider {
	case ProviderStripe:
		checkoutURL, err := ps.stripeClient.CreateCheckoutSession(ctx, payment)
		if err != nil {
			return nil, fmt.Errorf("failed to create Stripe checkout: %w", err)
		}
		payment.CheckoutURL = checkoutURL

	case ProviderPaddle:
		checkoutURL, err := ps.paddleClient.CreateCheckoutSession(ctx, payment)
		if err != nil {
			return nil, fmt.Errorf("failed to create Paddle checkout: %w", err)
		}
		payment.CheckoutURL = checkoutURL

	default:
		return nil, fmt.Errorf("unsupported payment provider: %s", provider)
	}

	ps.payments[payment.ID] = payment
	return payment, nil
}

// ProcessWebhook processes a payment webhook
func (ps *PaymentService) ProcessWebhook(ctx context.Context, provider PaymentProvider, payload []byte, signature string) error {
	switch provider {
	case ProviderStripe:
		return ps.stripeClient.ProcessWebhook(ctx, payload, signature)
	case ProviderPaddle:
		return ps.paddleClient.ProcessWebhook(ctx, payload, signature)
	default:
		return fmt.Errorf("unsupported payment provider: %s", provider)
	}
}

// GetSubscription returns a user's subscription
func (ps *PaymentService) GetSubscription(userID string) (*Subscription, error) {
	for _, sub := range ps.subscriptions {
		if sub.UserID == userID {
			return sub, nil
		}
	}
	return nil, fmt.Errorf("subscription not found for user: %s", userID)
}

// CancelSubscription cancels a user's subscription
func (ps *PaymentService) CancelSubscription(ctx context.Context, userID string, cancelAtPeriodEnd bool) error {
	subscription, err := ps.GetSubscription(userID)
	if err != nil {
		return err
	}

	subscription.CancelAtPeriodEnd = cancelAtPeriodEnd
	subscription.UpdatedAt = time.Now()

	if !cancelAtPeriodEnd {
		subscription.Status = SubStatusCancelled
	}

	// Cancel with provider
	switch subscription.Provider {
	case ProviderStripe:
		return ps.stripeClient.CancelSubscription(ctx, subscription.ProviderID, cancelAtPeriodEnd)
	case ProviderPaddle:
		return ps.paddleClient.CancelSubscription(ctx, subscription.ProviderID, cancelAtPeriodEnd)
	}

	return nil
}

// GetPaymentHistory returns payment history for a user
func (ps *PaymentService) GetPaymentHistory(userID string) ([]*Payment, error) {
	var userPayments []*Payment
	for _, payment := range ps.payments {
		if payment.UserID == userID {
			userPayments = append(userPayments, payment)
		}
	}
	return userPayments, nil
}

// RefundPayment refunds a payment
func (ps *PaymentService) RefundPayment(ctx context.Context, paymentID string, amount float64) error {
	payment, exists := ps.payments[paymentID]
	if !exists {
		return fmt.Errorf("payment not found: %s", paymentID)
	}

	// Process refund with provider
	switch payment.Provider {
	case ProviderStripe:
		return ps.stripeClient.RefundPayment(ctx, payment.ProviderID, amount)
	case ProviderPaddle:
		return ps.paddleClient.RefundPayment(ctx, payment.ProviderID, amount)
	}

	// Update payment status
	payment.Status = StatusRefunded
	payment.UpdatedAt = time.Now()

	return nil
}

// GetUsageStats returns usage statistics for billing
func (ps *PaymentService) GetUsageStats(userID string) (map[string]interface{}, error) {
	subscription, err := ps.GetSubscription(userID)
	if err != nil {
		return nil, err
	}

	plan, err := ps.GetPlan(subscription.PlanID)
	if err != nil {
		return nil, err
	}

	// This would typically query your usage tracking system
	stats := map[string]interface{}{
		"user_id":           userID,
		"plan_id":           subscription.PlanID,
		"plan_name":         plan.Name,
		"monthly_rows_used": 0, // Would be calculated from actual usage
		"api_requests_used": 0, // Would be calculated from actual usage
		"storage_used_gb":   0, // Would be calculated from actual usage
		"limits":            plan.Limits,
		"billing_period": map[string]interface{}{
			"start": subscription.CurrentPeriodStart,
			"end":   subscription.CurrentPeriodEnd,
		},
	}

	return stats, nil
}

// StripeClient handles Stripe payment operations
type StripeClient struct {
	secretKey string
}

// NewStripeClient creates a new Stripe client
func NewStripeClient(secretKey string) *StripeClient {
	return &StripeClient{
		secretKey: secretKey,
	}
}

// CreateCheckoutSession creates a Stripe checkout session
func (sc *StripeClient) CreateCheckoutSession(ctx context.Context, payment *Payment) (string, error) {
	// This would integrate with the actual Stripe API
	// For now, return a mock checkout URL
	return fmt.Sprintf("https://checkout.stripe.com/mock/%s", payment.ID), nil
}

// ProcessWebhook processes a Stripe webhook
func (sc *StripeClient) ProcessWebhook(ctx context.Context, payload []byte, signature string) error {
	// This would verify the webhook signature and process the event
	// For now, just log the event
	fmt.Printf("Processing Stripe webhook: %s\n", string(payload))
	return nil
}

// CancelSubscription cancels a Stripe subscription
func (sc *StripeClient) CancelSubscription(ctx context.Context, subscriptionID string, cancelAtPeriodEnd bool) error {
	// This would call the Stripe API to cancel the subscription
	fmt.Printf("Cancelling Stripe subscription: %s\n", subscriptionID)
	return nil
}

// RefundPayment refunds a Stripe payment
func (sc *StripeClient) RefundPayment(ctx context.Context, paymentIntentID string, amount float64) error {
	// This would call the Stripe API to process the refund
	fmt.Printf("Refunding Stripe payment: %s, amount: %.2f\n", paymentIntentID, amount)
	return nil
}

// PaddleClient handles Paddle payment operations
type PaddleClient struct {
	vendorID       string
	vendorAuthCode string
}

// NewPaddleClient creates a new Paddle client
func NewPaddleClient(vendorID, vendorAuthCode string) *PaddleClient {
	return &PaddleClient{
		vendorID:       vendorID,
		vendorAuthCode: vendorAuthCode,
	}
}

// CreateCheckoutSession creates a Paddle checkout session
func (pc *PaddleClient) CreateCheckoutSession(ctx context.Context, payment *Payment) (string, error) {
	// This would integrate with the actual Paddle API
	// For now, return a mock checkout URL
	return fmt.Sprintf("https://checkout.paddle.com/mock/%s", payment.ID), nil
}

// ProcessWebhook processes a Paddle webhook
func (pc *PaddleClient) ProcessWebhook(ctx context.Context, payload []byte, signature string) error {
	// This would verify the webhook signature and process the event
	// For now, just log the event
	fmt.Printf("Processing Paddle webhook: %s\n", string(payload))
	return nil
}

// CancelSubscription cancels a Paddle subscription
func (pc *PaddleClient) CancelSubscription(ctx context.Context, subscriptionID string, cancelAtPeriodEnd bool) error {
	// This would call the Paddle API to cancel the subscription
	fmt.Printf("Cancelling Paddle subscription: %s\n", subscriptionID)
	return nil
}

// RefundPayment refunds a Paddle payment
func (pc *PaddleClient) RefundPayment(ctx context.Context, transactionID string, amount float64) error {
	// This would call the Paddle API to process the refund
	fmt.Printf("Refunding Paddle payment: %s, amount: %.2f\n", transactionID, amount)
	return nil
}

// generatePaymentID generates a unique payment ID
func generatePaymentID() string {
	return fmt.Sprintf("pay_%d", time.Now().UnixNano())
}
