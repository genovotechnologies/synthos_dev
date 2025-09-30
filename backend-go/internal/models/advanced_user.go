package models

import (
	"time"
)

// UserUsage tracks user's monthly usage for billing and limits
type UserUsage struct {
	ID                    int64     `db:"id" json:"id"`
	UserID                int64     `db:"user_id" json:"user_id"`
	Month                 int       `db:"month" json:"month"`
	Year                  int       `db:"year" json:"year"`
	RowsGenerated         int64     `db:"rows_generated" json:"rows_generated"`
	DatasetsCreated       int64     `db:"datasets_created" json:"datasets_created"`
	CustomModelsCreated   int64     `db:"custom_models_created" json:"custom_models_created"`
	APIRequests           int64     `db:"api_requests" json:"api_requests"`
	StorageUsedBytes      int64     `db:"storage_used_bytes" json:"storage_used_bytes"`
	ProcessingTimeSeconds int64     `db:"processing_time_seconds" json:"processing_time_seconds"`
	CreatedAt             time.Time `db:"created_at" json:"created_at"`
	UpdatedAt             time.Time `db:"updated_at" json:"updated_at"`
}

// UserSubscription tracks user's subscription details
type UserSubscription struct {
	ID                 int64              `db:"id" json:"id"`
	UserID             int64              `db:"user_id" json:"user_id"`
	SubscriptionTier   SubscriptionTier   `db:"subscription_tier" json:"subscription_tier"`
	Status             SubscriptionStatus `db:"status" json:"status"`
	Provider           string             `db:"provider" json:"provider"` // "stripe", "paddle"
	ProviderID         string             `db:"provider_id" json:"provider_id"`
	CurrentPeriodStart time.Time          `db:"current_period_start" json:"current_period_start"`
	CurrentPeriodEnd   time.Time          `db:"current_period_end" json:"current_period_end"`
	CancelAtPeriodEnd  bool               `db:"cancel_at_period_end" json:"cancel_at_period_end"`
	CreatedAt          time.Time          `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time          `db:"updated_at" json:"updated_at"`
}

type SubscriptionStatus string

const (
	SubStatusActive    SubscriptionStatus = "active"
	SubStatusInactive  SubscriptionStatus = "inactive"
	SubStatusCancelled SubscriptionStatus = "cancelled"
	SubStatusPastDue   SubscriptionStatus = "past_due"
	SubStatusTrial     SubscriptionStatus = "trial"
)

// APIKey represents user API keys for programmatic access
type APIKey struct {
	ID        int64      `db:"id" json:"id"`
	UserID    int64      `db:"user_id" json:"user_id"`
	Name      string     `db:"name" json:"name"`
	KeyHash   string     `db:"key_hash" json:"-"` // Never expose the actual key
	LastUsed  *time.Time `db:"last_used" json:"last_used"`
	IsActive  bool       `db:"is_active" json:"is_active"`
	CreatedAt time.Time  `db:"created_at" json:"created_at"`
	ExpiresAt *time.Time `db:"expires_at" json:"expires_at"`
}

// AuditLog tracks user actions for security and compliance
type AuditLog struct {
	ID         int64     `db:"id" json:"id"`
	UserID     *int64    `db:"user_id" json:"user_id"` // Nullable for anonymous actions
	Action     string    `db:"action" json:"action"`
	Resource   string    `db:"resource" json:"resource"`
	ResourceID *string   `db:"resource_id" json:"resource_id"`
	IPAddress  string    `db:"ip_address" json:"ip_address"`
	UserAgent  string    `db:"user_agent" json:"user_agent"`
	Metadata   string    `db:"metadata" json:"metadata"` // JSON string
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
}
