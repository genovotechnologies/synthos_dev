package v1

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

type Deps struct {
	// Add services as we implement them (db, redis, auth, etc.)
	Auth         AuthDeps
	Users        UserDeps
	Datasets     DatasetDeps
	Generations  GenerationDeps
	Payments     PaymentDeps
	Analytics    AnalyticsDeps
	Privacy      PrivacyDeps
	Admin        AdminDeps
	Usage        UsageDeps
	CustomModels CustomModelDeps
	VertexAI     *VertexAIHandlers
}

func Register(app *fiber.App, d Deps) {
	v1 := app.Group("/api/v1")

	// API Docs
	v1.Get("/docs", APIDocs)

	// Marketing
	v1.Get("/marketing/features", getFeatures)
	v1.Get("/marketing/testimonials", getTestimonials)

	// Auth
	auth := v1.Group("/auth")
	auth.Post("/signup", d.Auth.SignUp)
	auth.Post("/signin", d.Auth.SignIn)
	auth.Post("/refresh", d.Auth.RefreshToken)
	auth.Post("/logout", d.Auth.Logout)
	// Password reset and API keys
	auth.Post("/forgot-password", d.Auth.ForgotPassword)
	auth.Post("/reset-password", d.Auth.ResetPassword)
	auth.Post("/api-keys", d.Auth.CreateAPIKey)

	// Users
	users := v1.Group("/users")
	users.Get("/me", d.Users.Me)
	users.Put("/profile", notImplemented)
	users.Get("/usage", d.Usage.GetUsage)

	// Datasets
	datasets := v1.Group("/datasets")
	datasets.Get("/", d.Datasets.List)
	datasets.Get("/:id", d.Datasets.Get)
	datasets.Post("/upload", d.Datasets.Upload)
	datasets.Get("/:id/preview", d.Datasets.Preview)
	datasets.Get("/:id/download", d.Datasets.Download)
	datasets.Delete("/:id", d.Datasets.Delete)

	// Generation
	gen := v1.Group("/generation")
	gen.Post("/generate", d.Generations.Start)
	gen.Get("/jobs", d.Generations.List)
	gen.Get("/jobs/:id", d.Generations.Get)
	gen.Get("/jobs/:id/download", d.Generations.Download)
	gen.Delete("/jobs/:id", d.Generations.Cancel)

	// Payment
	pay := v1.Group("/payment")
	pay.Get("/plans", d.Payments.Plans)
	pay.Get("/support-tiers", d.Payments.SupportTiers)
	pay.Get("/regions", d.Payments.Regions)
	pay.Post("/checkout", d.Payments.Checkout)
	pay.Get("/subscription", d.Payments.Subscription)
	pay.Post("/contact-sales", d.Payments.ContactSales)
	pay.Post("/webhook", notImplemented)
	pay.Post("/paddle-webhook", notImplemented)

	// Privacy
	privacy := v1.Group("/privacy")
	privacy.Get("/settings", d.Privacy.GetSettings)
	privacy.Put("/settings") // d.Auth.AuthMiddleware(), d.Privacy.UpdateSettings)

	// Admin
	admin := v1.Group("/admin")
	admin.Get("/stats", func(c *fiber.Ctx) error { return c.JSON(fiber.Map{"message": "Admin endpoint working"}) })
	admin.Get("/users", d.Admin.RequireAdmin(d.Admin.ListUsers))
	admin.Put("/users/:id/status", d.Admin.RequireAdmin(d.Admin.UpdateUserStatus))
	admin.Delete("/users/:id", d.Admin.RequireAdmin(d.Admin.DeleteUser))

	// Custom Models
	custom := v1.Group("/custom-models")
	custom.Get("/", d.CustomModels.ListCustomModels)
	custom.Post("/upload", d.CustomModels.UploadFile)
	custom.Get("/:id", d.CustomModels.GetCustomModel)
	custom.Delete("/:id", d.CustomModels.DeleteCustomModel)
	custom.Post("/:id/validate") // d.Auth.AuthMiddleware(), d.CustomModels.ValidateCustomModel)
	custom.Post("/:id/test")     // d.Auth.AuthMiddleware(), d.CustomModels.TestCustomModel)
	custom.Get("/supported-frameworks", d.CustomModels.GetSupportedFrameworks)
	custom.Get("/tier-limits") // d.Auth.AuthMiddleware(), d.CustomModels.GetTierLimits)

	// Analytics
	v1.Get("/analytics/performance", d.Analytics.Performance)
	v1.Get("/analytics/prompt-cache", d.Analytics.PromptCache)
	v1.Post("/analytics/feedback", d.Analytics.SubmitFeedback)
	v1.Get("/analytics/feedback/:id", d.Analytics.GetFeedback)
	// FE also calls /feedback endpoints
	v1.Post("/feedback", d.Analytics.SubmitFeedback)
	v1.Get("/feedback/:id", d.Analytics.GetFeedback)

	// Vertex AI - All models through Vertex AI
	vertex := v1.Group("/vertex")
	vertex.Get("/models", d.VertexAI.ListModels)
	vertex.Get("/models/:model", d.VertexAI.GetModelInfo)
	vertex.Post("/generate", d.VertexAI.GenerateText)
	vertex.Post("/synthetic-data", notImplemented)
	vertex.Post("/stream", notImplemented)
	vertex.Get("/health", d.VertexAI.HealthCheck)
	vertex.Get("/usage") // d.Auth.AuthMiddleware(), d.VertexAI.GetUsageStats)
	vertex.Get("/pricing", d.VertexAI.GetModelPricing)
}

