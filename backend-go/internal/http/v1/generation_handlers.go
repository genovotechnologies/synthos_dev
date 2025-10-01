package v1

import (
	"context"
	"strconv"
	"time"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/models"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/repo"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/storage"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/usage"
	"github.com/gofiber/fiber/v2"
)

type GenerationDeps struct {
	Generations   *repo.GenerationRepo
	Usage         *usage.UsageService
	StorageClient storage.SignedURLProvider
}

type StartGenerationRequest struct {
	DatasetID int64 `json:"dataset_id"`
	Rows      int64 `json:"rows"`
}

func (d GenerationDeps) Start(c *fiber.Ctx) error {
	owner, _ := c.Locals("user_id").(int64)
	if owner == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}
	var body StartGenerationRequest
	if err := c.BodyParser(&body); err != nil || body.DatasetID == 0 || body.Rows <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_body"})
	}

	// Check usage limits
	canGenerate, reason, err := d.Usage.CanGenerateRows(context.Background(), owner, body.Rows)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "usage_check_failed"})
	}
	if !canGenerate {
		return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
			"error":   reason,
			"message": "Usage limit exceeded. Please upgrade your plan.",
		})
	}

	job := &models.GenerationJob{DatasetID: body.DatasetID, UserID: owner, RowsRequested: body.Rows}
	out, err := d.Generations.Insert(context.Background(), job)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "create_failed"})
	}
	// TODO: enqueue background processing
	return c.Status(fiber.StatusAccepted).JSON(out)
}

func (d GenerationDeps) Get(c *fiber.Ctx) error {
	owner, _ := c.Locals("user_id").(int64)
	if owner == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}
	id, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	job, err := d.Generations.GetByOwner(context.Background(), owner, id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not_found"})
	}
	return c.JSON(job)
}

func (d GenerationDeps) Download(c *fiber.Ctx) error {
	owner, _ := c.Locals("user_id").(int64)
	if owner == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}
	id, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	job, err := d.Generations.GetByOwner(context.Background(), owner, id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not_found"})
	}
	if job.Status != models.GenCompleted || job.OutputKey == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "not_ready"})
	}

	// Generate signed URL if storage client is available
	var downloadURL string
	if d.StorageClient != nil {
		signedURL, err := d.StorageClient.GetSignedURL(context.Background(), *job.OutputKey, 1*time.Hour)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed_to_generate_download_url"})
		}
		downloadURL = signedURL
	} else {
		// Fallback: return the key for development/testing
		downloadURL = *job.OutputKey
	}

	return c.JSON(fiber.Map{"download_url": downloadURL})
}

func (d GenerationDeps) List(c *fiber.Ctx) error {
	owner, _ := c.Locals("user_id").(int64)
	if owner == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}
	jobs, err := d.Generations.ListByOwner(context.Background(), owner, 50, 0)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "list_failed"})
	}
	return c.JSON(jobs)
}

func (d GenerationDeps) Cancel(c *fiber.Ctx) error {
	owner, _ := c.Locals("user_id").(int64)
	if owner == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}
	id, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	if err := d.Generations.Cancel(context.Background(), owner, id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "cancel_failed"})
	}
	return c.JSON(fiber.Map{"message": "job_cancelled"})
}
