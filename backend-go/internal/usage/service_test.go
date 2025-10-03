// Package usage_test provides unit tests for the usage service
package usage_test

import (
	"database/sql"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/repo"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/testutil"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/usage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupUsageService(t *testing.T) (*usage.UsageService, *testutil.TestDB, *testutil.TestDB, *testutil.TestDB, *testutil.TestDB) {
	userDB := testutil.NewTestDB(t)
	genDB := testutil.NewTestDB(t)
	dsDB := testutil.NewTestDB(t)
	modelDB := testutil.NewTestDB(t)

	userRepo := repo.NewUserRepo(userDB.DB)
	genRepo := repo.NewGenerationRepo(genDB.DB)
	dsRepo := repo.NewDatasetRepo(dsDB.DB)
	customModelRepo := repo.NewCustomModelRepo(modelDB.DB)

	service := usage.NewUsageService(userRepo, genRepo, dsRepo, customModelRepo)

	return service, userDB, genDB, dsDB, modelDB
}

func TestUsageService_GetUsageStats(t *testing.T) {
	service, userDB, genDB, dsDB, modelDB := setupUsageService(t)
	defer userDB.Close()
	defer genDB.Close()
	defer dsDB.Close()
	defer modelDB.Close()

	ctx := testutil.MockContext()
	userID := int64(1)

	t.Run("success - free tier user", func(t *testing.T) {
		// Mock user retrieval
		userFixture := testutil.DefaultUser()
		userRows := sqlmock.NewRows([]string{"id", "email", "hashed_password", "full_name", "company", "role", "is_active", "is_verified", "subscription_tier", "created_at", "updated_at"}).
			AddRow(userFixture.ID, userFixture.Email, userFixture.HashedPassword, userFixture.FullName, userFixture.Company, userFixture.Role, userFixture.IsActive, userFixture.IsVerified, userFixture.SubscriptionTier, userFixture.CreatedAt, userFixture.UpdatedAt)

		userDB.Mock.ExpectQuery(`SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE id=\$1`).
			WithArgs(userID).
			WillReturnRows(userRows)

		// Mock monthly rows generated
		genDB.Mock.ExpectQuery(`SELECT COALESCE\(SUM\(rows_generated\), 0\) FROM generation_jobs WHERE user_id = \$1 AND status = 'completed' AND created_at >= \$2`).
			WithArgs(userID, sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"sum"}).AddRow(500))

		// Mock dataset count
		dsDB.Mock.ExpectQuery(`SELECT COUNT\(\*\) FROM datasets WHERE owner_id = \$1 AND status <> 'archived'`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		// Mock custom model count
		modelDB.Mock.ExpectQuery(`SELECT COUNT\(\*\) FROM custom_models WHERE owner_id = \$1`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		stats, err := service.GetUsageStats(ctx, userID)

		require.NoError(t, err)
		require.NotNil(t, stats)
		assert.Equal(t, int64(500), stats.MonthlyRowsGenerated)
		assert.Equal(t, int64(2), stats.TotalDatasets)
		assert.Equal(t, int64(1), stats.TotalCustomModels)
		assert.Equal(t, int64(10000), stats.PlanLimits.MonthlyRowLimit)
		assert.Equal(t, int64(5), stats.PlanLimits.MaxDatasets)

		userDB.AssertExpectations(t)
		genDB.AssertExpectations(t)
		dsDB.AssertExpectations(t)
		modelDB.AssertExpectations(t)
	})

	t.Run("user not found", func(t *testing.T) {
		userDB.Mock.ExpectQuery(`SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE id=\$1`).
			WithArgs(userID).
			WillReturnError(sql.ErrNoRows)

		stats, err := service.GetUsageStats(ctx, userID)

		require.Error(t, err)
		require.Nil(t, stats)

		userDB.AssertExpectations(t)
	})
}

func TestUsageService_CanGenerateRows(t *testing.T) {
	service, userDB, genDB, dsDB, modelDB := setupUsageService(t)
	defer userDB.Close()
	defer genDB.Close()
	defer dsDB.Close()
	defer modelDB.Close()

	ctx := testutil.MockContext()
	userID := int64(1)

	t.Run("within limit", func(t *testing.T) {
		// Mock user
		userFixture := testutil.DefaultUser()
		userRows := sqlmock.NewRows([]string{"id", "email", "hashed_password", "full_name", "company", "role", "is_active", "is_verified", "subscription_tier", "created_at", "updated_at"}).
			AddRow(userFixture.ID, userFixture.Email, userFixture.HashedPassword, userFixture.FullName, userFixture.Company, userFixture.Role, userFixture.IsActive, userFixture.IsVerified, userFixture.SubscriptionTier, userFixture.CreatedAt, userFixture.UpdatedAt)

		userDB.Mock.ExpectQuery(`SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE id=\$1`).
			WithArgs(userID).
			WillReturnRows(userRows)

		// Mock monthly rows (5000 used, 10000 limit, requesting 1000 more = OK)
		genDB.Mock.ExpectQuery(`SELECT COALESCE\(SUM\(rows_done\), 0\) FROM generation_jobs WHERE owner_id=\$1 AND created_at >= \$2 AND status='completed'`).
			WithArgs(userID, sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"sum"}).AddRow(5000))

		dsDB.Mock.ExpectQuery(`SELECT COUNT\(\*\) FROM datasets WHERE owner_id = \$1 AND status <> 'archived'`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		modelDB.Mock.ExpectQuery(`SELECT COUNT\(\*\) FROM custom_models WHERE owner_id = \$1`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		canGenerate, reason, err := service.CanGenerateRows(ctx, userID, 1000)

		require.NoError(t, err)
		assert.True(t, canGenerate)
		assert.Empty(t, reason)

		userDB.AssertExpectations(t)
		genDB.AssertExpectations(t)
		dsDB.AssertExpectations(t)
		modelDB.AssertExpectations(t)
	})

	t.Run("exceeds limit", func(t *testing.T) {
		userFixture := testutil.DefaultUser()
		userRows := sqlmock.NewRows([]string{"id", "email", "hashed_password", "full_name", "company", "role", "is_active", "is_verified", "subscription_tier", "created_at", "updated_at"}).
			AddRow(userFixture.ID, userFixture.Email, userFixture.HashedPassword, userFixture.FullName, userFixture.Company, userFixture.Role, userFixture.IsActive, userFixture.IsVerified, userFixture.SubscriptionTier, userFixture.CreatedAt, userFixture.UpdatedAt)

		userDB.Mock.ExpectQuery(`SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE id=\$1`).
			WithArgs(userID).
			WillReturnRows(userRows)

		// Mock monthly rows (9500 used, 10000 limit, requesting 1000 more = NOT OK)
		genDB.Mock.ExpectQuery(`SELECT COALESCE\(SUM\(rows_done\), 0\) FROM generation_jobs WHERE owner_id=\$1 AND created_at >= \$2 AND status='completed'`).
			WithArgs(userID, sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"sum"}).AddRow(9500))

		dsDB.Mock.ExpectQuery(`SELECT COUNT\(\*\) FROM datasets WHERE owner_id = \$1 AND status <> 'archived'`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		modelDB.Mock.ExpectQuery(`SELECT COUNT\(\*\) FROM custom_models WHERE owner_id = \$1`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		canGenerate, reason, err := service.CanGenerateRows(ctx, userID, 1000)

		require.NoError(t, err)
		assert.False(t, canGenerate)
		assert.Equal(t, "monthly_limit_exceeded", reason)

		userDB.AssertExpectations(t)
		genDB.AssertExpectations(t)
		dsDB.AssertExpectations(t)
		modelDB.AssertExpectations(t)
	})
}

func TestUsageService_CanCreateDataset(t *testing.T) {
	service, userDB, genDB, dsDB, modelDB := setupUsageService(t)
	defer userDB.Close()
	defer genDB.Close()
	defer dsDB.Close()
	defer modelDB.Close()

	ctx := testutil.MockContext()
	userID := int64(1)

	t.Run("within limit", func(t *testing.T) {
		userFixture := testutil.DefaultUser()
		userRows := sqlmock.NewRows([]string{"id", "email", "hashed_password", "full_name", "company", "role", "is_active", "is_verified", "subscription_tier", "created_at", "updated_at"}).
			AddRow(userFixture.ID, userFixture.Email, userFixture.HashedPassword, userFixture.FullName, userFixture.Company, userFixture.Role, userFixture.IsActive, userFixture.IsVerified, userFixture.SubscriptionTier, userFixture.CreatedAt, userFixture.UpdatedAt)

		userDB.Mock.ExpectQuery(`SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE id=\$1`).
			WithArgs(userID).
			WillReturnRows(userRows)

		genDB.Mock.ExpectQuery(`SELECT COALESCE\(SUM\(rows_done\), 0\) FROM generation_jobs WHERE owner_id=\$1 AND created_at >= \$2 AND status='completed'`).
			WithArgs(userID, sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"sum"}).AddRow(5000))

		// Has 2 datasets, limit is 5 = OK
		dsDB.Mock.ExpectQuery(`SELECT COUNT\(\*\) FROM datasets WHERE owner_id = \$1 AND status <> 'archived'`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		modelDB.Mock.ExpectQuery(`SELECT COUNT\(\*\) FROM custom_models WHERE owner_id = \$1`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		canCreate, reason, err := service.CanCreateDataset(ctx, userID)

		require.NoError(t, err)
		assert.True(t, canCreate)
		assert.Empty(t, reason)

		userDB.AssertExpectations(t)
		genDB.AssertExpectations(t)
		dsDB.AssertExpectations(t)
		modelDB.AssertExpectations(t)
	})

	t.Run("exceeds limit", func(t *testing.T) {
		userFixture := testutil.DefaultUser()
		userRows := sqlmock.NewRows([]string{"id", "email", "hashed_password", "full_name", "company", "role", "is_active", "is_verified", "subscription_tier", "created_at", "updated_at"}).
			AddRow(userFixture.ID, userFixture.Email, userFixture.HashedPassword, userFixture.FullName, userFixture.Company, userFixture.Role, userFixture.IsActive, userFixture.IsVerified, userFixture.SubscriptionTier, userFixture.CreatedAt, userFixture.UpdatedAt)

		userDB.Mock.ExpectQuery(`SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE id=\$1`).
			WithArgs(userID).
			WillReturnRows(userRows)

		genDB.Mock.ExpectQuery(`SELECT COALESCE\(SUM\(rows_done\), 0\) FROM generation_jobs WHERE owner_id=\$1 AND created_at >= \$2 AND status='completed'`).
			WithArgs(userID, sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"sum"}).AddRow(5000))

		// Has 5 datasets, limit is 5 = NOT OK
		dsDB.Mock.ExpectQuery(`SELECT COUNT\(\*\) FROM datasets WHERE owner_id = \$1 AND status <> 'archived'`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5))

		modelDB.Mock.ExpectQuery(`SELECT COUNT\(\*\) FROM custom_models WHERE owner_id = \$1`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		canCreate, reason, err := service.CanCreateDataset(ctx, userID)

		require.NoError(t, err)
		assert.False(t, canCreate)
		assert.Equal(t, "dataset_limit_exceeded", reason)

		userDB.AssertExpectations(t)
		genDB.AssertExpectations(t)
		dsDB.AssertExpectations(t)
		modelDB.AssertExpectations(t)
	})
}

