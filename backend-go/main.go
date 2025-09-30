package main

import (
	"context"
	"log"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"go.uber.org/zap"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/auth"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/cache"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/config"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/db"
	v1 "github.com/genovotechnologies/synthos_dev/backend-go/internal/http/v1"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/logger"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/middleware"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/repo"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/services"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/usage"
)

func main() {
	cfg := config.Load()
	logg, _ := logger.New(cfg.Environment)
	defer logg.Sync()
	sugar := logg.Sugar()

	// Init DB
	database, err := db.New(cfg.DatabaseURL)
	if err != nil {
		logg.Fatal("db init failed", zap.Error(err))
	}
	defer database.SQL.Close()

	// Init Redis
	redisClient, err := cache.New(cfg.RedisURL)
	if err != nil {
		logg.Fatal("redis init failed", zap.Error(err))
	}

	app := fiber.New(fiber.Config{AppName: "Synthos API (Go)"})

	// Basic CORS for now; will harden with config later
	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Join(cfg.CorsOrigins, ","),
		AllowCredentials: true,
		AllowHeaders:     "*",
		AllowMethods:     "GET,POST,PUT,DELETE,PATCH,OPTIONS",
	}))

	// Register security & platform middlewares
	_ = middleware.Register(app, middleware.Options{
		AllowedHosts: cfg.CorsOrigins, // reuse for now or add separate env
		ForceHTTPS:   cfg.Environment == "production",
		RateLimitRPS: 100,
		SessionKey:   cfg.JwtSecret,
		RedisURL:     cfg.RedisURL,
	})

	// Health endpoints
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "healthy"})
	})
	app.Get("/health/ready", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ready"})
	})
	app.Get("/health/live", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "alive"})
	})

	// v1 router scaffold aligned with frontend expectations
	// Create repositories and deps
	userRepo := repo.NewUserRepo(database.SQL)
	_ = userRepo.CreateSchema(context.Background())

	datasetRepo := repo.NewDatasetRepo(database.SQL)
	_ = datasetRepo.CreateSchema(context.Background())

	genRepo := repo.NewGenerationRepo(database.SQL)
	_ = genRepo.CreateSchema(context.Background())

	bl := auth.NewBlacklist(redisClient.Client)
	usageService := usage.NewUsageService(userRepo, genRepo, datasetRepo)

	// Initialize advanced repositories
	userUsageRepo := repo.NewUserUsageRepo(database.SQL)
	_ = userUsageRepo.CreateSchema(context.Background())

	userSubRepo := repo.NewUserSubscriptionRepo(database.SQL)
	_ = userSubRepo.CreateSchema(context.Background())

	apiKeyRepo := repo.NewAPIKeyRepo(database.SQL)
	_ = apiKeyRepo.CreateSchema(context.Background())

	auditLogRepo := repo.NewAuditLogRepo(database.SQL)
	_ = auditLogRepo.CreateSchema(context.Background())

	customModelRepo := repo.NewCustomModelRepo(database.SQL)
	_ = customModelRepo.CreateSchema(context.Background())

	// Initialize advanced auth service
	advancedAuthService := auth.NewAdvancedAuthService(redisClient.Client, bl)

	// Initialize email service
	emailService := services.NewEmailService(
		cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUsername, cfg.SMTPPassword,
		cfg.FromEmail, cfg.FromName,
	)

	// Initialize Vertex AI handlers
	vertexAIHandlers, err := v1.NewVertexAIHandlers(cfg)
	if err != nil {
		logg.Fatal("failed to initialize Vertex AI handlers", zap.Error(err))
	}

	v1.Register(app, v1.Deps{
		Auth: v1.AdvancedAuthDeps{
			Users:        userRepo,
			APIKeys:      apiKeyRepo,
			AuditLogs:    auditLogRepo,
			AuthService:  advancedAuthService,
			EmailService: emailService,
			Blacklist:    bl,
		},
		Users:        v1.UserDeps{Users: userRepo},
		Datasets:     v1.DatasetDeps{Datasets: datasetRepo, Usage: usageService},
		Generations:  v1.GenerationDeps{Generations: genRepo, Usage: usageService},
		Payments:     v1.PaymentDeps{},
		Analytics:    v1.AnalyticsDeps{},
		Privacy:      v1.PrivacyDeps{},
		Admin:        v1.AdminDeps{Users: userRepo},
		Usage:        v1.UsageDeps{Usage: usageService},
		CustomModels: v1.CustomModelDeps{CustomModels: customModelRepo},
		VertexAI:     vertexAIHandlers,
	})

	_ = redisClient // will be used in auth/token blacklist etc.

	addr := ":" + cfg.Port
	sugar.Infof("Starting Synthos Go API on %s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatal(err)
	}
}

// keep file local helpers minimal
