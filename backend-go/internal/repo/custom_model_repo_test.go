// Package repo_test provides unit tests for repository implementations
package repo_test

import (
	"database/sql"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/models"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/repo"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCustomModelRepo_Insert(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	modelRepo := repo.NewCustomModelRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		fixture := testutil.DefaultCustomModel()
		model := fixture.ToModel()

		rows := sqlmock.NewRows([]string{"id", "owner_id", "name", "description", "model_type", "status", "version", "framework_version", "accuracy_score", "validation_metrics", "model_s3_key", "config_s3_key", "requirements_s3_key", "file_size", "supported_column_types", "max_columns", "max_rows", "requires_gpu", "usage_count", "last_used_at", "tags", "model_metadata", "created_at", "updated_at"}).
			AddRow(fixture.ID, fixture.OwnerID, fixture.Name, fixture.Description, fixture.ModelType, fixture.Status, fixture.Version, fixture.FrameworkVersion, fixture.AccuracyScore, fixture.ValidationMetrics, fixture.ModelS3Key, fixture.ConfigS3Key, fixture.RequirementsS3Key, fixture.FileSize, fixture.SupportedColumnTypes, fixture.MaxColumns, fixture.MaxRows, fixture.RequiresGPU, fixture.UsageCount, fixture.LastUsedAt, fixture.Tags, fixture.ModelMetadata, fixture.CreatedAt, fixture.UpdatedAt)

		query := `INSERT INTO custom_models (owner_id, name, description, model_type, status, version,
		framework_version, accuracy_score, validation_metrics, model_s3_key, config_s3_key,
		requirements_s3_key, file_size, supported_column_types, max_columns, max_rows,
		requires_gpu, tags, model_metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
		RETURNING id, owner_id, name, description, model_type, status, version, framework_version,
		accuracy_score, validation_metrics, model_s3_key, config_s3_key, requirements_s3_key,
		file_size, supported_column_types, max_columns, max_rows, requires_gpu, usage_count,
		last_used_at, tags, model_metadata, created_at, updated_at`

		testDB.Mock.ExpectQuery(query).
			WithArgs(model.OwnerID, model.Name, model.Description, model.ModelType, model.Status, model.Version, model.FrameworkVersion, model.AccuracyScore, model.ValidationMetrics, model.ModelS3Key, model.ConfigS3Key, model.RequirementsS3Key, model.FileSize, model.SupportedColumnTypes, model.MaxColumns, model.MaxRows, model.RequiresGPU, model.Tags, model.ModelMetadata).
			WillReturnRows(rows)

		result, err := modelRepo.Insert(ctx, model)

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, fixture.ID, result.ID)
		assert.Equal(t, fixture.Name, result.Name)
		assert.Equal(t, fixture.ModelType, result.ModelType)

		testDB.AssertExpectations(t)
	})
}

func TestCustomModelRepo_GetByID(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	modelRepo := repo.NewCustomModelRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		fixture := testutil.DefaultCustomModel()

		rows := sqlmock.NewRows([]string{"id", "owner_id", "name", "description", "model_type", "status", "version", "framework_version", "accuracy_score", "validation_metrics", "model_s3_key", "config_s3_key", "requirements_s3_key", "file_size", "supported_column_types", "max_columns", "max_rows", "requires_gpu", "usage_count", "last_used_at", "tags", "model_metadata", "created_at", "updated_at"}).
			AddRow(fixture.ID, fixture.OwnerID, fixture.Name, fixture.Description, fixture.ModelType, fixture.Status, fixture.Version, fixture.FrameworkVersion, fixture.AccuracyScore, fixture.ValidationMetrics, fixture.ModelS3Key, fixture.ConfigS3Key, fixture.RequirementsS3Key, fixture.FileSize, fixture.SupportedColumnTypes, fixture.MaxColumns, fixture.MaxRows, fixture.RequiresGPU, fixture.UsageCount, fixture.LastUsedAt, fixture.Tags, fixture.ModelMetadata, fixture.CreatedAt, fixture.UpdatedAt)

		query := `SELECT * FROM custom_models WHERE id = $1`

		testDB.Mock.ExpectQuery(query).
			WithArgs(fixture.ID).
			WillReturnRows(rows)

		result, err := modelRepo.GetByID(ctx, fixture.ID)

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, fixture.ID, result.ID)
		assert.Equal(t, fixture.Name, result.Name)

		testDB.AssertExpectations(t)
	})

	t.Run("not found", func(t *testing.T) {
		modelID := int64(999)

		query := `SELECT * FROM custom_models WHERE id = $1`

		testDB.Mock.ExpectQuery(query).
			WithArgs(modelID).
			WillReturnError(sql.ErrNoRows)

		result, err := modelRepo.GetByID(ctx, modelID)

		require.Error(t, err)
		require.Nil(t, result)

		testDB.AssertExpectations(t)
	})
}

