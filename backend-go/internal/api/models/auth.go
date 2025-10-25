package models

import "time"

// POST /auth/register
type RegisterBody struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	CompanyName string `json:"company_name"`
	FullName    string `json:"full_name"`
}

// POST /auth/register
type RegisterResponse struct {
	UserId    string    `json:"user_id"`
	Email     string    `json:"email"`
	CompanyID string    `json:"company_id"`
	CreatedAt time.Time `json:"created_at"`
}

// POST /auth/login
type LoginBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoggedinUser struct {
	UserId           string `json:"user_id"`
	Email            string `json:"email"`
	CompanyName      string `json:"company_name"`
	SubscriptionTier string `json:"subscription_tier"`
}

// POST /auth/login
type LoginResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	TokenType    string       `json:"token_type"`
	ExpiresIn    int32        `json:"expires_in"`
	User         LoggedinUser `json:"user"`
}

// POST /auth/refresh
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// POST /auth/refresh
type RefreshResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int32  `json:"expires_in"`
}
