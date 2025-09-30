package v1

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/auth"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/config"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/models"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/repo"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/services"
)

type AuthDeps struct {
	Cfg          *config.Config
	Users        *repo.UserRepo
	APIKeys      *repo.APIKeyRepo
	AuditLogs    *repo.AuditLogRepo
	AuthService  *auth.AdvancedAuthService
	EmailService *services.EmailService
	Blacklist    *auth.Blacklist
}

type SignUpRequest struct {
	Email    string  `json:"email"`
	Password string  `json:"password"`
	FullName *string `json:"full_name"`
	Company  *string `json:"company"`
}

type SignInRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

func (d AuthDeps) SignUp(c *fiber.Ctx) error {
	var body SignUpRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_body"})
	}
	if body.Email == "" || body.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing_fields"})
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "hash_failed"})
	}
	ctx := context.Background()
	if _, err := d.Users.Create(ctx, strings.ToLower(body.Email), string(hash), body.FullName, body.Company); err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "email_exists"})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "account_created"})
}

func (d AuthDeps) SignIn(c *fiber.Ctx) error {
	var body SignInRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_body"})
	}
	ctx := context.Background()
	user, err := d.Users.GetByEmail(ctx, strings.ToLower(body.Email))
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_credentials"})
	}
	if bcrypt.CompareHashAndPassword([]byte(user.HashedPassword), []byte(body.Password)) != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_credentials"})
	}
	claims := map[string]any{"user_id": user.ID, "sub": user.Email, "role": string(user.Role)}
	access, err := auth.CreateAccessToken(d.Cfg.JwtSecret, d.Cfg.JwtAlg, claims, d.Cfg.JwtAccessMin)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token_failed"})
	}
	refresh, err := auth.CreateRefreshToken(d.Cfg.JwtSecret, d.Cfg.JwtAlg, claims, d.Cfg.JwtRefreshDays)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token_failed"})
	}

	// HttpOnly cookie for access token (aligned to FE cookie usage)
	c.Cookie(&fiber.Cookie{
		Name:     "synthos_token",
		Value:    access,
		HTTPOnly: true,
		Secure:   d.Cfg.Environment == "production",
		SameSite: "None",
		Path:     "/",
		MaxAge:   d.Cfg.JwtAccessMin * 60,
	})

	_ = d.Users.UpdateLastLogin(ctx, user.ID)
	return c.JSON(fiber.Map{
		"access_token":  access,
		"token_type":    "bearer",
		"expires_in":    d.Cfg.JwtAccessMin * 60,
		"user":          fiber.Map{"id": user.ID, "email": user.Email, "full_name": user.FullName, "role": user.Role},
		"refresh_token": refresh,
	})
}

// RefreshToken exchanges a valid refresh token for a new access token
func (d AuthDeps) RefreshToken(c *fiber.Ctx) error {
	var body RefreshRequest
	if err := c.BodyParser(&body); err != nil || body.RefreshToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_body"})
	}
	claims, err := auth.ParseAndValidate(d.Cfg.JwtSecret, d.Cfg.JwtAlg, body.RefreshToken)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_token"})
	}
	if t, ok := claims["type"].(string); !ok || t != "refresh" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_token"})
	}
	userID := int64(0)
	if v, ok := claims["user_id"].(float64); ok {
		userID = int64(v)
	}
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_token"})
	}
	// issue new access token
	newAccess, err := auth.CreateAccessToken(d.Cfg.JwtSecret, d.Cfg.JwtAlg, claims, d.Cfg.JwtAccessMin)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token_failed"})
	}
	c.Cookie(&fiber.Cookie{
		Name:     "synthos_token",
		Value:    newAccess,
		HTTPOnly: true,
		Secure:   d.Cfg.Environment == "production",
		SameSite: "None",
		Path:     "/",
		MaxAge:   d.Cfg.JwtAccessMin * 60,
	})
	return c.JSON(fiber.Map{"access_token": newAccess, "token_type": "bearer", "expires_in": d.Cfg.JwtAccessMin * 60})
}

