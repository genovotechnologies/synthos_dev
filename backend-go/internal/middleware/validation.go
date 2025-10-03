// Package middleware provides HTTP middleware for the Synthos API
package middleware

import (
	"encoding/json"
	"fmt"
	"net/mail"
	"regexp"
	"strings"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/errors"
	"github.com/gofiber/fiber/v2"
)

// Validator provides input validation utilities
type Validator struct {
	emailRegex *regexp.Regexp
	uuidRegex  *regexp.Regexp
}

// NewValidator creates a new validator instance
func NewValidator() *Validator {
	return &Validator{
		emailRegex: regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`),
		uuidRegex:  regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`),
	}
}

// ValidateJSON validates and parses JSON body into the provided struct
func (v *Validator) ValidateJSON(c *fiber.Ctx, dest interface{}) error {
	if c.Get("Content-Type") != "application/json" {
		return errors.Validation("Content-Type must be application/json")
	}

	if err := c.BodyParser(dest); err != nil {
		return errors.Validation("invalid JSON format").WithError(err)
	}

	return nil
}

// ValidateEmail validates an email address
func (v *Validator) ValidateEmail(email string) error {
	if email == "" {
		return errors.RequiredField("email")
	}

	email = strings.TrimSpace(strings.ToLower(email))

	// Use Go's mail.ParseAddress for robust validation
	addr, err := mail.ParseAddress(email)
	if err != nil {
		return errors.InvalidField("email", "invalid email format")
	}

	// Additional checks
	if len(addr.Address) > 254 {
		return errors.InvalidField("email", "email address too long")
	}

	return nil
}

// ValidatePassword validates a password
func (v *Validator) ValidatePassword(password string) error {
	if password == "" {
		return errors.RequiredField("password")
	}

	if len(password) < 8 {
		return errors.InvalidField("password", "password must be at least 8 characters")
	}

	if len(password) > 128 {
		return errors.InvalidField("password", "password must be less than 128 characters")
	}

	// Check for at least one uppercase, one lowercase, and one number
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)

	if !hasUpper || !hasLower || !hasNumber {
		return errors.InvalidField("password",
			"password must contain at least one uppercase letter, one lowercase letter, and one number")
	}

	return nil
}

// ValidateString validates a required string field
func (v *Validator) ValidateString(field, value string, minLen, maxLen int) error {
	if value == "" {
		return errors.RequiredField(field)
	}

	value = strings.TrimSpace(value)

	if len(value) < minLen {
		return errors.InvalidField(field,
			fmt.Sprintf("%s must be at least %d characters", field, minLen))
	}

	if maxLen > 0 && len(value) > maxLen {
		return errors.InvalidField(field,
			fmt.Sprintf("%s must be less than %d characters", field, maxLen))
	}

	return nil
}

// ValidateInt validates an integer field
func (v *Validator) ValidateInt(field string, value int64, min, max int64) error {
	if value < min {
		return errors.InvalidField(field,
			fmt.Sprintf("%s must be at least %d", field, min))
	}

	if max > 0 && value > max {
		return errors.InvalidField(field,
			fmt.Sprintf("%s must be less than %d", field, max))
	}

	return nil
}

// ValidateEnum validates that a value is in a set of allowed values
func (v *Validator) ValidateEnum(field, value string, allowed []string) error {
	if value == "" {
		return errors.RequiredField(field)
	}

	for _, a := range allowed {
		if value == a {
			return nil
		}
	}

	return errors.InvalidField(field,
		fmt.Sprintf("%s must be one of: %s", field, strings.Join(allowed, ", ")))
}

// SanitizeString sanitizes a string input
func (v *Validator) SanitizeString(s string) string {
	// Trim whitespace
	s = strings.TrimSpace(s)

	// Remove null bytes
	s = strings.ReplaceAll(s, "\x00", "")

	// Limit length for safety
	if len(s) > 10000 {
		s = s[:10000]
	}

	return s
}

// SanitizeEmail sanitizes an email address
func (v *Validator) SanitizeEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}

// ValidationMiddleware creates a middleware that provides validation utilities
func ValidationMiddleware() fiber.Handler {
	validator := NewValidator()
	return func(c *fiber.Ctx) error {
		c.Locals("validator", validator)
		return c.Next()
	}
}

// GetValidator retrieves the validator from context
func GetValidator(c *fiber.Ctx) *Validator {
	v := c.Locals("validator")
	if v == nil {
		return NewValidator()
	}
	return v.(*Validator)
}

// RequestSizeLimit creates a middleware that limits request body size
func RequestSizeLimit(maxSize int) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if int64(c.Request().Header.ContentLength()) > int64(maxSize) {
			return errors.Validation(fmt.Sprintf("request body too large (max %d bytes)", maxSize))
		}
		return c.Next()
	}
}

// ValidateContentType creates a middleware that validates Content-Type header
func ValidateContentType(allowed ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ct := c.Get("Content-Type")

		// Allow empty content type for GET/DELETE requests
		if (c.Method() == "GET" || c.Method() == "DELETE") && ct == "" {
			return c.Next()
		}

		// Check if content type is allowed
		for _, a := range allowed {
			if strings.HasPrefix(ct, a) {
				return c.Next()
			}
		}

		return errors.Validation(fmt.Sprintf("Content-Type must be one of: %s", strings.Join(allowed, ", ")))
	}
}

// ValidateJSONBody is a helper to parse and validate JSON request bodies
func ValidateJSONBody[T any](c *fiber.Ctx) (*T, error) {
	validator := GetValidator(c)
	var body T
	if err := validator.ValidateJSON(c, &body); err != nil {
		return nil, err
	}
	return &body, nil
}

// PrettyJSON formats JSON output for better readability in development
func PrettyJSON(data interface{}) string {
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return ""
	}
	return string(b)
}
