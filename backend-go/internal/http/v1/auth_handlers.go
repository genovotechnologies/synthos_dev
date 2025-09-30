package v1

import (
	"context"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/auth"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/config"
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
