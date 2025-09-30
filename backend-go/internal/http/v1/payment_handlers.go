package v1

import (
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/pricing"
	"github.com/gofiber/fiber/v2"
)

type PaymentDeps struct{}

func (d PaymentDeps) Plans(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"plans":          pricing.SubscriptionPlans(),
		"currency":       "USD",
		"billing_period": "monthly",
	})
}

func (d PaymentDeps) SupportTiers(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"support_tiers": fiber.Map{
			"community":  fiber.Map{"name": "Community", "response_time": "48-72 hours"},
			"priority":   fiber.Map{"name": "Priority", "response_time": "4-8 hours"},
			"enterprise": fiber.Map{"name": "Enterprise", "response_time": "1-2 hours"},
		},
	})
}

func (d PaymentDeps) Regions(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"regions": []fiber.Map{
			{"name": "United States", "region": "us-east-1"},
			{"name": "European Union", "region": "eu-west-1"},
			{"name": "Asia-Pacific", "region": "ap-southeast-1"},
		},
	})
}

func (d PaymentDeps) Checkout(c *fiber.Ctx) error {
	// Placeholder: return a fake URL
	return c.JSON(fiber.Map{"checkout_url": "/billing", "provider": "paddle"})
}

func (d PaymentDeps) Subscription(c *fiber.Ctx) error {
	plans := pricing.SubscriptionPlans()
	return c.JSON(fiber.Map{"tier": plans[0].ID, "status": "active", "monthly_limit": plans[0].MonthlyLimit})
}

func (d PaymentDeps) ContactSales(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "We will contact you within 24 hours."})
}
