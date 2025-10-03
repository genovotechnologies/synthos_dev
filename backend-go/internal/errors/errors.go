// Package errors provides structured error handling with error codes, wrapping, and context.
package errors

import (
	"errors"
	"fmt"
)

// ErrorCode represents a standardized error code for API responses
type ErrorCode string

const (
	// Authentication and Authorization errors
	ErrCodeUnauthorized  ErrorCode = "unauthorized"
	ErrCodeForbidden     ErrorCode = "forbidden"
	ErrCodeInvalidToken  ErrorCode = "invalid_token"
	ErrCodeTokenExpired  ErrorCode = "token_expired"
	ErrCodeAuthRequired  ErrorCode = "auth_required"
	ErrCodeInvalidAPIKey ErrorCode = "invalid_api_key"

	// Validation errors
	ErrCodeValidation      ErrorCode = "validation_error"
	ErrCodeInvalidInput    ErrorCode = "invalid_input"
	ErrCodeInvalidEmail    ErrorCode = "invalid_email"
	ErrCodeInvalidPassword ErrorCode = "invalid_password"
	ErrCodeMissingField    ErrorCode = "missing_field"

	// Resource errors
	ErrCodeNotFound      ErrorCode = "not_found"
	ErrCodeAlreadyExists ErrorCode = "already_exists"
	ErrCodeConflict      ErrorCode = "conflict"

	// Rate limiting and quota errors
	ErrCodeRateLimited      ErrorCode = "rate_limited"
	ErrCodeQuotaExceeded    ErrorCode = "quota_exceeded"
	ErrCodeTierLimitReached ErrorCode = "tier_limit_reached"

	// Business logic errors
	ErrCodeInsufficientCredits ErrorCode = "insufficient_credits"
	ErrCodeInvalidOperation    ErrorCode = "invalid_operation"
	ErrCodeOperationFailed     ErrorCode = "operation_failed"

	// System errors
	ErrCodeInternal           ErrorCode = "internal_error"
	ErrCodeDatabaseError      ErrorCode = "database_error"
	ErrCodeStorageError       ErrorCode = "storage_error"
	ErrCodeNetworkError       ErrorCode = "network_error"
	ErrCodeServiceUnavailable ErrorCode = "service_unavailable"
)

// AppError represents a structured application error with code, message, and optional details
type AppError struct {
	Code       ErrorCode              `json:"code"`
	Message    string                 `json:"message"`
	Details    map[string]interface{} `json:"details,omitempty"`
	StatusCode int                    `json:"-"`
	Err        error                  `json:"-"`
}

// Error implements the error interface
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s (caused by: %v)", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// Unwrap returns the underlying error
func (e *AppError) Unwrap() error {
	return e.Err
}

// WithDetail adds a detail field to the error
func (e *AppError) WithDetail(key string, value interface{}) *AppError {
	if e.Details == nil {
		e.Details = make(map[string]interface{})
	}
	e.Details[key] = value
	return e
}

// WithError wraps an underlying error
func (e *AppError) WithError(err error) *AppError {
	e.Err = err
	return e
}

// New creates a new AppError
func New(code ErrorCode, message string, statusCode int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

// Wrap wraps an existing error with an AppError
func Wrap(err error, code ErrorCode, message string, statusCode int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
		Err:        err,
	}
}

// Is checks if the error is of a specific type
func Is(err error, target error) bool {
	return errors.Is(err, target)
}

// As attempts to convert an error to AppError
func As(err error) (*AppError, bool) {
	var appErr *AppError
	ok := errors.As(err, &appErr)
	return appErr, ok
}

// Common error constructors
func Unauthorized(message string) *AppError {
	return New(ErrCodeUnauthorized, message, 401)
}

func Forbidden(message string) *AppError {
	return New(ErrCodeForbidden, message, 403)
}

func NotFound(resource string) *AppError {
	return New(ErrCodeNotFound, fmt.Sprintf("%s not found", resource), 404)
}

func AlreadyExists(resource string) *AppError {
	return New(ErrCodeAlreadyExists, fmt.Sprintf("%s already exists", resource), 409)
}

func Validation(message string) *AppError {
	return New(ErrCodeValidation, message, 400)
}

func ValidationField(field, message string) *AppError {
	return New(ErrCodeValidation, message, 400).WithDetail("field", field)
}

func Internal(message string) *AppError {
	return New(ErrCodeInternal, message, 500)
}

func InternalWrap(err error, message string) *AppError {
	return Wrap(err, ErrCodeInternal, message, 500)
}

func Database(err error) *AppError {
	return Wrap(err, ErrCodeDatabaseError, "Database operation failed", 500)
}

func Storage(err error) *AppError {
	return Wrap(err, ErrCodeStorageError, "Storage operation failed", 500)
}

func RateLimited(message string) *AppError {
	return New(ErrCodeRateLimited, message, 429)
}

func QuotaExceeded(message string) *AppError {
	return New(ErrCodeQuotaExceeded, message, 429)
}
