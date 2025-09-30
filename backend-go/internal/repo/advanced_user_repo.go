package repo

import (
	"context"
	"time"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/models"
	"github.com/jmoiron/sqlx"
)

// UserUsageRepo handles user usage tracking
type UserUsageRepo struct{ db *sqlx.DB }

func NewUserUsageRepo(db *sqlx.DB) *UserUsageRepo { return &UserUsageRepo{db: db} }

func (r *UserUsageRepo) CreateSchema(ctx context.Context) error {
	stmt := `CREATE TABLE IF NOT EXISTS user_usage (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        rows_generated BIGINT NOT NULL DEFAULT 0,
        datasets_created BIGINT NOT NULL DEFAULT 0,
        custom_models_created BIGINT NOT NULL DEFAULT 0,
        api_requests BIGINT NOT NULL DEFAULT 0,
        storage_used_bytes BIGINT NOT NULL DEFAULT 0,
        processing_time_seconds BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, month, year)
    )`
	_, err := r.db.ExecContext(ctx, stmt)
	return err
}

func (r *UserUsageRepo) GetOrCreate(ctx context.Context, userID int64, month, year int) (*models.UserUsage, error) {
	query := `SELECT * FROM user_usage WHERE user_id = $1 AND month = $2 AND year = $3`
	var usage models.UserUsage
	err := r.db.GetContext(ctx, &usage, query, userID, month, year)
	if err == nil {
		return &usage, nil
	}

	// Create new usage record
	usage = models.UserUsage{
		UserID: userID,
		Month:  month,
		Year:   year,
	}

	insertQuery := `INSERT INTO user_usage (user_id, month, year) VALUES ($1, $2, $3) 
		RETURNING id, user_id, month, year, rows_generated, datasets_created, custom_models_created, 
		api_requests, storage_used_bytes, processing_time_seconds, created_at, updated_at`

	err = r.db.GetContext(ctx, &usage, insertQuery, userID, month, year)
	return &usage, err
}

func (r *UserUsageRepo) IncrementRowsGenerated(ctx context.Context, userID int64, rows int64) error {
	now := time.Now()
	month := int(now.Month())
	year := now.Year()

	query := `INSERT INTO user_usage (user_id, month, year, rows_generated) 
		VALUES ($1, $2, $3, $4) 
		ON CONFLICT (user_id, month, year) 
		DO UPDATE SET rows_generated = user_usage.rows_generated + $4, updated_at = NOW()`

	_, err := r.db.ExecContext(ctx, query, userID, month, year, rows)
	return err
}

// UserSubscriptionRepo handles user subscriptions
type UserSubscriptionRepo struct{ db *sqlx.DB }

func NewUserSubscriptionRepo(db *sqlx.DB) *UserSubscriptionRepo { return &UserSubscriptionRepo{db: db} }

func (r *UserSubscriptionRepo) CreateSchema(ctx context.Context) error {
	stmt := `CREATE TABLE IF NOT EXISTS user_subscriptions (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        subscription_tier TEXT NOT NULL,
        status TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        current_period_start TIMESTAMPTZ NOT NULL,
        current_period_end TIMESTAMPTZ NOT NULL,
        cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
	_, err := r.db.ExecContext(ctx, stmt)
	return err
}

func (r *UserSubscriptionRepo) Insert(ctx context.Context, sub *models.UserSubscription) (*models.UserSubscription, error) {
	query := `INSERT INTO user_subscriptions (user_id, subscription_tier, status, provider, provider_id, 
		current_period_start, current_period_end, cancel_at_period_end)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, subscription_tier, status, provider, provider_id, 
		current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at`

	var result models.UserSubscription
	err := r.db.GetContext(ctx, &result, query, sub.UserID, sub.SubscriptionTier, sub.Status,
		sub.Provider, sub.ProviderID, sub.CurrentPeriodStart, sub.CurrentPeriodEnd, sub.CancelAtPeriodEnd)
	return &result, err
}

func (r *UserSubscriptionRepo) GetByUserID(ctx context.Context, userID int64) (*models.UserSubscription, error) {
	query := `SELECT * FROM user_subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`
	var sub models.UserSubscription
	err := r.db.GetContext(ctx, &sub, query, userID)
	return &sub, err
}

// APIKeyRepo handles API key management
type APIKeyRepo struct{ db *sqlx.DB }

func NewAPIKeyRepo(db *sqlx.DB) *APIKeyRepo { return &APIKeyRepo{db: db} }

func (r *APIKeyRepo) CreateSchema(ctx context.Context) error {
	stmt := `CREATE TABLE IF NOT EXISTS api_keys (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        name TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        last_used TIMESTAMPTZ NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NULL
    )`
	_, err := r.db.ExecContext(ctx, stmt)
	return err
}

func (r *APIKeyRepo) Insert(ctx context.Context, key *models.APIKey) (*models.APIKey, error) {
	query := `INSERT INTO api_keys (user_id, name, key_hash, is_active, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, name, key_hash, last_used, is_active, created_at, expires_at`

	var result models.APIKey
	err := r.db.GetContext(ctx, &result, query, key.UserID, key.Name, key.KeyHash, key.IsActive, key.ExpiresAt)
	return &result, err
}

func (r *APIKeyRepo) GetByUserID(ctx context.Context, userID int64) ([]models.APIKey, error) {
	query := `SELECT * FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`
	var keys []models.APIKey
	err := r.db.SelectContext(ctx, &keys, query, userID)
	return keys, err
}

func (r *APIKeyRepo) GetByHash(ctx context.Context, keyHash string) (*models.APIKey, error) {
	query := `SELECT * FROM api_keys WHERE key_hash = $1 AND is_active = TRUE`
	var key models.APIKey
	err := r.db.GetContext(ctx, &key, query, keyHash)
	return &key, err
}

func (r *APIKeyRepo) UpdateLastUsed(ctx context.Context, keyID int64) error {
	query := `UPDATE api_keys SET last_used = NOW() WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, keyID)
	return err
}

func (r *APIKeyRepo) Deactivate(ctx context.Context, keyID int64, userID int64) error {
	query := `UPDATE api_keys SET is_active = FALSE WHERE id = $1 AND user_id = $2`
	_, err := r.db.ExecContext(ctx, query, keyID, userID)
	return err
}

// AuditLogRepo handles audit logging
type AuditLogRepo struct{ db *sqlx.DB }

func NewAuditLogRepo(db *sqlx.DB) *AuditLogRepo { return &AuditLogRepo{db: db} }

func (r *AuditLogRepo) CreateSchema(ctx context.Context) error {
	stmt := `CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        resource_id TEXT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
	_, err := r.db.ExecContext(ctx, stmt)
	return err
}

func (r *AuditLogRepo) Insert(ctx context.Context, log *models.AuditLog) (*models.AuditLog, error) {
	query := `INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address, user_agent, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, user_id, action, resource, resource_id, ip_address, user_agent, metadata, created_at`

	var result models.AuditLog
	err := r.db.GetContext(ctx, &result, query, log.UserID, log.Action, log.Resource, log.ResourceID,
		log.IPAddress, log.UserAgent, log.Metadata)
	return &result, err
}

func (r *AuditLogRepo) GetByUserID(ctx context.Context, userID int64, limit, offset int) ([]models.AuditLog, error) {
	query := `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
	var logs []models.AuditLog
	err := r.db.SelectContext(ctx, &logs, query, userID, limit, offset)
	return logs, err
}
