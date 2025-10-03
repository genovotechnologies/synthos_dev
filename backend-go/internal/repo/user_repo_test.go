// Package repo_test provides unit tests for repository implementations
package repo_test

import (
	"database/sql"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/models"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/repo"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserRepo_Create(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	userRepo := repo.NewUserRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		email := "test@example.com"
		password := "hashed_password"
		fullName := "Test User"
		company := "Test Co"

		now := time.Now()
		rows := sqlmock.NewRows([]string{"id", "email", "hashed_password", "full_name", "company", "role", "is_active", "is_verified", "subscription_tier", "created_at", "updated_at"}).
			AddRow(1, email, password, fullName, company, "user", true, false, "free", now, now)

		query := `INSERT INTO users (email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at)
	VALUES ($1,$2,$3,$4,'user',true,false,'free',NOW(),NOW()) RETURNING id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at`

		testDB.Mock.ExpectQuery(query).
			WithArgs(email, password, fullName, company).
			WillReturnRows(rows)

		user, err := userRepo.Create(ctx, email, password, &fullName, &company)

		require.NoError(t, err)
		require.NotNil(t, user)
		assert.Equal(t, int64(1), user.ID)
		assert.Equal(t, email, user.Email)
		assert.Equal(t, password, user.HashedPassword)
		assert.Equal(t, &fullName, user.FullName)
		assert.Equal(t, models.RoleUser, user.Role)

		testDB.AssertExpectations(t)
	})

	t.Run("duplicate email error", func(t *testing.T) {
		email := "duplicate@example.com"
		password := "hashed_password"

		query := `INSERT INTO users (email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at)
	VALUES ($1,$2,$3,$4,'user',true,false,'free',NOW(),NOW()) RETURNING id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at`

		testDB.Mock.ExpectQuery(query).
			WithArgs(email, password, nil, nil).
			WillReturnError(sql.ErrNoRows)

		user, err := userRepo.Create(ctx, email, password, nil, nil)

		require.Error(t, err)
		require.Nil(t, user)

		testDB.AssertExpectations(t)
	})
}

func TestUserRepo_GetByEmail(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	userRepo := repo.NewUserRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		fixture := testutil.DefaultUser()
		email := fixture.Email

		rows := sqlmock.NewRows([]string{"id", "email", "hashed_password", "full_name", "company", "role", "is_active", "is_verified", "subscription_tier", "created_at", "updated_at"}).
			AddRow(fixture.ID, fixture.Email, fixture.HashedPassword, fixture.FullName, fixture.Company, fixture.Role, fixture.IsActive, fixture.IsVerified, fixture.SubscriptionTier, fixture.CreatedAt, fixture.UpdatedAt)

		query := `SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE email=$1 LIMIT 1`

		testDB.Mock.ExpectQuery(query).
			WithArgs(email).
			WillReturnRows(rows)

		user, err := userRepo.GetByEmail(ctx, email)

		require.NoError(t, err)
		require.NotNil(t, user)
		assert.Equal(t, fixture.ID, user.ID)
		assert.Equal(t, fixture.Email, user.Email)

		testDB.AssertExpectations(t)
	})

	t.Run("not found", func(t *testing.T) {
		email := "notfound@example.com"

		query := `SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE email=$1 LIMIT 1`

		testDB.Mock.ExpectQuery(query).
			WithArgs(email).
			WillReturnError(sql.ErrNoRows)

		user, err := userRepo.GetByEmail(ctx, email)

		require.Error(t, err)
		require.Nil(t, user)
		assert.Equal(t, sql.ErrNoRows, err)

		testDB.AssertExpectations(t)
	})
}

