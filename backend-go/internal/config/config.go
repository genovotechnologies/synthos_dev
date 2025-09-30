package config

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Environment    string
	Port           string
	CorsOrigins    []string
	JwtSecret      string
	JwtAlg         string
	JwtAccessMin   int
	JwtRefreshDays int
	DatabaseURL    string
	RedisURL       string
	EnableSentry   bool
	SentryDSN      string
	StorageBaseURL string

	// AI Provider Configuration
	AnthropicAPIKey    string
	OpenAIAPIKey       string
	VertexProjectID    string
	VertexLocation     string
	VertexAPIKey       string
	VertexDefaultModel string

	// Storage Configuration
	StorageProvider string
	GCPProjectID    string
	GCPLocation     string
	GCSBucket       string
	GCSSignedURLTTL int

	// Cloud SQL Configuration
	CloudSQLInstance     string
	UseCloudSQLConnector bool
	DBUser               string
	DBPassword           string
	DBName               string

	// Payment Configuration
	PaddleVendorID       string
	PaddleVendorAuthCode string
	PaddlePublicKey      string
	PaddleWebhookSecret  string
	PaddleEnvironment    string
	StripeSecretKey      string

	// Email Configuration
	SMTPHost     string
	SMTPPort     string
	SMTPUsername string
	SMTPPassword string
	FromEmail    string
	FromName     string
}

func Load() *Config {
	_ = godotenv.Load()

	cfg := &Config{
		Environment:    getEnv("ENVIRONMENT", "development"),
		Port:           getEnv("PORT", "8080"),
		CorsOrigins:    splitCSV(getEnv("CORS_ORIGINS", "http://localhost:3000,https://localhost:3000")),
		JwtSecret:      getEnv("JWT_SECRET_KEY", ""),
		JwtAlg:         getEnv("JWT_ALGORITHM", "HS256"),
		JwtAccessMin:   getEnvInt("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30),
		JwtRefreshDays: getEnvInt("JWT_REFRESH_TOKEN_EXPIRE_DAYS", 7),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/synthos?sslmode=require"),
		RedisURL:       getEnv("REDIS_URL", "redis://localhost:6379/0"),
		EnableSentry:   getEnv("ENABLE_SENTRY", "false") == "true",
		SentryDSN:      getEnv("SENTRY_DSN", ""),
		StorageBaseURL: getEnv("STORAGE_BASE_URL", ""),

		// AI Provider Configuration
		AnthropicAPIKey:    getEnv("ANTHROPIC_API_KEY", ""),
		OpenAIAPIKey:       getEnv("OPENAI_API_KEY", ""),
		VertexProjectID:    getEnv("VERTEX_PROJECT_ID", ""),
		VertexLocation:     getEnv("VERTEX_LOCATION", "us-central1"),
		VertexAPIKey:       getEnv("VERTEX_API_KEY", ""),
		VertexDefaultModel: getEnv("VERTEX_DEFAULT_MODEL", "claude-4-opus"),

		// Storage Configuration
		StorageProvider: getEnv("STORAGE_PROVIDER", "gcs"),
		GCPProjectID:    getEnv("GCP_PROJECT_ID", ""),
		GCPLocation:     getEnv("GCP_LOCATION", "us-central1"),
		GCSBucket:       getEnv("GCS_BUCKET", ""),
		GCSSignedURLTTL: getEnvInt("GCS_SIGNED_URL_TTL", 3600),

		// Cloud SQL Configuration
		CloudSQLInstance:     getEnv("CLOUDSQL_INSTANCE", ""),
		UseCloudSQLConnector: getEnv("USE_CLOUD_SQL_CONNECTOR", "false") == "true",
		DBUser:               getEnv("DB_USER", "synthos"),
		DBPassword:           getEnv("DB_PASSWORD", ""),
		DBName:               getEnv("DB_NAME", "synthos"),

		// Payment Configuration
		PaddleVendorID:       getEnv("PADDLE_VENDOR_ID", ""),
		PaddleVendorAuthCode: getEnv("PADDLE_VENDOR_AUTH_CODE", ""),
		PaddlePublicKey:      getEnv("PADDLE_PUBLIC_KEY", ""),
		PaddleWebhookSecret:  getEnv("PADDLE_WEBHOOK_SECRET", ""),
		PaddleEnvironment:    getEnv("PADDLE_ENVIRONMENT", "production"),
		StripeSecretKey:      getEnv("STRIPE_SECRET_KEY", ""),

		// Email Configuration
		SMTPHost:     getEnv("SMTP_HOST", "localhost"),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUsername: getEnv("SMTP_USERNAME", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		FromEmail:    getEnv("FROM_EMAIL", "noreply@synthos.dev"),
		FromName:     getEnv("FROM_NAME", "Synthos"),
	}

	// Validate critical configuration
	if err := cfg.Validate(); err != nil {
		log.Fatalf("Configuration validation failed: %v", err)
	}

	return cfg
}

func getEnv(k, d string) string {
	v := os.Getenv(k)
	if v == "" {
		return d
	}
	return v
}

func getEnvInt(k string, d int) int {
	if v := os.Getenv(k); v != "" {
		var out int
		_, err := fmt.Sscanf(v, "%d", &out)
		if err == nil {
			return out
		}
	}
	return d
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		t := strings.TrimSpace(p)
		if t != "" {
			out = append(out, t)
		}
	}
	return out
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	// Check JWT secret
	if c.JwtSecret == "" {
		return fmt.Errorf("JWT_SECRET_KEY is required")
	}

	if len(c.JwtSecret) < 32 {
		return fmt.Errorf("JWT_SECRET_KEY must be at least 32 characters long")
	}

	// Check database URL for production
	if c.Environment == "production" {
		if !strings.Contains(c.DatabaseURL, "sslmode=require") && !strings.Contains(c.DatabaseURL, "sslmode=verify-full") {
			return fmt.Errorf("Database SSL is required in production (sslmode=require or sslmode=verify-full)")
		}
	}

	// Check Redis URL
	if c.RedisURL == "" {
		return fmt.Errorf("REDIS_URL is required")
	}

	// Check AI provider configuration
	if c.VertexProjectID == "" {
		return fmt.Errorf("VERTEX_PROJECT_ID is required")
	}

	if c.VertexAPIKey == "" {
		return fmt.Errorf("VERTEX_API_KEY is required")
	}

	// Check storage configuration
	if c.StorageProvider == "gcs" && c.GCSBucket == "" {
		return fmt.Errorf("GCS_BUCKET is required when using GCS storage")
	}

	return nil
}
