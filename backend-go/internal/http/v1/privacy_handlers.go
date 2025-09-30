package v1

import "github.com/gofiber/fiber/v2"

type PrivacyDeps struct{}

func (d PrivacyDeps) GetSettings(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"privacy_level": "medium", "data_retention": 30})
}

func (d PrivacyDeps) UpdateSettings(c *fiber.Ctx) error {
	var body map[string]any
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_body"})
	}
	return c.JSON(body)
}
