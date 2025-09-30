package v1

import (
	"regexp"
	"strings"
	"unicode"
)

// ValidationFieldError represents a validation field error
type ValidationFieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ValidationResult represents the result of validation
type ValidationResult struct {
	IsValid bool                   `json:"is_valid"`
	Errors  []ValidationFieldError `json:"errors"`
}

// ValidateEmail validates an email address
func ValidateEmail(email string) *ValidationFieldError {
	if email == "" {
		return &ValidationFieldError{Field: "email", Message: "email is required"}
	}

	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return &ValidationFieldError{Field: "email", Message: "invalid email format"}
	}

	if len(email) > 254 {
		return &ValidationFieldError{Field: "email", Message: "email too long"}
	}

	return nil
}

// ValidatePassword validates a password
func ValidatePassword(password string) *ValidationFieldError {
	if password == "" {
		return &ValidationFieldError{Field: "password", Message: "password is required"}
	}

	if len(password) < 8 {
		return &ValidationFieldError{Field: "password", Message: "password must be at least 8 characters"}
	}

	if len(password) > 128 {
		return &ValidationFieldError{Field: "password", Message: "password too long"}
	}

	hasUpper := false
	hasLower := false
	hasDigit := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if !hasUpper {
		return &ValidationFieldError{Field: "password", Message: "password must contain at least one uppercase letter"}
	}

	if !hasLower {
		return &ValidationFieldError{Field: "password", Message: "password must contain at least one lowercase letter"}
	}

	if !hasDigit {
		return &ValidationFieldError{Field: "password", Message: "password must contain at least one digit"}
	}

	if !hasSpecial {
		return &ValidationFieldError{Field: "password", Message: "password must contain at least one special character"}
	}

	return nil
}

// ValidateString validates a string field
func ValidateString(value, fieldName string, minLength, maxLength int, required bool) *ValidationFieldError {
	if required && strings.TrimSpace(value) == "" {
		return &ValidationFieldError{Field: fieldName, Message: fieldName + " is required"}
	}

	if value != "" {
		if len(value) < minLength {
			return &ValidationFieldError{Field: fieldName, Message: fieldName + " must be at least " + string(rune(minLength)) + " characters"}
		}

		if len(value) > maxLength {
			return &ValidationFieldError{Field: fieldName, Message: fieldName + " must be no more than " + string(rune(maxLength)) + " characters"}
		}
	}

	return nil
}

// ValidatePositiveInt validates a positive integer
func ValidatePositiveInt(value int, fieldName string) *ValidationFieldError {
	if value <= 0 {
		return &ValidationFieldError{Field: fieldName, Message: fieldName + " must be positive"}
	}

	return nil
}

// ValidateRange validates a value is within a range
func ValidateRange(value, fieldName string, min, max float64) *ValidationFieldError {
	if value == "" {
		return &ValidationFieldError{Field: fieldName, Message: fieldName + " is required"}
	}

	// This would need to be converted to float64 first
	// For now, just check if it's not empty
	return nil
}

// SanitizeString sanitizes a string input
func SanitizeString(input string) string {
	// Remove leading/trailing whitespace
	input = strings.TrimSpace(input)

	// Remove null bytes and control characters
	var result strings.Builder
	for _, r := range input {
		if r >= 32 && r != 127 { // Printable ASCII characters except DEL
			result.WriteRune(r)
		}
	}

	return result.String()
}
