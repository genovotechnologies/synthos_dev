package v1

import (
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

// StandardErrorResponse represents a standardized error response
type StandardErrorResponse struct {
	Success   bool   `json:"success"`
	Error     string `json:"error"`
	ErrorCode string `json:"error_code,omitempty"`
	Details   string `json:"details,omitempty"`
}

// ErrorResponse creates a standardized error response
func ErrorResponse(c *fiber.Ctx, statusCode int, errorCode, message string, logger *zap.Logger) error {
	if logger != nil {
		logger.Error("API Error",
			zap.String("error_code", errorCode),
			zap.String("message", message),
			zap.Int("status_code", statusCode),
		)
	}

	return c.Status(statusCode).JSON(StandardErrorResponse{
		Success:   false,
		Error:     message,
		ErrorCode: errorCode,
	})
}

// ValidationError creates a validation error response
func ValidationError(c *fiber.Ctx, message string, logger *zap.Logger) error {
	return ErrorResponse(c, 400, "VALIDATION_ERROR", message, logger)
}

// InternalServerError creates an internal server error response
func InternalServerError(c *fiber.Ctx, message string, logger *zap.Logger) error {
	return ErrorResponse(c, 500, "INTERNAL_ERROR", message, logger)
}

// UnauthorizedError creates an unauthorized error response
func UnauthorizedError(c *fiber.Ctx, message string, logger *zap.Logger) error {
	return ErrorResponse(c, 401, "UNAUTHORIZED", message, logger)
}

// NotFoundError creates a not found error response
func NotFoundError(c *fiber.Ctx, message string, logger *zap.Logger) error {
	return ErrorResponse(c, 404, "NOT_FOUND", message, logger)
}

// SuccessResponse creates a standardized success response
func SuccessResponse(c *fiber.Ctx, data interface{}) error {
	return c.JSON(fiber.Map{
		"success": true,
		"data":    data,
	})
}