func TestCustomModelRepo_GetByOwner(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	modelRepo := repo.NewCustomModelRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		fixture := testutil.DefaultCustomModel()
		ownerID := fixture.OwnerID

		rows := sqlmock.NewRows([]string{"id", "owner_id", "name", "description", "model_type", "status", "version", "framework_version", "accuracy_score", "validation_metrics", "model_s3_key", "config_s3_key", "requirements_s3_key", "file_size", "supported_column_types", "max_columns", "max_rows", "requires_gpu", "usage_count", "last_used_at", "tags", "model_metadata", "created_at", "updated_at"}).
			AddRow(fixture.ID, fixture.OwnerID, fixture.Name, fixture.Description, fixture.ModelType, fixture.Status, fixture.Version, fixture.FrameworkVersion, fixture.AccuracyScore, fixture.ValidationMetrics, fixture.ModelS3Key, fixture.ConfigS3Key, fixture.RequirementsS3Key, fixture.FileSize, fixture.SupportedColumnTypes, fixture.MaxColumns, fixture.MaxRows, fixture.RequiresGPU, fixture.UsageCount, fixture.LastUsedAt, fixture.Tags, fixture.ModelMetadata, fixture.CreatedAt, fixture.UpdatedAt)

		query := `SELECT * FROM custom_models WHERE owner_id = $1 ORDER BY created_at DESC`

		testDB.Mock.ExpectQuery(query).
			WithArgs(ownerID).
			WillReturnRows(rows)

		results, err := modelRepo.GetByOwner(ctx, ownerID)

		require.NoError(t, err)
		require.Len(t, results, 1)
		assert.Equal(t, fixture.ID, results[0].ID)

		testDB.AssertExpectations(t)
	})
}

func TestCustomModelRepo_UpdateStatus(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	modelRepo := repo.NewCustomModelRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		modelID := int64(1)
		newStatus := models.CustomModelReady

		query := `UPDATE custom_models SET status = $1, updated_at = NOW() WHERE id = $2`

		testDB.Mock.ExpectExec(query).
			WithArgs(newStatus, modelID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := modelRepo.UpdateStatus(ctx, modelID, newStatus)

		require.NoError(t, err)
		testDB.AssertExpectations(t)
	})
}

func TestCustomModelRepo_IncrementUsage(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	modelRepo := repo.NewCustomModelRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		modelID := int64(1)

		query := `UPDATE custom_models SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = $1`

		testDB.Mock.ExpectExec(query).
			WithArgs(modelID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := modelRepo.IncrementUsage(ctx, modelID)

		require.NoError(t, err)
		testDB.AssertExpectations(t)
	})
}

func TestCustomModelRepo_ValidateModel(t *testing.T) {
	modelRepo := repo.NewCustomModelRepo(nil)
	ctx := testutil.MockContext()

	t.Run("valid model", func(t *testing.T) {
		fixture := testutil.DefaultCustomModel()
		model := fixture.ToModel()

		err := modelRepo.ValidateModel(ctx, model)

		require.NoError(t, err)
	})

	t.Run("missing name", func(t *testing.T) {
		model := &models.CustomModel{
			OwnerID:   1,
			Name:      "",
			ModelType: models.CustomModelTensorFlow,
		}

		err := modelRepo.ValidateModel(ctx, model)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "name is required")
	})

	t.Run("missing owner ID", func(t *testing.T) {
		model := &models.CustomModel{
			OwnerID:   0,
			Name:      "Test",
			ModelType: models.CustomModelTensorFlow,
		}

		err := modelRepo.ValidateModel(ctx, model)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "owner ID is required")
	})

	t.Run("unsupported model type", func(t *testing.T) {
		model := &models.CustomModel{
			OwnerID:   1,
			Name:      "Test",
			ModelType: "unsupported_type",
		}

		err := modelRepo.ValidateModel(ctx, model)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "unsupported model type")
	})
}

func TestCustomModelRepo_Delete(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	modelRepo := repo.NewCustomModelRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		modelID := int64(1)
		ownerID := int64(1)

		query := `DELETE FROM custom_models WHERE id = $1 AND owner_id = $2`

		testDB.Mock.ExpectExec(query).
			WithArgs(modelID, ownerID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := modelRepo.Delete(ctx, modelID, ownerID)

		require.NoError(t, err)
		testDB.AssertExpectations(t)
	})
}

func TestCustomModelRepo_GetCountByOwner(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	modelRepo := repo.NewCustomModelRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		ownerID := int64(1)
		expectedCount := int64(3)

		rows := sqlmock.NewRows([]string{"count"}).AddRow(expectedCount)

		query := `SELECT COUNT(*) FROM custom_models WHERE owner_id = $1`

		testDB.Mock.ExpectQuery(query).
			WithArgs(ownerID).
			WillReturnRows(rows)

		count, err := modelRepo.GetCountByOwner(ctx, ownerID)

		require.NoError(t, err)
		assert.Equal(t, expectedCount, count)

		testDB.AssertExpectations(t)
	})
}
