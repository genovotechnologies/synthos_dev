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

type UpdateProfileRequest struct {
	FullName *string `json:"full_name"`
	Email    *string `json:"email"`
}

func (d UserDeps) UpdateProfile(c *fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	userID, _ := userIDVal.(int64)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}

	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request"})
	}

	// Get current user
	u, err := d.Users.GetByID(context.Background(), userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	// Update fields if provided
	if req.FullName != nil {
		u.FullName = req.FullName
	}
	if req.Email != nil {
		// Check if email is already taken
		existingUser, _ := d.Users.GetByEmail(context.Background(), *req.Email)
		if existingUser != nil && existingUser.ID != userID {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "email_already_exists"})
		}
		u.Email = *req.Email
	}

	// Update user in database
	if err := d.Users.Update(context.Background(), u); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "update_failed"})
	}

	return c.JSON(fiber.Map{
		"id":                u.ID,
		"email":             u.Email,
		"full_name":         u.FullName,
		"subscription_tier": u.SubscriptionTier,
		"message":           "profile_updated",
	})
}
