// Package repo provides database repository implementations for the Synthos API.
// Repositories encapsulate data access logic and provide a clean interface
// for interacting with the PostgreSQL database.
package repo

import (
	"context"
	"strings"
	"time"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/models"
	"github.com/jmoiron/sqlx"
)

// UserRepo provides database operations for user management.
// It handles user CRUD operations, authentication queries, and user lifecycle management.
type UserRepo struct{ db *sqlx.DB }

// NewUserRepo creates a new UserRepo instance with the provided database connection.
// The database connection should be properly configured with connection pooling.
//
// Example:
//
//	db := sqlx.Connect("postgres", connString)
//	userRepo := repo.NewUserRepo(db)
func NewUserRepo(db *sqlx.DB) *UserRepo { return &UserRepo{db: db} }

// Create inserts a new user into the database with the provided details.
// Email addresses are automatically normalized to lowercase.
// The user is created with default values: role='user', is_active=true,
// is_verified=false, subscription_tier='free'.
//
// Parameters:
//   - ctx: Context for cancellation and timeout
//   - email: User's email address (will be normalized to lowercase)
//   - hashedPassword: Pre-hashed password (should use bcrypt)
//   - fullName: Optional full name of the user
//   - company: Optional company/organization name
//
// Returns the created user with generated ID and timestamps, or an error if creation fails.
// Common errors include duplicate email violations (unique constraint).
func (r *UserRepo) Create(ctx context.Context, email, hashedPassword string, fullName *string, company *string) (*models.User, error) {
	q := `INSERT INTO users (email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at)
	VALUES ($1,$2,$3,$4,'user',true,false,'free',NOW(),NOW()) RETURNING id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at`
	var u models.User
	if err := r.db.QueryRowxContext(ctx, q, strings.ToLower(email), hashedPassword, fullName, company).StructScan(&u); err != nil {
		return nil, err
	}
	return &u, nil
}

// GetByEmail retrieves a user by their email address.
// Email addresses are normalized to lowercase before querying.
//
// Returns the user if found, or sql.ErrNoRows if no user exists with the given email.
func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	q := `SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE email=$1 LIMIT 1`
	var u models.User
	if err := r.db.QueryRowxContext(ctx, q, strings.ToLower(email)).StructScan(&u); err != nil {
		return nil, err
	}
	return &u, nil
}

// GetByID retrieves a user by their unique ID.
//
// Returns the user if found, or sql.ErrNoRows if no user exists with the given ID.
func (r *UserRepo) GetByID(ctx context.Context, id int64) (*models.User, error) {
	q := `SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE id=$1`
	var u models.User
	if err := r.db.QueryRowxContext(ctx, q, id).StructScan(&u); err != nil {
		return nil, err
	}
	return &u, nil
}

// UpdateLastLogin updates the updated_at timestamp for a user.
// This is typically called after successful authentication to track user activity.
func (r *UserRepo) UpdateLastLogin(ctx context.Context, id int64) error {
	q := `UPDATE users SET updated_at=NOW() WHERE id=$1`
	_, err := r.db.ExecContext(ctx, q, id)
	return err
}

// CreateSchema creates the users table if it doesn't exist.
// This should be called during application initialization.
// The table includes indexes for email lookups and subscription tier filtering.
func (r *UserRepo) CreateSchema(ctx context.Context) error {
	stmt := `CREATE TABLE IF NOT EXISTS users (
		id BIGSERIAL PRIMARY KEY,
		email TEXT UNIQUE NOT NULL,
		hashed_password TEXT NOT NULL,
		full_name TEXT NULL,
		company TEXT NULL,
		role TEXT NOT NULL DEFAULT 'user',
		is_active BOOLEAN NOT NULL DEFAULT true,
		is_verified BOOLEAN NOT NULL DEFAULT false,
		subscription_tier TEXT NOT NULL DEFAULT 'free',
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`
	_, err := r.db.ExecContext(ctx, stmt)
	return err
}

// Ping checks the database connection health with a 2-second timeout.
// This is useful for health checks and ensuring database connectivity.
func (r *UserRepo) Ping(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return r.db.PingContext(ctx)
}

// List retrieves a paginated list of users ordered by creation date (newest first).
// Sensitive fields like hashed_password are excluded from the result.
//
// Parameters:
//   - limit: Maximum number of users to return
//   - offset: Number of users to skip (for pagination)
func (r *UserRepo) List(ctx context.Context, limit, offset int) ([]models.User, error) {
	q := `SELECT id, email, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`
	rows, err := r.db.QueryxContext(ctx, q, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []models.User
	for rows.Next() {
		var u models.User
		if err := rows.StructScan(&u); err != nil {
			return nil, err
		}
		res = append(res, u)
	}
	return res, rows.Err()
}

// UpdateActive updates the is_active status of a user.
// Inactive users cannot authenticate or access the API.
// This is typically used for account suspension or deactivation.
func (r *UserRepo) UpdateActive(ctx context.Context, id int64, active bool) error {
	q := `UPDATE users SET is_active=$1, updated_at=NOW() WHERE id=$2`
	_, err := r.db.ExecContext(ctx, q, active, id)
	return err
}

// UpdateRole updates the role of a user (e.g., 'user', 'admin').
// This affects the user's permissions and access levels.
func (r *UserRepo) UpdateRole(ctx context.Context, id int64, role string) error {
	q := `UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2`
	_, err := r.db.ExecContext(ctx, q, role, id)
	return err
}

// UpdateVerified updates the email verification status of a user.
// This is typically set to true after a user confirms their email address.
func (r *UserRepo) UpdateVerified(ctx context.Context, userID int64, isVerified bool) error {
	q := `UPDATE users SET is_verified=$1, updated_at=NOW() WHERE id=$2`
	_, err := r.db.ExecContext(ctx, q, isVerified, userID)
	return err
}

// UpdatePassword updates the hashed password for a user.
// The password should be hashed using bcrypt before calling this method.
// This is used for password reset and password change operations.
func (r *UserRepo) UpdatePassword(ctx context.Context, userID int64, hashedPassword string) error {
	q := `UPDATE users SET hashed_password=$1, updated_at=NOW() WHERE id=$2`
	_, err := r.db.ExecContext(ctx, q, hashedPassword, userID)
	return err
}

// Update updates the basic profile information for a user.
// This includes email, full name, and company fields.
// The email is automatically normalized to lowercase.
func (r *UserRepo) Update(ctx context.Context, user *models.User) error {
	q := `UPDATE users SET email=$1, full_name=$2, company=$3, updated_at=NOW() WHERE id=$4`
	_, err := r.db.ExecContext(ctx, q, strings.ToLower(user.Email), user.FullName, user.Company, user.ID)
	return err
}

// Delete permanently removes a user from the database.
// WARNING: This is a destructive operation. Consider soft deletes or account deactivation
// instead for production use to maintain referential integrity and audit trails.
func (r *UserRepo) Delete(ctx context.Context, id int64) error {
	q := `DELETE FROM users WHERE id=$1`
	_, err := r.db.ExecContext(ctx, q, id)
	return err
}
