package v1

import (
	"context"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/usage"
	"github.com/gofiber/fiber/v2"
)

type UsageDeps struct {
	Usage *usage.UsageService
}

func (d UsageDeps) GetUsage(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(int64)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}

	stats, err := d.Usage.GetUsageStats(context.Background(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "usage_fetch_failed"})
	}

	return c.JSON(stats)
}
