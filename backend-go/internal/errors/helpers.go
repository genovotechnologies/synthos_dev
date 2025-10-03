// Package errors provides structured error handling with error codes, wrapping, and context.
package errors

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/lib/pq"
)

// IsNotFound checks if an error is a "not found" error
func IsNotFound(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, sql.ErrNoRows) {
		return true
	}
	appErr, ok := As(err)
	return ok && appErr.Code == ErrCodeNotFound
}

// IsValidation checks if an error is a validation error
func IsValidation(err error) bool {
	if err == nil {
		return false
	}
	appErr, ok := As(err)
	return ok && (appErr.Code == ErrCodeValidation || appErr.Code == ErrCodeInvalidInput)
}

// IsUnauthorized checks if an error is an authorization error
func IsUnauthorized(err error) bool {
	if err == nil {
		return false
	}
	appErr, ok := As(err)
	return ok && (appErr.Code == ErrCodeUnauthorized || appErr.Code == ErrCodeAuthRequired)
}

// IsForbidden checks if an error is a forbidden error
func IsForbidden(err error) bool {
	if err == nil {
		return false
	}
	appErr, ok := As(err)
	return ok && appErr.Code == ErrCodeForbidden
}

// IsRateLimited checks if an error is a rate limiting error
func IsRateLimited(err error) bool {
	if err == nil {
		return false
	}
	appErr, ok := As(err)
	return ok && (appErr.Code == ErrCodeRateLimited || appErr.Code == ErrCodeQuotaExceeded)
}

// FromPostgres converts common PostgreSQL errors to AppErrors
func FromPostgres(err error) error {
	if err == nil {
		return nil
	}

	// Check for no rows
	if errors.Is(err, sql.ErrNoRows) {
		return NotFound("resource")
	}

	// Check for PostgreSQL specific errors
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		switch pqErr.Code {
		case "23505": // unique_violation
			// Extract constraint name if possible
			constraint := extractConstraintName(pqErr.Constraint)
			return AlreadyExists(constraint)
		case "23503": // foreign_key_violation
			return Validation("referenced resource does not exist")
		case "23502": // not_null_violation
			field := extractFieldName(pqErr.Column)
			return ValidationField(field, fmt.Sprintf("%s is required", field))
		case "23514": // check_violation
			return Validation("constraint violation")
		case "42P01": // undefined_table
			return Internal("database table not found")
		case "53300": // too_many_connections
			return New(ErrCodeServiceUnavailable, "database connection pool exhausted", 503)
		}
	}

	// Default to internal database error
	return Database(err)
}

// extractConstraintName extracts a human-readable constraint name
func extractConstraintName(constraint string) string {
	if constraint == "" {
		return "resource"
	}
	// Remove common prefixes/suffixes
	constraint = strings.TrimSuffix(constraint, "_key")
	constraint = strings.TrimSuffix(constraint, "_idx")
	constraint = strings.TrimPrefix(constraint, "uix_")
	constraint = strings.TrimPrefix(constraint, "ix_")
	constraint = strings.ReplaceAll(constraint, "_", " ")
	return constraint
}

// extractFieldName extracts a human-readable field name
func extractFieldName(field string) string {
	if field == "" {
		return "field"
	}
	// Convert snake_case to Title Case
	parts := strings.Split(field, "_")
	for i, part := range parts {
		if len(part) > 0 {
			parts[i] = strings.ToUpper(part[0:1]) + part[1:]
		}
	}
	return strings.Join(parts, " ")
}

// ValidationErrors creates a validation error with multiple field errors
func ValidationErrors(fieldErrors map[string]string) *AppError {
	err := Validation("validation failed")
	for field, message := range fieldErrors {
		err.WithDetail(field, message)
	}
	return err
}

// RequiredField creates a validation error for a missing required field
func RequiredField(field string) *AppError {
	return New(ErrCodeMissingField, fmt.Sprintf("%s is required", field), 400).
		WithDetail("field", field)
}

// InvalidField creates a validation error for an invalid field value
func InvalidField(field, message string) *AppError {
	return New(ErrCodeInvalidInput, message, 400).
		WithDetail("field", field)
}

// TokenExpired creates an error for expired authentication tokens
func TokenExpired() *AppError {
	return New(ErrCodeTokenExpired, "authentication token has expired", 401)
}

// InvalidToken creates an error for invalid authentication tokens
func InvalidToken() *AppError {
	return New(ErrCodeInvalidToken, "invalid authentication token", 401)
}

// InsufficientCredits creates an error for insufficient user credits
func InsufficientCredits(required, available int64) *AppError {
	return New(ErrCodeInsufficientCredits, "insufficient credits for this operation", 402).
		WithDetail("required", required).
		WithDetail("available", available)
}

// TierLimitReached creates an error when a subscription tier limit is reached
func TierLimitReached(resource string, limit int64) *AppError {
	return New(ErrCodeTierLimitReached,
		fmt.Sprintf("subscription tier limit reached for %s", resource), 403).
		WithDetail("resource", resource).
		WithDetail("limit", limit)
}

// ServiceUnavailable creates an error for temporarily unavailable services
func ServiceUnavailable(service string) *AppError {
	return New(ErrCodeServiceUnavailable,
		fmt.Sprintf("%s is temporarily unavailable", service), 503).
		WithDetail("service", service)
}
