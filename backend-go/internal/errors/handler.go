package errors
// Package errors provides structured error handling with error codes, wrapping, and context.


import (
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

// ErrorResponse is the standardized JSON error response structure
type ErrorResponse struct {
	Error   string                 `json:"error"`
	Code    ErrorCode              `json:"code"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
	TraceID string                 `json:"trace_id,omitempty"`
}

// ErrorHandler is a centralized error handler for HTTP responses
type ErrorHandler struct {
	logger *zap.Logger
}

// NewErrorHandler creates a new error handler with logger
func NewErrorHandler(logger *zap.Logger) *ErrorHandler {
	return &ErrorHandler{logger: logger}
}

// Handle processes an error and returns an appropriate HTTP response
func (h *ErrorHandler) Handle(c *fiber.Ctx, err error) error {
	if err == nil {
		return nil
	}

	// Extract trace ID from context if available
	traceID := c.Locals("trace_id")
	traceIDStr := ""
	if traceID != nil {
		traceIDStr = traceID.(string)
	}

	// Try to convert to AppError
	appErr, ok := As(err)
	if !ok {
		// Unknown error - log and return generic internal error
		h.logger.Error("unhandled error",
			zap.Error(err),
			zap.String("trace_id", traceIDStr),
			zap.String("path", c.Path()),
			zap.String("method", c.Method()),
		)

		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_error",
			Code:    ErrCodeInternal,
			Message: "An internal error occurred",
			TraceID: traceIDStr,
		})
	}

	// Log structured error
	h.logError(appErr, c, traceIDStr)

	// Return structured error response
	return c.Status(appErr.StatusCode).JSON(ErrorResponse{
		Error:   string(appErr.Code),
		Code:    appErr.Code,
		Message: appErr.Message,
		Details: appErr.Details,
		TraceID: traceIDStr,
	})
}

// logError logs an error with appropriate level and context
func (h *ErrorHandler) logError(err *AppError, c *fiber.Ctx, traceID string) {
	fields := []zap.Field{
		zap.String("error_code", string(err.Code)),
		zap.String("trace_id", traceID),
		zap.String("path", c.Path()),
		zap.String("method", c.Method()),
		zap.Int("status_code", err.StatusCode),
	}

	// Add details if present
	if len(err.Details) > 0 {
		fields = append(fields, zap.Any("details", err.Details))
	}

	// Add underlying error if present
	if err.Err != nil {
		fields = append(fields, zap.Error(err.Err))
	}

	// Log at appropriate level based on status code
	if err.StatusCode >= 500 {
		h.logger.Error(err.Message, fields...)
	} else if err.StatusCode >= 400 {
		h.logger.Warn(err.Message, fields...)
	} else {
		h.logger.Info(err.Message, fields...)
	}
}

// GlobalErrorHandler is a Fiber middleware for centralized error handling
func GlobalErrorHandler(logger *zap.Logger) fiber.ErrorHandler {
	handler := NewErrorHandler(logger)
	return func(c *fiber.Ctx, err error) error {
		return handler.Handle(c, err)
	}
}