// Logout blacklists current tokens and clears cookie
func (d AuthDeps) Logout(c *fiber.Ctx) error {
	token := ""
	if h := c.Get("Authorization"); strings.HasPrefix(strings.ToLower(h), "bearer ") {
		token = strings.TrimSpace(h[len("Bearer "):])
	}
	if token == "" {
		token = c.Cookies("synthos_token")
	}
	if token != "" {
		if claims, err := auth.ParseAndValidate(d.Cfg.JwtSecret, d.Cfg.JwtAlg, token); err == nil {
			if exp, ok := claims["exp"].(float64); ok {
				ttl := time.Until(time.Unix(int64(exp), 0))
				if ttl > 0 {
					_ = d.Blacklist.Blacklist(context.Background(), token, ttl)
				}
			}
		}
	}
	// Optionally blacklist refresh token if sent
	var body RefreshRequest
	if err := c.BodyParser(&body); err == nil && body.RefreshToken != "" {
		if rclaims, err := auth.ParseAndValidate(d.Cfg.JwtSecret, d.Cfg.JwtAlg, body.RefreshToken); err == nil {
			if exp, ok := rclaims["exp"].(float64); ok {
				ttl := time.Until(time.Unix(int64(exp), 0))
				if ttl > 0 {
					_ = d.Blacklist.Blacklist(context.Background(), body.RefreshToken, ttl)
				}
			}
		}
	}
	// clear cookie
	c.Cookie(&fiber.Cookie{Name: "synthos_token", Value: "", Path: "/", HTTPOnly: true, Secure: d.Cfg.Environment == "production", MaxAge: -1})
	return c.JSON(fiber.Map{"message": "logged_out"})
}

// ForgotPassword generates a reset token and emails the user
func (d AuthDeps) ForgotPassword(c *fiber.Ctx) error {
	var body ForgotPasswordRequest
	if err := c.BodyParser(&body); err != nil || body.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_body"})
	}
	// Do not reveal if user exists
	token, err := d.AuthService.GeneratePasswordResetToken(strings.ToLower(body.Email))
	if err == nil && token != "" {
		_ = d.EmailService.SendPasswordResetEmail(strings.ToLower(body.Email), token)
	}
	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"message": "reset_email_sent"})
}

// ResetPassword verifies the token and updates password
func (d AuthDeps) ResetPassword(c *fiber.Ctx) error {
	var body ResetPasswordRequest
	if err := c.BodyParser(&body); err != nil || body.Token == "" || body.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_body"})
	}
	email, err := d.AuthService.VerifyPasswordResetToken(body.Token)
	if err != nil || email == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_token"})
	}
	user, err := d.Users.GetByEmail(context.Background(), strings.ToLower(email))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "hash_failed"})
	}
	if err := d.Users.UpdatePassword(context.Background(), user.ID, string(hash)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "update_failed"})
	}
	return c.JSON(fiber.Map{"message": "password_updated"})
}

// CreateAPIKey creates an API key for the current user
func (d AuthDeps) CreateAPIKey(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(int64)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}
	var body struct {
		Name      string     `json:"name"`
		ExpiresAt *time.Time `json:"expires_at"`
	}
	_ = c.BodyParser(&body)
	if strings.TrimSpace(body.Name) == "" {
		body.Name = "default"
	}
	// Generate key and hash
	rawKey := generateRandomString(48)
	sum := sha256.Sum256([]byte(rawKey))
	keyHash := hex.EncodeToString(sum[:])
	rec, err := d.APIKeys.Insert(context.Background(), &models.APIKey{UserID: userID, Name: body.Name, KeyHash: keyHash, IsActive: true, ExpiresAt: body.ExpiresAt})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "create_failed"})
	}
	// Return only masked key
	return c.JSON(fiber.Map{"api_key": rawKey, "id": rec.ID, "name": rec.Name})
}

// generateRandomString returns a secure random hex string of length n
func generateRandomString(n int) string {
	if n <= 0 {
		n = 32
	}
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		// fallback to time-based
		return hex.EncodeToString([]byte(time.Now().Format(time.RFC3339Nano)))
	}
	return hex.EncodeToString(b)
}
