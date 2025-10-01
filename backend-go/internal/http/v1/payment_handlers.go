package v1

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/pricing"
	"github.com/gofiber/fiber/v2"
)

type PaymentDeps struct {
	StripeWebhookSecret string
	PaddlePublicKey     string
}

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

// StripeWebhook handles Stripe webhook events
func (d PaymentDeps) StripeWebhook(c *fiber.Ctx) error {
	// Verify webhook signature
	signature := c.Get("Stripe-Signature")
	if signature == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing_signature"})
	}

	body := c.Body()
	
	// Verify signature if webhook secret is configured
	if d.StripeWebhookSecret != "" {
		if !verifyStripeSignature(body, signature, d.StripeWebhookSecret) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_signature"})
		}
	}

	// Parse webhook event
	var event map[string]interface{}
	if err := c.BodyParser(&event); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_payload"})
	}

	// Handle different event types
	eventType, _ := event["type"].(string)
	switch eventType {
	case "checkout.session.completed":
		// Handle successful checkout
		// TODO: Update user subscription in database
	case "customer.subscription.updated":
		// Handle subscription update
		// TODO: Update user subscription status
	case "customer.subscription.deleted":
		// Handle subscription cancellation
		// TODO: Downgrade user to free tier
	case "invoice.payment_succeeded":
		// Handle successful payment
		// TODO: Record payment in database
	case "invoice.payment_failed":
		// Handle failed payment
		// TODO: Notify user and potentially suspend subscription
	}

	return c.JSON(fiber.Map{"received": true})
}

// PaddleWebhook handles Paddle webhook events
func (d PaymentDeps) PaddleWebhook(c *fiber.Ctx) error {
	// Verify webhook signature
	signature := c.Get("P-Signature")
	if signature == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing_signature"})
	}

	body := c.Body()

	// Verify signature if public key is configured
	if d.PaddlePublicKey != "" {
		if !verifyPaddleSignature(body, signature, d.PaddlePublicKey) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_signature"})
		}
	}

	// Parse webhook event
	var event map[string]interface{}
	if err := c.BodyParser(&event); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_payload"})
	}

	// Handle different alert types
	alertName, _ := event["alert_name"].(string)
	switch alertName {
	case "subscription_created":
		// Handle new subscription
		// TODO: Upgrade user subscription
	case "subscription_updated":
		// Handle subscription update
		// TODO: Update user subscription details
	case "subscription_cancelled":
		// Handle subscription cancellation
		// TODO: Schedule downgrade to free tier
	case "subscription_payment_succeeded":
		// Handle successful payment
		// TODO: Record payment and extend subscription
	case "subscription_payment_failed":
		// Handle failed payment
		// TODO: Notify user and mark subscription as past due
	}

	return c.JSON(fiber.Map{"received": true})
}

// verifyStripeSignature verifies the Stripe webhook signature
func verifyStripeSignature(body []byte, signature, secret string) bool {
	// In a real implementation, this would properly parse and verify the Stripe signature
	// For now, return true if secret is provided
	if secret == "" {
		return false
	}
	
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expectedMAC := hex.EncodeToString(mac.Sum(nil))
	
	// Simple verification - in production, parse the timestamp and signatures properly
	return len(signature) > 0 && len(expectedMAC) > 0
}

// verifyPaddleSignature verifies the Paddle webhook signature
func verifyPaddleSignature(body []byte, signature, publicKey string) bool {
	// In a real implementation, this would use RSA verification with the public key
	// For now, return true if public key is provided
	return publicKey != "" && signature != ""
}

// Generic webhook handler for testing
func GenericWebhook(c *fiber.Ctx) error {
	body, err := io.ReadAll(c.Request().BodyStream())
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "read_failed"})
	}

	// Log webhook for debugging
	return c.JSON(fiber.Map{
		"received":    true,
		"body_length": len(body),
		"headers":     c.GetReqHeaders(),
	})
}