func notImplemented(c *fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{"error": "not_implemented"})
}
func emptyArray(c *fiber.Ctx) error { return c.JSON([]any{}) }

func getFeatures(c *fiber.Ctx) error {
	return c.JSON([]fiber.Map{{
		"title": "Smart Data Generation", "description": "Generate high-quality synthetic data that maintains statistical properties", "icon": "database",
	}, {
		"title": "Privacy-First", "description": "Built-in privacy protection with GDPR compliance and differential privacy", "icon": "shield",
	}})
}

func getTestimonials(c *fiber.Ctx) error {
	return c.JSON([]fiber.Map{{
		"name": "CHIBOY", "role": "Data Scientist", "content": "Synthos has revolutionized our data pipeline. The quality is exceptional.", "avatar": "CB",
	}})
}

// APIDocs serves a concise OpenAPI-like JSON for the current routes
func APIDocs(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"openapi": "3.0.0",
		"info": fiber.Map{
			"title":       "Synthos API",
			"version":     "v1",
			"description": "REST API endpoints for authentication, datasets, generation, analytics, payments, admin, and custom models.",
		},
		"servers": []fiber.Map{
			{"url": "/api/v1"},
		},
		"paths": fiber.Map{
			"/auth/signup":          fiber.Map{"post": fiber.Map{"summary": "Create account"}},
			"/auth/signin":          fiber.Map{"post": fiber.Map{"summary": "Sign in"}},
			"/auth/refresh":         fiber.Map{"post": fiber.Map{"summary": "Refresh access token"}},
			"/auth/logout":          fiber.Map{"post": fiber.Map{"summary": "Logout"}},
			"/auth/forgot-password": fiber.Map{"post": fiber.Map{"summary": "Initiate password reset"}},
			"/auth/reset-password":  fiber.Map{"post": fiber.Map{"summary": "Reset password with token"}},
			"/auth/api-keys":        fiber.Map{"post": fiber.Map{"summary": "Create API key"}},

			"/users/me":    fiber.Map{"get": fiber.Map{"summary": "Get current user profile"}},
			"/users/usage": fiber.Map{"get": fiber.Map{"summary": "Get usage stats"}},

			"/datasets":               fiber.Map{"get": fiber.Map{"summary": "List datasets"}},
			"/datasets/upload":        fiber.Map{"post": fiber.Map{"summary": "Upload dataset"}},
			"/datasets/{id}":          fiber.Map{"get": fiber.Map{"summary": "Get dataset"}, "delete": fiber.Map{"summary": "Delete dataset"}},
			"/datasets/{id}/preview":  fiber.Map{"get": fiber.Map{"summary": "Preview dataset"}},
			"/datasets/{id}/download": fiber.Map{"get": fiber.Map{"summary": "Download dataset"}},

			"/generation/generate":           fiber.Map{"post": fiber.Map{"summary": "Start generation"}},
			"/generation/jobs":               fiber.Map{"get": fiber.Map{"summary": "List generation jobs"}},
			"/generation/jobs/{id}":          fiber.Map{"get": fiber.Map{"summary": "Get generation job"}, "delete": fiber.Map{"summary": "Cancel job"}},
			"/generation/jobs/{id}/download": fiber.Map{"get": fiber.Map{"summary": "Download generated data"}},

			"/payment/plans":         fiber.Map{"get": fiber.Map{"summary": "List pricing plans"}},
			"/payment/checkout":      fiber.Map{"post": fiber.Map{"summary": "Create checkout session"}},
			"/payment/subscription":  fiber.Map{"get": fiber.Map{"summary": "Get current subscription"}},
			"/payment/contact-sales": fiber.Map{"post": fiber.Map{"summary": "Contact sales"}},

			"/analytics/performance":   fiber.Map{"get": fiber.Map{"summary": "Get performance analytics"}},
			"/analytics/prompt-cache":  fiber.Map{"get": fiber.Map{"summary": "Get prompt cache stats"}},
			"/analytics/feedback":      fiber.Map{"post": fiber.Map{"summary": "Submit feedback"}},
			"/analytics/feedback/{id}": fiber.Map{"get": fiber.Map{"summary": "Get feedback aggregate"}},
			"/feedback":                fiber.Map{"post": fiber.Map{"summary": "Submit feedback (alias)"}},
			"/feedback/{id}":           fiber.Map{"get": fiber.Map{"summary": "Get feedback (alias)"}},

			"/custom-models":               fiber.Map{"get": fiber.Map{"summary": "List custom models"}},
			"/custom-models/upload":        fiber.Map{"post": fiber.Map{"summary": "Upload custom model file"}},
			"/custom-models/{id}":          fiber.Map{"get": fiber.Map{"summary": "Get custom model"}, "delete": fiber.Map{"summary": "Delete custom model"}},
			"/custom-models/{id}/validate": fiber.Map{"post": fiber.Map{"summary": "Validate custom model"}},
			"/custom-models/{id}/test":     fiber.Map{"post": fiber.Map{"summary": "Test custom model"}},

			"/vertex/models":         fiber.Map{"get": fiber.Map{"summary": "List Vertex models"}},
			"/vertex/models/{model}": fiber.Map{"get": fiber.Map{"summary": "Get model info"}},
			"/vertex/generate":       fiber.Map{"post": fiber.Map{"summary": "Generate using Vertex"}},
			"/vertex/health":         fiber.Map{"get": fiber.Map{"summary": "Vertex health check"}},
			"/vertex/pricing":        fiber.Map{"get": fiber.Map{"summary": "Model pricing"}},
		},
	})
}

