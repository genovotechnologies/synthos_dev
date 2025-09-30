package models

import "time"

type UserRole string
const (
	RoleUser UserRole = "user"
	RoleAdmin UserRole = "admin"
	RoleEnterprise UserRole = "enterprise"
)

type SubscriptionTier string
const (
	TierFree SubscriptionTier = "free"
	TierStarter SubscriptionTier = "starter"
	TierProfessional SubscriptionTier = "professional"
	TierGrowth SubscriptionTier = "growth"
	TierEnterprise SubscriptionTier = "enterprise"
)

type User struct {
	ID                 int64            `db:"id" json:"id"`
	Email              string           `db:"email" json:"email"`
	HashedPassword     string           `db:"hashed_password" json:"-"`
	FullName           *string          `db:"full_name" json:"full_name,omitempty"`
	Company            *string          `db:"company" json:"company,omitempty"`
	Role               UserRole         `db:"role" json:"role"`
	IsActive           bool             `db:"is_active" json:"is_active"`
	IsVerified         bool             `db:"is_verified" json:"is_verified"`
	SubscriptionTier   SubscriptionTier `db:"subscription_tier" json:"subscription_tier"`
	CreatedAt          time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time        `db:"updated_at" json:"updated_at"`
}


