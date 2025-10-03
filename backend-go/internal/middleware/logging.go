// Package middleware provides HTTP middleware for the Synthos API
package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// RequestLogger creates a middleware that logs all requests with correlation IDs
func RequestLogger(logger *zap.Logger) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Generate or extract trace ID
		traceID := c.Get("X-Trace-ID")
		if traceID == "" {
			traceID = uuid.New().String()
		}

		// Store trace ID in context
		c.Locals("trace_id", traceID)
		c.Set("X-Trace-ID", traceID)

		// Start timer
		start := time.Now()

		// Log incoming request
		logger.Info("incoming request",
			zap.String("trace_id", traceID),
			zap.String("method", c.Method()),
			zap.String("path", c.Path()),
			zap.String("ip", c.IP()),
			zap.String("user_agent", c.Get("User-Agent")),
		)

		// Process request
		err := c.Next()

		// Calculate duration
		duration := time.Since(start)

		// Log response
		fields := []zap.Field{
			zap.String("trace_id", traceID),
			zap.String("method", c.Method()),
			zap.String("path", c.Path()),
			zap.Int("status", c.Response().StatusCode()),
			zap.Duration("duration", duration),
			zap.Int("response_size", len(c.Response().Body())),
		}

		// Add error if present
		if err != nil {
			fields = append(fields, zap.Error(err))
			logger.Error("request failed", fields...)
		} else if c.Response().StatusCode() >= 500 {
			logger.Error("request completed with server error", fields...)
		} else if c.Response().StatusCode() >= 400 {
			logger.Warn("request completed with client error", fields...)
		} else {
			logger.Info("request completed", fields...)
		}

		return err
	}
}

// GetTraceID retrieves the trace ID from the context
func GetTraceID(c *fiber.Ctx) string {
	traceID := c.Locals("trace_id")
	if traceID == nil {
		return ""
	}
	return traceID.(string)
}
