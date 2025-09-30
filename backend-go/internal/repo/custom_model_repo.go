package repo

import (
	"context"
	"fmt"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/models"
	"github.com/jmoiron/sqlx"
)

// CustomModelRepo handles custom model management
type CustomModelRepo struct{ db *sqlx.DB }

func NewCustomModelRepo(db *sqlx.DB) *CustomModelRepo { return &CustomModelRepo{db: db} }

func (r *CustomModelRepo) CreateSchema(ctx context.Context) error {
	stmt := `CREATE TABLE IF NOT EXISTS custom_models (
        id BIGSERIAL PRIMARY KEY,
        owner_id BIGINT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NULL,
        model_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'uploading',
        version TEXT NULL,
        framework_version TEXT NULL,
        accuracy_score FLOAT NULL,
        validation_metrics TEXT NULL,
        model_s3_key TEXT NULL,
        config_s3_key TEXT NULL,
        requirements_s3_key TEXT NULL,
        file_size BIGINT NULL,
        supported_column_types TEXT NULL,
        max_columns BIGINT NULL,
        max_rows BIGINT NULL,
        requires_gpu BOOLEAN NOT NULL DEFAULT FALSE,
        usage_count BIGINT NOT NULL DEFAULT 0,
        last_used_at TIMESTAMPTZ NULL,
        tags TEXT NULL,
        model_metadata TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
	_, err := r.db.ExecContext(ctx, stmt)
	return err
}

func (r *CustomModelRepo) Insert(ctx context.Context, model *models.CustomModel) (*models.CustomModel, error) {
	query := `INSERT INTO custom_models (owner_id, name, description, model_type, status, version,
		framework_version, accuracy_score, validation_metrics, model_s3_key, config_s3_key,
		requirements_s3_key, file_size, supported_column_types, max_columns, max_rows,
		requires_gpu, tags, model_metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
		RETURNING id, owner_id, name, description, model_type, status, version, framework_version,
		accuracy_score, validation_metrics, model_s3_key, config_s3_key, requirements_s3_key,
		file_size, supported_column_types, max_columns, max_rows, requires_gpu, usage_count,
		last_used_at, tags, model_metadata, created_at, updated_at`

	var result models.CustomModel
	err := r.db.GetContext(ctx, &result, query,
		model.OwnerID, model.Name, model.Description, model.ModelType, model.Status,
		model.Version, model.FrameworkVersion, model.AccuracyScore, model.ValidationMetrics,
		model.ModelS3Key, model.ConfigS3Key, model.RequirementsS3Key, model.FileSize,
		model.SupportedColumnTypes, model.MaxColumns, model.MaxRows, model.RequiresGPU,
		model.Tags, model.ModelMetadata)

	return &result, err
}

func (r *CustomModelRepo) GetByID(ctx context.Context, id int64) (*models.CustomModel, error) {
	query := `SELECT * FROM custom_models WHERE id = $1`
	var model models.CustomModel
	err := r.db.GetContext(ctx, &model, query, id)
	return &model, err
}

func (r *CustomModelRepo) GetByOwner(ctx context.Context, ownerID int64) ([]models.CustomModel, error) {
	query := `SELECT * FROM custom_models WHERE owner_id = $1 ORDER BY created_at DESC`
	var models []models.CustomModel
	err := r.db.SelectContext(ctx, &models, query, ownerID)
	return models, err
}

func (r *CustomModelRepo) UpdateStatus(ctx context.Context, id int64, status models.CustomModelStatus) error {
	query := `UPDATE custom_models SET status = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, status, id)
	return err
}

func (r *CustomModelRepo) UpdateValidationMetrics(ctx context.Context, id int64, metrics string) error {
	query := `UPDATE custom_models SET validation_metrics = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, metrics, id)
	return err
}

func (r *CustomModelRepo) UpdateAccuracyScore(ctx context.Context, id int64, score float64) error {
	query := `UPDATE custom_models SET accuracy_score = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, score, id)
	return err
}

func (r *CustomModelRepo) IncrementUsage(ctx context.Context, id int64) error {
	query := `UPDATE custom_models SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *CustomModelRepo) Delete(ctx context.Context, id int64, ownerID int64) error {
	query := `DELETE FROM custom_models WHERE id = $1 AND owner_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, ownerID)
	return err
}

func (r *CustomModelRepo) GetSupportedFrameworks() []string {
	return []string{
		"tensorflow", "pytorch", "huggingface", "onnx", "scikit_learn",
	}
}

func (r *CustomModelRepo) ValidateModel(ctx context.Context, model *models.CustomModel) error {
	// Basic validation logic - in a real implementation, this would be more comprehensive
	if model.Name == "" {
		return fmt.Errorf("model name is required")
	}
	if model.OwnerID == 0 {
		return fmt.Errorf("owner ID is required")
	}
	if model.ModelType == "" {
		return fmt.Errorf("model type is required")
	}

	// Check if model type is supported
	supportedTypes := map[models.CustomModelType]bool{
		models.CustomModelTensorFlow:  true,
		models.CustomModelPyTorch:     true,
		models.CustomModelHuggingFace: true,
		models.CustomModelONNX:        true,
		models.CustomModelScikitLearn: true,
	}

	if !supportedTypes[model.ModelType] {
		return fmt.Errorf("unsupported model type: %s", model.ModelType)
	}

	return nil
}
