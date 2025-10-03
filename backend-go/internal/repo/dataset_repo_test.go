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

func TestDatasetRepo_Insert(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	datasetRepo := repo.NewDatasetRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		fixture := testutil.DefaultDataset()
		dataset := fixture.ToModel()

		rows := sqlmock.NewRows([]string{"id", "owner_id", "name", "description", "status", "original_filename", "file_size", "file_type", "object_key", "row_count", "column_count", "created_at", "updated_at"}).
			AddRow(fixture.ID, fixture.OwnerID, fixture.Name, fixture.Description, fixture.Status, fixture.OriginalFile, fixture.FileSize, fixture.FileType, fixture.ObjectKey, fixture.RowCount, fixture.ColumnCount, fixture.CreatedAt, fixture.UpdatedAt)

		query := `INSERT INTO datasets (owner_id, name, description, status, original_filename, file_size, file_type, row_count, column_count)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          RETURNING id, owner_id, name, description, status, original_filename, file_size, file_type, object_key, row_count, column_count, created_at, updated_at`

		testDB.Mock.ExpectQuery(query).
			WithArgs(dataset.OwnerID, dataset.Name, dataset.Description, dataset.Status, dataset.OriginalFile, dataset.FileSize, dataset.FileType, dataset.RowCount, dataset.ColumnCount).
			WillReturnRows(rows)

		result, err := datasetRepo.Insert(ctx, dataset)

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, fixture.ID, result.ID)
		assert.Equal(t, fixture.Name, result.Name)

		testDB.AssertExpectations(t)
	})
}

func TestDatasetRepo_GetByOwnerID(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	datasetRepo := repo.NewDatasetRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		fixture := testutil.DefaultDataset()

		rows := sqlmock.NewRows([]string{"id", "owner_id", "name", "description", "status", "original_filename", "file_size", "file_type", "object_key", "row_count", "column_count", "created_at", "updated_at"}).
			AddRow(fixture.ID, fixture.OwnerID, fixture.Name, fixture.Description, fixture.Status, fixture.OriginalFile, fixture.FileSize, fixture.FileType, fixture.ObjectKey, fixture.RowCount, fixture.ColumnCount, fixture.CreatedAt, fixture.UpdatedAt)

		query := `SELECT id, owner_id, name, description, status, original_filename, file_size, file_type, object_key, row_count, column_count, created_at, updated_at
          FROM datasets WHERE owner_id=$1 AND id=$2`

		testDB.Mock.ExpectQuery(query).
			WithArgs(fixture.OwnerID, fixture.ID).
			WillReturnRows(rows)

		result, err := datasetRepo.GetByOwnerID(ctx, fixture.OwnerID, fixture.ID)

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, fixture.ID, result.ID)
		assert.Equal(t, fixture.OwnerID, result.OwnerID)

		testDB.AssertExpectations(t)
	})

	t.Run("not found", func(t *testing.T) {
		ownerID := int64(1)
		datasetID := int64(999)

		query := `SELECT id, owner_id, name, description, status, original_filename, file_size, file_type, object_key, row_count, column_count, created_at, updated_at
          FROM datasets WHERE owner_id=$1 AND id=$2`

		testDB.Mock.ExpectQuery(query).
			WithArgs(ownerID, datasetID).
			WillReturnError(sql.ErrNoRows)

		result, err := datasetRepo.GetByOwnerID(ctx, ownerID, datasetID)

		require.Error(t, err)
		require.Nil(t, result)

		testDB.AssertExpectations(t)
	})
}

func TestDatasetRepo_ListByOwner(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	datasetRepo := repo.NewDatasetRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		fixture := testutil.DefaultDataset()
		ownerID := fixture.OwnerID

		rows := sqlmock.NewRows([]string{"id", "owner_id", "name", "description", "status", "original_filename", "file_size", "file_type", "object_key", "row_count", "column_count", "created_at", "updated_at"}).
			AddRow(fixture.ID, fixture.OwnerID, fixture.Name, fixture.Description, fixture.Status, fixture.OriginalFile, fixture.FileSize, fixture.FileType, fixture.ObjectKey, fixture.RowCount, fixture.ColumnCount, fixture.CreatedAt, fixture.UpdatedAt)

		query := `SELECT id, owner_id, name, description, status, original_filename, file_size, file_type, object_key, row_count, column_count, created_at, updated_at
          FROM datasets WHERE owner_id=$1 AND status <> 'archived' ORDER BY created_at DESC LIMIT $2 OFFSET $3`

		testDB.Mock.ExpectQuery(query).
			WithArgs(ownerID, 10, 0).
			WillReturnRows(rows)

		results, err := datasetRepo.ListByOwner(ctx, ownerID, 10, 0)

		require.NoError(t, err)
		require.Len(t, results, 1)
		assert.Equal(t, fixture.ID, results[0].ID)

		testDB.AssertExpectations(t)
	})
}

func TestDatasetRepo_UpdateObjectKey(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	datasetRepo := repo.NewDatasetRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		datasetID := int64(1)
		objectKey := "datasets/test.csv"
		newStatus := models.DatasetReady

		query := `UPDATE datasets SET object_key=$1, status=$2, updated_at=NOW() WHERE id=$3`

		testDB.Mock.ExpectExec(query).
			WithArgs(objectKey, newStatus, datasetID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := datasetRepo.UpdateObjectKey(ctx, datasetID, objectKey, newStatus)

		require.NoError(t, err)
		testDB.AssertExpectations(t)
	})
}

func TestDatasetRepo_GetCountByOwner(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	datasetRepo := repo.NewDatasetRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		ownerID := int64(1)
		expectedCount := int64(5)

		rows := sqlmock.NewRows([]string{"count"}).AddRow(expectedCount)

		query := `SELECT COUNT(*) FROM datasets WHERE owner_id = $1 AND status <> 'archived'`

		testDB.Mock.ExpectQuery(query).
			WithArgs(ownerID).
			WillReturnRows(rows)

		count, err := datasetRepo.GetCountByOwner(ctx, ownerID)

		require.NoError(t, err)
		assert.Equal(t, expectedCount, count)

		testDB.AssertExpectations(t)
	})
}

func TestDatasetRepo_Archive(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	datasetRepo := repo.NewDatasetRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		datasetID := int64(1)
		ownerID := int64(1)

		query := `UPDATE datasets SET status='archived', updated_at=NOW() WHERE owner_id=$1 AND id=$2`

		testDB.Mock.ExpectExec(query).
			WithArgs(ownerID, datasetID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := datasetRepo.Archive(ctx, ownerID, datasetID)

		require.NoError(t, err)
		testDB.AssertExpectations(t)
	})
}