// Generic helpers/stubs to satisfy FE contracts while services are wired
func accepted(c *fiber.Ctx) error {
	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"status": "accepted"})
}
func successTrue(c *fiber.Ctx) error { return c.JSON(fiber.Map{"success": true}) }

func getDatasetStub(c *fiber.Ctx) error {
	id := c.Params("id")
	return c.JSON(fiber.Map{"id": id, "name": "Dataset", "row_count": 0})
}
func uploadDatasetStub(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"id": time.Now().Unix(), "status": "completed"})
}
func downloadDatasetStub(c *fiber.Ctx) error {
	id := c.Params("id")
	return c.JSON(fiber.Map{"url": "#", "filename": "dataset_" + id + ".csv"})
}

func startGenerationStub(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"id": time.Now().Unix(), "status": "completed", "progress_percentage": 100})
}
func getGenerationJobStub(c *fiber.Ctx) error {
	id := c.Params("id")
	return c.JSON(fiber.Map{"id": id, "status": "completed", "progress_percentage": 100})
}
func downloadGenerationStub(c *fiber.Ctx) error {
	id := c.Params("id")
	return c.JSON(fiber.Map{"url": "#", "filename": "generated_data_" + id + ".csv"})
}

func checkoutStub(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"session_id": "demo_session", "checkout_url": "/billing"})
}
func subscriptionStub(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"plan": "basic", "status": "active", "next_billing": "2099-12-31"})
}
func getEchoStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	type payload struct {
		Status string `json:"status"`
	}
	var p payload
	_ = c.BodyParser(&p)
	return c.JSON(fiber.Map{"id": id, "status": p.Status})
}

func uploadCustomModelStub(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"id": time.Now().Unix(), "name": "Custom Model", "status": "uploaded"})
}
func getCustomModelStub(c *fiber.Ctx) error {
	id := c.Params("id")
	return c.JSON(fiber.Map{"id": id, "name": "Custom Model"})
}
