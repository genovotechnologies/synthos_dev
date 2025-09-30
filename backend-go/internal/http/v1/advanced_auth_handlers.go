package v1

import (
	"context"
	"time"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/auth"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/models"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/repo"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/services"
	"github.com/gofiber/fiber/v2"
)

type AdvancedAuthDeps struct {
	Users        *repo.UserRepo
	APIKeys      *repo.APIKeyRepo
	AuditLogs    *repo.AuditLogRepo
	AuthService  *auth.AdvancedAuthService
	EmailService *services.EmailService
	Blacklist    *auth.Blacklist
}

type SignUpRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	FullName string `json:"full_name" validate:"required"`
	Company  string `json:"company,omitempty"`
}

type SignInRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type EmailVerificationRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type PasswordResetRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type PasswordResetConfirm struct {
	Token    string `json:"token" validate:"required"`
	Password string `json:"password" validate:"required,min=8"`
}

type APIKeyRequest struct {
	Name      string     `json:"name" validate:"required"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// SignUp handles user registration with email verification
func (d AdvancedAuthDeps) SignUp(c *fiber.Ctx) error {
	var req SignUpRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request"})
	}

	// Check if user already exists
	existingUser, err := d.Users.GetByEmail(context.Background(), req.Email)
	if err == nil && existingUser != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "email_already_registered"})
	}

	// Hash password
	hashedPassword, err := d.AuthService.HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "password_hash_failed"})
	}

	// Create user
	user := &models.User{
		Email:            req.Email,
		HashedPassword:   hashedPassword,
		FullName:         &req.FullName,
		Company:          &req.Company,
		Role:             models.RoleUser,
		IsActive:         true,
		IsVerified:       false,
		SubscriptionTier: models.TierFree,
	}

	createdUser, err := d.Users.Insert(context.Background(), user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "user_creation_failed"})
	}

	// Generate verification token
	verificationToken, err := d.AuthService.GenerateEmailVerificationToken(req.Email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token_generation_failed"})
	}

	// Send verification email
	if err := d.EmailService.SendVerificationEmail(req.Email, verificationToken); err != nil {
		// Log error but don't fail registration
		// TODO: Add proper logging
	}

	// Log registration
	d.logUserAction(createdUser.ID, "user_registered", "user", createdUser.ID, c)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "User registered successfully. Please check your email for verification.",
		"user_id": createdUser.ID,
	})
}

// SignIn handles user authentication with rate limiting
func (d AdvancedAuthDeps) SignIn(c *fiber.Ctx) error {
	var req SignInRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request"})
	}

	clientIP := c.IP()

	// Check rate limiting
	canProceed, err := d.AuthService.CheckRateLimit(req.Email, 5, 15*time.Minute)
	if err != nil || !canProceed {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "rate_limit_exceeded"})
	}

	// Check account lockout
	isLocked, err := d.AuthService.CheckAccountLockout(req.Email)
	if err != nil || isLocked {
		return c.Status(fiber.StatusLocked).JSON(fiber.Map{"error": "account_locked"})
	}

	// Get user
	user, err := d.Users.GetByEmail(context.Background(), req.Email)
	if err != nil || user == nil {
		d.AuthService.RecordFailedAttempt(req.Email, clientIP)
		d.logUserAction(0, "login_failed", "user", 0, c)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_credentials"})
	}

	// Verify password
	if !d.AuthService.VerifyPassword(req.Password, user.HashedPassword) {
		d.AuthService.RecordFailedAttempt(req.Email, clientIP)
		d.logUserAction(user.ID, "login_failed", "user", user.ID, c)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_credentials"})
	}

	// Check if user is active
	if !user.IsActive {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "account_disabled"})
	}

	// Clear failed attempts
	d.AuthService.ClearFailedAttempts(req.Email, clientIP)

	// Generate tokens
	accessToken, err := auth.GenerateToken(user.ID, user.Email, string(user.Role), 15*time.Minute)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token_generation_failed"})
	}

	refreshToken, err := auth.GenerateToken(user.ID, user.Email, string(user.Role), 7*24*time.Hour)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token_generation_failed"})
	}

	// Set HttpOnly cookie
	c.Cookie(&fiber.Cookie{
		Name:     "synthos_token",
		Value:    accessToken,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "None",
		MaxAge:   15 * 60, // 15 minutes
		Domain:   ".synthos.dev",
		Path:     "/",
	})

	// Log successful login
	d.logUserAction(user.ID, "login_successful", "user", user.ID, c)

	return c.JSON(fiber.Map{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    900, // 15 minutes
	})
}

// VerifyEmail handles email verification
func (d AdvancedAuthDeps) VerifyEmail(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "token_required"})
	}

	email, err := d.AuthService.VerifyEmailVerificationToken(token)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_token"})
	}

	// Update user verification status
	user, err := d.Users.GetByEmail(context.Background(), email)
	if err != nil || user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	if err := d.Users.UpdateVerified(context.Background(), user.ID, true); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "verification_failed"})
	}

	// Send welcome email
	d.EmailService.SendWelcomeEmail(email, *user.FullName)

	// Log verification
	d.logUserAction(user.ID, "email_verified", "user", user.ID, c)

	return c.JSON(fiber.Map{"message": "Email verified successfully"})
}

// ForgotPassword handles password reset requests
func (d AdvancedAuthDeps) ForgotPassword(c *fiber.Ctx) error {
	var req PasswordResetRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request"})
	}

	// Check if user exists
	user, err := d.Users.GetByEmail(context.Background(), req.Email)
	if err != nil || user == nil {
		// Don't reveal if user exists or not
		return c.JSON(fiber.Map{"message": "If the email exists, a reset link has been sent"})
	}

	// Generate reset token
	resetToken, err := d.AuthService.GeneratePasswordResetToken(req.Email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token_generation_failed"})
	}

	// Send reset email
	if err := d.EmailService.SendPasswordResetEmail(req.Email, resetToken); err != nil {
		// Log error but don't reveal it
	}

	// Log password reset request
	d.logUserAction(user.ID, "password_reset_requested", "user", user.ID, c)

	return c.JSON(fiber.Map{"message": "If the email exists, a reset link has been sent"})
}

// ResetPassword handles password reset confirmation
func (d AdvancedAuthDeps) ResetPassword(c *fiber.Ctx) error {
	var req PasswordResetConfirm
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request"})
	}

	email, err := d.AuthService.VerifyPasswordResetToken(req.Token)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_token"})
	}

	// Hash new password
	hashedPassword, err := d.AuthService.HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "password_hash_failed"})
	}

	// Update user password
	user, err := d.Users.GetByEmail(context.Background(), email)
	if err != nil || user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	if err := d.Users.UpdatePassword(context.Background(), user.ID, hashedPassword); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "password_update_failed"})
	}

	// Log password reset
	d.logUserAction(user.ID, "password_reset_completed", "user", user.ID, c)

	return c.JSON(fiber.Map{"message": "Password reset successfully"})
}

// CreateAPIKey creates a new API key for the user
func (d AdvancedAuthDeps) CreateAPIKey(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(int64)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}

	var req APIKeyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request"})
	}

	// Generate API key
	apiKey, keyHash, err := d.AuthService.GenerateAPIKey()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "key_generation_failed"})
	}

	// Store API key
	apiKeyModel := &models.APIKey{
		UserID:    userID,
		Name:      req.Name,
		KeyHash:   keyHash,
		IsActive:  true,
		ExpiresAt: req.ExpiresAt,
	}

	createdKey, err := d.APIKeys.Insert(context.Background(), apiKeyModel)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "key_storage_failed"})
	}

	// Log API key creation
	d.logUserAction(userID, "api_key_created", "api_key", createdKey.ID, c)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"api_key":    apiKey,
		"key_id":     createdKey.ID,
		"name":       createdKey.Name,
		"expires_at": createdKey.ExpiresAt,
	})
}

// logUserAction logs user actions for audit trail
func (d AdvancedAuthDeps) logUserAction(userID int64, action, resource string, resourceID int64, c *fiber.Ctx) {
	auditLog := &models.AuditLog{
		UserID:     &userID,
		Action:     action,
		Resource:   resource,
		ResourceID: &resource,
		IPAddress:  c.IP(),
		UserAgent:  c.Get("User-Agent"),
		Metadata:   "{}",
	}

	if userID == 0 {
		auditLog.UserID = nil
	}

	d.AuditLogs.Insert(context.Background(), auditLog)
}
