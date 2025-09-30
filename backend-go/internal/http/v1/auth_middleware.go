package v1

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/auth"
	"github.com/gofiber/fiber/v2"
)

// AuthMiddleware validates JWT from Authorization Bearer or synthos_token cookie
func (d AuthDeps) AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := ""
		if h := c.Get("Authorization"); strings.HasPrefix(strings.ToLower(h), "bearer ") {
			token = strings.TrimSpace(h[len("Bearer "):])
		}
		if token == "" {
			token = c.Cookies("synthos_token")
		}
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
		}
		claims, err := auth.ParseAndValidate(d.Cfg.JwtSecret, d.Cfg.JwtAlg, token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_token"})
		}
		// blacklist check
		blacklisted, _ := d.Blacklist.IsBlacklisted(context.Background(), token)
		if blacklisted {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_token"})
		}

		// extract user_id
		raw := claims["user_id"]
		var userID int64
		switch v := raw.(type) {
		case float64:
			userID = int64(v)
		case int64:
			userID = v
		case json.Number:
			if n, err := v.Int64(); err == nil {
				userID = n
			}
		}
		if userID == 0 {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_token"})
		}
		c.Locals("user_id", userID)
		c.Locals("claims", claims)
		return c.Next()
	}
}
