package pricing

type Plan struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	Price           int      `json:"price"`
	MonthlyLimit    int      `json:"monthly_limit"`
	Features        []string `json:"features"`
	MaxDatasets     int      `json:"max_datasets"`
	MaxCustomModels int      `json:"max_custom_models"`
	PrioritySupport bool     `json:"priority_support"`
	APIRateLimit    int      `json:"api_rate_limit"`
	StripePriceID   *string  `json:"stripe_price_id,omitempty"`
	PaddleProductID *string  `json:"paddle_product_id,omitempty"`
	MostPopular     bool     `json:"most_popular"`
	Badge           *string  `json:"badge,omitempty"`
}

func SubscriptionPlans() []Plan {
	starterStripe := "price_starter_monthly"
	starterPaddle := "starter_monthly"
	profStripe := "price_professional_monthly"
	profPaddle := "professional_monthly"
	growthStripe := "price_growth_monthly"
	growthPaddle := "growth_monthly"
	entStripe := "price_enterprise_monthly"
	entPaddle := "enterprise_monthly"
	return []Plan{
		{
			ID:           "free",
			Name:         "Free",
			Price:        0,
			MonthlyLimit: 10000,
			Features: []string{
				"Basic generation",
				"Watermarked data",
			},
			MaxDatasets:     5,
			MaxCustomModels: 0,
			PrioritySupport: false,
			APIRateLimit:    100,
		},
		{
			ID:           "starter",
			Name:         "Starter",
			Price:        99,
			MonthlyLimit: 50000,
			Features: []string{
				"Advanced generation",
				"No watermarks",
			},
			MaxDatasets:     15,
			MaxCustomModels: 0,
			PrioritySupport: false,
			APIRateLimit:    500,
			StripePriceID:   &starterStripe,
			PaddleProductID: &starterPaddle,
			MostPopular:     true,
			Badge:           stringPtr("Most Popular"),
		},
		{
			ID:           "professional",
			Name:         "Professional",
			Price:        599,
			MonthlyLimit: 1000000,
			Features: []string{
				"Advanced generation",
				"No watermarks",
				"API access",
			},
			MaxDatasets:     50,
			MaxCustomModels: 0,
			PrioritySupport: true,
			APIRateLimit:    5000,
			StripePriceID:   &profStripe,
			PaddleProductID: &profPaddle,
		},
		{
			ID:           "growth",
			Name:         "Growth",
			Price:        1299,
			MonthlyLimit: 5000000,
			Features: []string{
				"Advanced generation",
				"No watermarks",
				"API access",
				"Custom models",
			},
			MaxDatasets:     100,
			MaxCustomModels: 10,
			PrioritySupport: true,
			APIRateLimit:    10000,
			StripePriceID:   &growthStripe,
			PaddleProductID: &growthPaddle,
		},
		{
			ID:           "enterprise",
			Name:         "Enterprise",
			Price:        0,  // Contact sales
			MonthlyLimit: -1, // Unlimited
			Features: []string{
				"Custom models",
				"Dedicated support",
				"On-premise",
			},
			MaxDatasets:     1000,
			MaxCustomModels: 100,
			PrioritySupport: true,
			APIRateLimit:    100000,
			StripePriceID:   &entStripe,
			PaddleProductID: &entPaddle,
			Badge:           stringPtr("Contact Sales"),
		},
	}
}

type SupportTier struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	ResponseTime string   `json:"response_time"`
	Channels     []string `json:"channels"`
	Features     []string `json:"features"`
}

func SupportTiers() []SupportTier {
	return []SupportTier{
		{ID: "community", Name: "Community Support", ResponseTime: "48-72 hours", Channels: []string{"email", "community_forum"}, Features: []string{"Documentation", "Community forums", "Email support"}},
		{ID: "priority", Name: "Priority Support", ResponseTime: "4-8 hours", Channels: []string{"email", "chat"}, Features: []string{"Priority email", "Live chat", "Phone support"}},
		{ID: "enterprise", Name: "Enterprise Support", ResponseTime: "1-2 hours", Channels: []string{"email", "chat", "phone", "dedicated_slack"}, Features: []string{"24/7 phone support", "Dedicated account manager", "Custom SLA"}},
	}
}

func stringPtr(s string) *string {
	return &s
}