func TestUsageService_CanCreateCustomModel(t *testing.T) {
	service, userDB, genDB, dsDB, modelDB := setupUsageService(t)
	defer userDB.Close()
	defer genDB.Close()
	defer dsDB.Close()
	defer modelDB.Close()

	ctx := testutil.MockContext()
	userID := int64(1)

	t.Run("within limit", func(t *testing.T) {
		userFixture := testutil.DefaultUser()
		userRows := sqlmock.NewRows([]string{"id", "email", "hashed_password", "full_name", "company", "role", "is_active", "is_verified", "subscription_tier", "created_at", "updated_at"}).
			AddRow(userFixture.ID, userFixture.Email, userFixture.HashedPassword, userFixture.FullName, userFixture.Company, userFixture.Role, userFixture.IsActive, userFixture.IsVerified, userFixture.SubscriptionTier, userFixture.CreatedAt, userFixture.UpdatedAt)

		userDB.Mock.ExpectQuery(`SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE id=\$1`).
			WithArgs(userID).
			WillReturnRows(userRows)

		genDB.Mock.ExpectQuery(`SELECT COALESCE\(SUM\(rows_done\), 0\) FROM generation_jobs WHERE owner_id=\$1 AND created_at >= \$2 AND status='completed'`).
			WithArgs(userID, sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"sum"}).AddRow(5000))

		dsDB.Mock.ExpectQuery(`SELECT COUNT\(\*\) FROM datasets WHERE owner_id = \$1 AND status <> 'archived'`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		// Has 0 custom models, limit is 1 = OK
		modelDB.Mock.ExpectQuery(`SELECT COUNT\(\*\) FROM custom_models WHERE owner_id = \$1`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

		canCreate, reason, err := service.CanCreateCustomModel(ctx, userID)

		require.NoError(t, err)
		assert.True(t, canCreate)
		assert.Empty(t, reason)

		userDB.AssertExpectations(t)
		genDB.AssertExpectations(t)
		dsDB.AssertExpectations(t)
		modelDB.AssertExpectations(t)
	})

	t.Run("exceeds limit", func(t *testing.T) {
		userFixture := testutil.DefaultUser()
		userRows := sqlmock.NewRows([]string{"id", "email", "hashed_password", "full_name", "company", "role", "is_active", "is_verified", "subscription_tier", "created_at", "updated_at"}).
			AddRow(userFixture.ID, userFixture.Email, userFixture.HashedPassword, userFixture.FullName, userFixture.Company, userFixture.Role, userFixture.IsActive, userFixture.IsVerified, userFixture.SubscriptionTier, userFixture.CreatedAt, userFixture.UpdatedAt)

		userDB.Mock.ExpectQuery(`SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE id=\$1`).
			WithArgs(userID).
			WillReturnRows(userRows)

		genDB.Mock.ExpectQuery(`SELECT COALESCE\(SUM\(rows_done\), 0\) FROM generation_jobs WHERE owner_id=\$1 AND created_at >= \$2 AND status='completed'`).
			WithArgs(userID, sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"sum"}).AddRow(5000))

		dsDB.Mock.ExpectQuery(`SELECT COUNT\(\*\) FROM datasets WHERE owner_id = \$1 AND status <> 'archived'`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		// Has 1 custom model, limit is 1 = NOT OK
		modelDB.Mock.ExpectQuery(`SELECT COUNT\(\*\) FROM custom_models WHERE owner_id = \$1`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		canCreate, reason, err := service.CanCreateCustomModel(ctx, userID)

		require.NoError(t, err)
		assert.False(t, canCreate)
		assert.Equal(t, "custom_model_limit_exceeded", reason)

		userDB.AssertExpectations(t)
		genDB.AssertExpectations(t)
		dsDB.AssertExpectations(t)
		modelDB.AssertExpectations(t)
	})
}
