// Package errors provides HTTP error handling utilities
package errors

import (
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

// ErrorResponse is defined in handler.go

// HandleError processes an error and sends an appropriate HTTP response
func HandleError(c *fiber.Ctx, err error, logger *zap.Logger) error {
	if err == nil {
		return nil
	}

	// Try to extract AppError
	appErr, ok := As(err)
	if !ok {
		// Unknown error - treat as internal server error
		logger.Error("Unhandled error", zap.Error(err))
		appErr = InternalWrap(err, "An unexpected error occurred")
	}

	// Log the error with appropriate level
	logError(appErr, logger, c)

	// Build error response
	response := ErrorResponse{
		Error:   string(appErr.Code),
		Message: appErr.Message,
		Details: appErr.Details,
	}

	return c.Status(appErr.StatusCode).JSON(response)
}

// logError logs the error with appropriate context and level
func logError(err *AppError, logger *zap.Logger, c *fiber.Ctx) {
	fields := []zap.Field{
		zap.String("error_code", string(err.Code)),
		zap.Int("status_code", err.StatusCode),
		zap.String("path", c.Path()),
		zap.String("method", c.Method()),
		zap.String("ip", c.IP()),
	}

	if err.Err != nil {
		fields = append(fields, zap.Error(err.Err))
	}

	if len(err.Details) > 0 {
		fields = append(fields, zap.Any("details", err.Details))
	}

	// Log based on status code
	if err.StatusCode >= 500 {
		logger.Error(err.Message, fields...)
	} else if err.StatusCode >= 400 {
		logger.Warn(err.Message, fields...)
	} else {
		logger.Info(err.Message, fields...)
	}
}

// SuccessResponse sends a successful JSON response
func SuccessResponse(c *fiber.Ctx, data interface{}) error {
	return c.JSON(fiber.Map{
		"success": true,
		"data":    data,
	})
}

// SuccessMessage sends a successful response with just a message
func SuccessMessage(c *fiber.Ctx, message string) error {
	return c.JSON(fiber.Map{
		"success": true,
		"message": message,
	})
}
