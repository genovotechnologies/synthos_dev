package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type AdvancedAuthService struct {
	redisClient *redis.Client
	blacklist   *Blacklist
}

type TokenType string

const (
	TokenTypeAccess            TokenType = "access"
	TokenTypeRefresh           TokenType = "refresh"
	TokenTypeEmailVerification TokenType = "email_verification"
	TokenTypePasswordReset     TokenType = "password_reset"
	TokenTypeAPIKey            TokenType = "api_key"
)

type AuthTokens struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
}

type EmailVerificationRequest struct {
	Email string `json:"email"`
}

type PasswordResetRequest struct {
	Email string `json:"email"`
}

type PasswordResetConfirm struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

type APIKeyRequest struct {
	Name      string     `json:"name"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

func NewAdvancedAuthService(redisClient *redis.Client, blacklist *Blacklist) *AdvancedAuthService {
	return &AdvancedAuthService{
		redisClient: redisClient,
		blacklist:   blacklist,
	}
}

// GenerateEmailVerificationToken creates a secure token for email verification
func (a *AdvancedAuthService) GenerateEmailVerificationToken(email string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"email": email,
		"type":  string(TokenTypeEmailVerification),
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	})

	return token.SignedString([]byte("email_verification_secret")) // Use proper secret from config
}

// VerifyEmailVerificationToken validates email verification token
func (a *AdvancedAuthService) VerifyEmailVerificationToken(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte("email_verification_secret"), nil
	})

	if err != nil {
		return "", err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		if claims["type"] != string(TokenTypeEmailVerification) {
			return "", fmt.Errorf("invalid token type")
		}
		return claims["email"].(string), nil
	}

	return "", fmt.Errorf("invalid token")
}

// GeneratePasswordResetToken creates a secure token for password reset
func (a *AdvancedAuthService) GeneratePasswordResetToken(email string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"email": email,
		"type":  string(TokenTypePasswordReset),
		"exp":   time.Now().Add(1 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	})

	return token.SignedString([]byte("password_reset_secret")) // Use proper secret from config
}

// VerifyPasswordResetToken validates password reset token
func (a *AdvancedAuthService) VerifyPasswordResetToken(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte("password_reset_secret"), nil
	})

	if err != nil {
		return "", err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		if claims["type"] != string(TokenTypePasswordReset) {
			return "", fmt.Errorf("invalid token type")
		}
		return claims["email"].(string), nil
	}

	return "", fmt.Errorf("invalid token")
}

// GenerateAPIKey creates a secure API key
func (a *AdvancedAuthService) GenerateAPIKey() (string, string, error) {
	// Generate random bytes
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", err
	}

	// Create API key with prefix
	apiKey := "sk_" + hex.EncodeToString(bytes)

	// Hash the key for storage
	hash := sha256.Sum256([]byte(apiKey))
	keyHash := hex.EncodeToString(hash[:])

	return apiKey, keyHash, nil
}

// HashPassword hashes a password using bcrypt
func (a *AdvancedAuthService) HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	return string(bytes), err
}

// VerifyPassword verifies a password against its hash
func (a *AdvancedAuthService) VerifyPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// CheckRateLimit verifies if user/IP is within rate limits
func (a *AdvancedAuthService) CheckRateLimit(identifier string, limit int, window time.Duration) (bool, error) {
	key := fmt.Sprintf("rate_limit:%s", identifier)

	// Get current count
	count, err := a.redisClient.Get(context.Background(), key).Int()
	if err != nil && err != redis.Nil {
		return false, err
	}

	if count >= limit {
		return false, nil
	}

	// Increment counter
	pipe := a.redisClient.Pipeline()
	pipe.Incr(context.Background(), key)
	pipe.Expire(context.Background(), key, window)
	_, err = pipe.Exec(context.Background())

	return err == nil, err
}

// CheckAccountLockout verifies if account is locked due to failed attempts
func (a *AdvancedAuthService) CheckAccountLockout(email string) (bool, error) {
	key := fmt.Sprintf("account_lockout:%s", email)
	exists, err := a.redisClient.Exists(context.Background(), key).Result()
	return exists > 0, err
}

// LockAccount locks an account due to too many failed attempts
func (a *AdvancedAuthService) LockAccount(email string, duration time.Duration) error {
	key := fmt.Sprintf("account_lockout:%s", email)
	return a.redisClient.Set(context.Background(), key, "locked", duration).Err()
}

// RecordFailedAttempt records a failed login attempt
func (a *AdvancedAuthService) RecordFailedAttempt(email, ipAddress string) error {
	// Record for email
	emailKey := fmt.Sprintf("failed_attempts:email:%s", email)
	emailCount, _ := a.redisClient.Incr(context.Background(), emailKey).Result()
	a.redisClient.Expire(context.Background(), emailKey, 15*time.Minute)

	// Record for IP
	ipKey := fmt.Sprintf("failed_attempts:ip:%s", ipAddress)
	ipCount, _ := a.redisClient.Incr(context.Background(), ipKey).Result()
	a.redisClient.Expire(context.Background(), ipKey, 15*time.Minute)

	// Lock account if too many attempts
	if emailCount >= 5 {
		return a.LockAccount(email, 15*time.Minute)
	}

	return nil
}

// ClearFailedAttempts clears failed attempt counters
func (a *AdvancedAuthService) ClearFailedAttempts(email, ipAddress string) error {
	emailKey := fmt.Sprintf("failed_attempts:email:%s", email)
	ipKey := fmt.Sprintf("failed_attempts:ip:%s", ipAddress)

	pipe := a.redisClient.Pipeline()
	pipe.Del(context.Background(), emailKey)
	pipe.Del(context.Background(), ipKey)
	_, err := pipe.Exec(context.Background())

	return err
}
