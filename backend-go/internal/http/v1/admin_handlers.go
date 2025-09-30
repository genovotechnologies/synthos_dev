package v1

import (
	"context"
	"fmt"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/repo"
	"github.com/gofiber/fiber/v2"
)

type AdminDeps struct{ Users *repo.UserRepo }

func (a AdminDeps) RequireAdmin(next fiber.Handler) fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, _ := c.Locals("claims").(map[string]any)
		if claims == nil || claims["role"] != "admin" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "admin_required"})
		}
		return next(c)
	}
}

func (a AdminDeps) ListUsers(c *fiber.Ctx) error {
	users, err := a.Users.List(context.Background(), 100, 0)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "list_failed"})
	}
	return c.JSON(users)
}

func (a AdminDeps) UpdateUserStatus(c *fiber.Ctx) error {
	idParam := c.Params("id")
	var body struct {
		Status string `json:"status"`
		Role   string `json:"role"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_body"})
	}
	if body.Status != "" {
		active := body.Status == "active"
		if err := a.Users.UpdateActive(context.Background(), parseID(idParam), active); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "update_failed"})
		}
	}
	if body.Role != "" {
		if err := a.Users.UpdateRole(context.Background(), parseID(idParam), body.Role); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "update_failed"})
		}
	}
	return c.JSON(fiber.Map{"message": "updated"})
}

func (a AdminDeps) DeleteUser(c *fiber.Ctx) error {
	if err := a.Users.Delete(context.Background(), parseID(c.Params("id"))); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "delete_failed"})
	}
	return c.JSON(fiber.Map{"message": "deleted"})
}

func parseID(s string) int64 { var id int64; _, _ = fmt.Sscanf(s, "%d", &id); return id }