func TestUserRepo_GetByID(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	userRepo := repo.NewUserRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		fixture := testutil.DefaultUser()

		rows := sqlmock.NewRows([]string{"id", "email", "hashed_password", "full_name", "company", "role", "is_active", "is_verified", "subscription_tier", "created_at", "updated_at"}).
			AddRow(fixture.ID, fixture.Email, fixture.HashedPassword, fixture.FullName, fixture.Company, fixture.Role, fixture.IsActive, fixture.IsVerified, fixture.SubscriptionTier, fixture.CreatedAt, fixture.UpdatedAt)

		query := `SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE id=$1`

		testDB.Mock.ExpectQuery(query).
			WithArgs(fixture.ID).
			WillReturnRows(rows)

		user, err := userRepo.GetByID(ctx, fixture.ID)

		require.NoError(t, err)
		require.NotNil(t, user)
		assert.Equal(t, fixture.ID, user.ID)
		assert.Equal(t, fixture.Email, user.Email)

		testDB.AssertExpectations(t)
	})

	t.Run("not found", func(t *testing.T) {
		userID := int64(999)

		query := `SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE id=$1`

		testDB.Mock.ExpectQuery(query).
			WithArgs(userID).
			WillReturnError(sql.ErrNoRows)

		user, err := userRepo.GetByID(ctx, userID)

		require.Error(t, err)
		require.Nil(t, user)

		testDB.AssertExpectations(t)
	})
}

func TestUserRepo_UpdatePassword(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	userRepo := repo.NewUserRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		userID := int64(1)
		newPassword := "new_hashed_password"

		query := `UPDATE users SET hashed_password=$1, updated_at=NOW() WHERE id=$2`

		testDB.Mock.ExpectExec(query).
			WithArgs(newPassword, userID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := userRepo.UpdatePassword(ctx, userID, newPassword)

		require.NoError(t, err)
		testDB.AssertExpectations(t)
	})
}

func TestUserRepo_UpdateVerified(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	userRepo := repo.NewUserRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		userID := int64(1)
		isVerified := true

		query := `UPDATE users SET is_verified=$1, updated_at=NOW() WHERE id=$2`

		testDB.Mock.ExpectExec(query).
			WithArgs(isVerified, userID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := userRepo.UpdateVerified(ctx, userID, isVerified)

		require.NoError(t, err)
		testDB.AssertExpectations(t)
	})
}

func TestUserRepo_List(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	userRepo := repo.NewUserRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		fixture1 := testutil.DefaultUser()
		fixture2 := testutil.AdminUser()

		rows := sqlmock.NewRows([]string{"id", "email", "full_name", "company", "role", "is_active", "is_verified", "subscription_tier", "created_at", "updated_at"}).
			AddRow(fixture1.ID, fixture1.Email, fixture1.FullName, fixture1.Company, fixture1.Role, fixture1.IsActive, fixture1.IsVerified, fixture1.SubscriptionTier, fixture1.CreatedAt, fixture1.UpdatedAt).
			AddRow(fixture2.ID, fixture2.Email, fixture2.FullName, fixture2.Company, fixture2.Role, fixture2.IsActive, fixture2.IsVerified, fixture2.SubscriptionTier, fixture2.CreatedAt, fixture2.UpdatedAt)

		query := `SELECT id, email, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`

		testDB.Mock.ExpectQuery(query).
			WithArgs(10, 0).
			WillReturnRows(rows)

		users, err := userRepo.List(ctx, 10, 0)

		require.NoError(t, err)
		require.Len(t, users, 2)
		assert.Equal(t, fixture1.Email, users[0].Email)
		assert.Equal(t, fixture2.Email, users[1].Email)

		testDB.AssertExpectations(t)
	})
}

func TestUserRepo_Delete(t *testing.T) {
	testDB := testutil.NewTestDB(t)
	defer testDB.Close()

	userRepo := repo.NewUserRepo(testDB.DB)
	ctx := testutil.MockContext()

	t.Run("success", func(t *testing.T) {
		userID := int64(1)

		query := `DELETE FROM users WHERE id=$1`

		testDB.Mock.ExpectExec(query).
			WithArgs(userID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := userRepo.Delete(ctx, userID)

		require.NoError(t, err)
		testDB.AssertExpectations(t)
	})
}
