package repo

import (
	"context"
	"strings"
	"time"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/models"
	"github.com/jmoiron/sqlx"
)

type UserRepo struct{ db *sqlx.DB }

func NewUserRepo(db *sqlx.DB) *UserRepo { return &UserRepo{db: db} }

func (r *UserRepo) Create(ctx context.Context, email, hashedPassword string, fullName *string, company *string) (*models.User, error) {
	q := `INSERT INTO users (email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at)
	VALUES ($1,$2,$3,$4,'user',true,false,'free',NOW(),NOW()) RETURNING id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at`
	var u models.User
	if err := r.db.QueryRowxContext(ctx, q, strings.ToLower(email), hashedPassword, fullName, company).StructScan(&u); err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	q := `SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE email=$1 LIMIT 1`
	var u models.User
	if err := r.db.QueryRowxContext(ctx, q, strings.ToLower(email)).StructScan(&u); err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) GetByID(ctx context.Context, id int64) (*models.User, error) {
	q := `SELECT id, email, hashed_password, full_name, company, role, is_active, is_verified, subscription_tier, created_at, updated_at FROM users WHERE id=$1`
	var u models.User
	if err := r.db.QueryRowxContext(ctx, q, id).StructScan(&u); err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) UpdateLastLogin(ctx context.Context, id int64) error {
	q := `UPDATE users SET updated_at=NOW() WHERE id=$1`
	_, err := r.db.ExecContext(ctx, q, id)
	return err
}

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

func (r *UserRepo) Ping(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return r.db.PingContext(ctx)
}

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

func (r *UserRepo) UpdateActive(ctx context.Context, id int64, active bool) error {
	q := `UPDATE users SET is_active=$1, updated_at=NOW() WHERE id=$2`
	_, err := r.db.ExecContext(ctx, q, active, id)
	return err
}

func (r *UserRepo) UpdateRole(ctx context.Context, id int64, role string) error {
	q := `UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2`
	_, err := r.db.ExecContext(ctx, q, role, id)
	return err
}

func (r *UserRepo) UpdateVerified(ctx context.Context, userID int64, isVerified bool) error {
	q := `UPDATE users SET is_verified=$1, updated_at=NOW() WHERE id=$2`
	_, err := r.db.ExecContext(ctx, q, isVerified, userID)
	return err
}

func (r *UserRepo) UpdatePassword(ctx context.Context, userID int64, hashedPassword string) error {
	q := `UPDATE users SET hashed_password=$1, updated_at=NOW() WHERE id=$2`
	_, err := r.db.ExecContext(ctx, q, hashedPassword, userID)
	return err
}

func (r *UserRepo) Update(ctx context.Context, user *models.User) error {
	q := `UPDATE users SET email=$1, full_name=$2, company=$3, updated_at=NOW() WHERE id=$4`
	_, err := r.db.ExecContext(ctx, q, strings.ToLower(user.Email), user.FullName, user.Company, user.ID)
	return err
}

func (r *UserRepo) Delete(ctx context.Context, id int64) error {
	q := `DELETE FROM users WHERE id=$1`
	_, err := r.db.ExecContext(ctx, q, id)
	return err
}
