package v1

import (
	"context"
	"mime/multipart"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/models"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/repo"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/usage"
	"github.com/gofiber/fiber/v2"
)

type DatasetDeps struct {
	Datasets *repo.DatasetRepo
	Usage    *usage.UsageService
}

func (d DatasetDeps) List(c *fiber.Ctx) error {
	owner, _ := c.Locals("user_id").(int64)
	if owner == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}
	items, err := d.Datasets.ListByOwner(context.Background(), owner, 100, 0)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "list_failed"})
	}
	return c.JSON(items)
}

func (d DatasetDeps) Upload(c *fiber.Ctx) error {
	owner, _ := c.Locals("user_id").(int64)
	if owner == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}

	// Check dataset limits
	canCreate, reason, err := d.Usage.CanCreateDataset(context.Background(), owner)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "usage_check_failed"})
	}
	if !canCreate {
		return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
			"error":   reason,
			"message": "Dataset limit exceeded. Please upgrade your plan.",
		})
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "file_required"})
	}
	ext := strings.TrimPrefix(strings.ToLower(filepath.Ext(fileHeader.Filename)), ".")
	switch ext {
	case "csv", "json", "xlsx", "xls", "parquet":
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unsupported_format"})
	}

	// Note: storage integration (GCS/S3) to be implemented; for now store metadata only
	ds := &models.Dataset{
		OwnerID:      owner,
		Name:         fileHeader.Filename,
		Description:  nil,
		Status:       models.DatasetProcessing,
		OriginalFile: fileHeader.Filename,
		FileSize:     fileHeader.Size,
		FileType:     ext,
		RowCount:     0,
		ColumnCount:  0,
	}
	out, err := d.Datasets.Insert(context.Background(), ds)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "create_failed"})
	}
	// TODO: async upload + schema detection
	return c.Status(fiber.StatusAccepted).JSON(out)
}

func getFile(h *multipart.FileHeader) (multipart.File, error) { return h.Open() }

func (d DatasetDeps) Get(c *fiber.Ctx) error {
	owner, _ := c.Locals("user_id").(int64)
	if owner == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}
	id, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	ds, err := d.Datasets.GetByOwnerID(context.Background(), owner, id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not_found"})
	}
	return c.JSON(ds)
}

func (d DatasetDeps) Delete(c *fiber.Ctx) error {
	owner, _ := c.Locals("user_id").(int64)
	if owner == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}
	id, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	if err := d.Datasets.Archive(context.Background(), owner, id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "delete_failed"})
	}
	return c.JSON(fiber.Map{"message": "dataset_deleted"})
}

func (d DatasetDeps) Preview(c *fiber.Ctx) error {
	owner, _ := c.Locals("user_id").(int64)
	if owner == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}
	// Placeholder: return static preview shape; storage/parse to be implemented
	return c.JSON(fiber.Map{
		"rows_shown": 0,
		"total_rows": 0,
		"columns":    []string{},
		"data":       []any{},
	})
}

func (d DatasetDeps) Download(c *fiber.Ctx) error {
	owner, _ := c.Locals("user_id").(int64)
	if owner == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_required"})
	}
	// Placeholder: use STORAGE_BASE_URL if present
	base := c.App().Config().AppName // placeholder no-op
	_ = base
	return c.JSON(fiber.Map{"download_url": c.Get("X-Storage-Preview-Base")})
}
