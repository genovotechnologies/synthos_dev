package v1

import (
	"context"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/repo"
	"github.com/gofiber/fiber/v2"
)

type UserDeps struct {
	Users *repo.UserRepo
}

func (d UserDeps) Me(c *fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	userID, _ := userIDVal.(int64)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}
	u, err := d.Users.GetByID(context.Background(), userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}
	return c.JSON(fiber.Map{
		"id":                u.ID,
		"email":             u.Email,
		"full_name":         u.FullName,
		"subscription_tier": u.SubscriptionTier,
		"created_at":        u.CreatedAt,
	})
}
