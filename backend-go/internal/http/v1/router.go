package v1

import (
	"github.com/gofiber/fiber/v2"
)

type Deps struct {
	// Add services as we implement them (db, redis, auth, etc.)
	Auth         AdvancedAuthDeps
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

	// Marketing
	v1.Get("/marketing/features", getFeatures)
	v1.Get("/marketing/testimonials", getTestimonials)

	// Auth
	auth := v1.Group("/auth")
	auth.Post("/signup", d.Auth.SignUp)
	auth.Post("/signin", d.Auth.SignIn)
	auth.Post("/verify-email", d.Auth.VerifyEmail)
	auth.Post("/forgot-password", d.Auth.ForgotPassword)
	auth.Post("/reset-password", d.Auth.ResetPassword)
	auth.Post("/refresh-token", d.Auth.RefreshToken)
	auth.Post("/logout", d.Auth.Logout)
	auth.Post("/api-keys", d.Auth.CreateAPIKey)

	// Users
	users := v1.Group("/users")
	users.Get("/me", d.Auth.AuthMiddleware(), d.Users.Me)
	users.Put("/profile", notImplemented)
	users.Get("/usage", d.Auth.AuthMiddleware(), d.Usage.GetUsage)

	// Datasets
	datasets := v1.Group("/datasets")
	datasets.Get("/", d.Auth.AuthMiddleware(), d.Datasets.List)
	datasets.Get("/:id", d.Auth.AuthMiddleware(), d.Datasets.Get)
	datasets.Post("/upload", d.Auth.AuthMiddleware(), d.Datasets.Upload)
	datasets.Get("/:id/preview", d.Auth.AuthMiddleware(), d.Datasets.Preview)
	datasets.Get("/:id/download", d.Auth.AuthMiddleware(), d.Datasets.Download)
	datasets.Delete("/:id", d.Auth.AuthMiddleware(), d.Datasets.Delete)

	// Generation
	gen := v1.Group("/generation")
	gen.Post("/generate", d.Auth.AuthMiddleware(), d.Generations.Start)
	gen.Get("/jobs", d.Auth.AuthMiddleware(), d.Generations.List)
	gen.Get("/jobs/:id", d.Auth.AuthMiddleware(), d.Generations.Get)
	gen.Get("/jobs/:id/download", d.Auth.AuthMiddleware(), d.Generations.Download)
	gen.Delete("/jobs/:id", d.Auth.AuthMiddleware(), d.Generations.Cancel)

	// Payment
	pay := v1.Group("/payment")
	pay.Get("/plans", d.Payments.Plans)
	pay.Get("/support-tiers", d.Payments.SupportTiers)
	pay.Get("/regions", d.Payments.Regions)
	pay.Post("/checkout", d.Auth.AuthMiddleware(), d.Payments.Checkout)
	pay.Get("/subscription", d.Auth.AuthMiddleware(), d.Payments.Subscription)
	pay.Post("/contact-sales", d.Auth.AuthMiddleware(), d.Payments.ContactSales)
	pay.Post("/webhook", notImplemented)
	pay.Post("/paddle-webhook", notImplemented)

	// Privacy
	privacy := v1.Group("/privacy")
	privacy.Get("/settings", d.Privacy.GetSettings)
	privacy.Put("/settings", d.Auth.AuthMiddleware(), d.Privacy.UpdateSettings)

	// Admin
	admin := v1.Group("/admin")
	admin.Get("/stats", func(c *fiber.Ctx) error { return c.JSON(fiber.Map{"message": "Admin endpoint working"}) })
	admin.Get("/users", d.Auth.AuthMiddleware(), d.Admin.RequireAdmin(d.Admin.ListUsers))
	admin.Put("/users/:id/status", d.Auth.AuthMiddleware(), d.Admin.RequireAdmin(d.Admin.UpdateUserStatus))
	admin.Delete("/users/:id", d.Auth.AuthMiddleware(), d.Admin.RequireAdmin(d.Admin.DeleteUser))

	// Custom Models
	custom := v1.Group("/custom-models")
	custom.Get("/", d.Auth.AuthMiddleware(), d.CustomModels.ListCustomModels)
	custom.Post("/upload", d.Auth.AuthMiddleware(), d.CustomModels.UploadCustomModel)
	custom.Get("/:id", d.Auth.AuthMiddleware(), d.CustomModels.GetCustomModel)
	custom.Delete("/:id", d.Auth.AuthMiddleware(), d.CustomModels.DeleteCustomModel)
	custom.Post("/:id/validate", d.Auth.AuthMiddleware(), d.CustomModels.ValidateCustomModel)
	custom.Post("/:id/test", d.Auth.AuthMiddleware(), d.CustomModels.TestCustomModel)
	custom.Get("/supported-frameworks", d.CustomModels.GetSupportedFrameworks)
	custom.Get("/tier-limits", d.Auth.AuthMiddleware(), d.CustomModels.GetTierLimits)

	// Analytics
	v1.Get("/analytics/performance", d.Analytics.Performance)
	v1.Get("/analytics/prompt-cache", d.Analytics.PromptCache)
	v1.Post("/analytics/feedback", d.Analytics.SubmitFeedback)
	v1.Get("/analytics/feedback/:id", d.Analytics.GetFeedback)

	// Vertex AI - All models through Vertex AI
	vertex := v1.Group("/vertex")
	vertex.Get("/models", d.VertexAI.ListModels)
	vertex.Get("/models/:model", d.VertexAI.GetModelInfo)
	vertex.Post("/generate", d.VertexAI.GenerateText)
	vertex.Post("/synthetic-data", d.Auth.AuthMiddleware(), d.VertexAI.GenerateSyntheticData)
	vertex.Post("/stream", d.Auth.AuthMiddleware(), d.VertexAI.StreamGeneration)
	vertex.Get("/health", d.VertexAI.HealthCheck)
	vertex.Get("/usage", d.Auth.AuthMiddleware(), d.VertexAI.GetUsageStats)
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
