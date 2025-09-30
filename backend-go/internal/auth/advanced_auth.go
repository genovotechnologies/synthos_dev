package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type AdvancedAuthService struct {
	redisClient *redis.Client
	blacklist   *Blacklist
	// Advanced security features
	rateLimiter    *RateLimiter
	securityEngine *SecurityEngine
	auditLogger    *AuditLogger
}

// Advanced security structures
type RateLimiter struct {
	redisClient *redis.Client
}

type SecurityEngine struct {
	redisClient *redis.Client
	blacklist   *Blacklist
}

type AuditLogger struct {
	redisClient *redis.Client
}

type SecurityEvent struct {
	EventType   string                 `json:"event_type"`
	UserID      string                 `json:"user_id"`
	IPAddress   string                 `json:"ip_address"`
	UserAgent   string                 `json:"user_agent"`
	Timestamp   time.Time              `json:"timestamp"`
	Severity    string                 `json:"severity"`
	Description string                 `json:"description"`
	Metadata    map[string]interface{} `json:"metadata"`
}

type LoginAttempt struct {
	IPAddress string    `json:"ip_address"`
	Email     string    `json:"email"`
	Success   bool      `json:"success"`
	Timestamp time.Time `json:"timestamp"`
	UserAgent string    `json:"user_agent"`
}

type SecurityMetrics struct {
	FailedAttempts   int       `json:"failed_attempts"`
	SuccessRate      float64   `json:"success_rate"`
	RiskScore        float64   `json:"risk_score"`
	LastLoginTime    time.Time `json:"last_login_time"`
	ConcurrentLogins int       `json:"concurrent_logins"`
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
	// Validate required dependencies
	if redisClient == nil {
		panic("redisClient cannot be nil")
	}
	if blacklist == nil {
		panic("blacklist cannot be nil")
	}

	return &AdvancedAuthService{
		redisClient: redisClient,
		blacklist:   blacklist,
		rateLimiter: &RateLimiter{redisClient: redisClient},
		securityEngine: &SecurityEngine{
			redisClient: redisClient,
			blacklist:   blacklist,
		},
		auditLogger: &AuditLogger{redisClient: redisClient},
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
	_, _ = a.redisClient.Incr(context.Background(), ipKey).Result()
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

// Advanced Security Methods

// ValidatePasswordStrength validates password strength
func (a *AdvancedAuthService) ValidatePasswordStrength(password string) (bool, []string) {
	var errors []string

	// Minimum length
	if len(password) < 12 {
		errors = append(errors, "Password must be at least 12 characters long")
	}

	// Check for uppercase
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	if !hasUpper {
		errors = append(errors, "Password must contain at least one uppercase letter")
	}

	// Check for lowercase
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	if !hasLower {
		errors = append(errors, "Password must contain at least one lowercase letter")
	}

	// Check for numbers
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
	if !hasNumber {
		errors = append(errors, "Password must contain at least one number")
	}

	// Check for special characters
	hasSpecial := regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`).MatchString(password)
	if !hasSpecial {
		errors = append(errors, "Password must contain at least one special character")
	}

	// Check for common patterns
	commonPatterns := []string{
		"password", "123456", "qwerty", "abc123", "admin", "user",
		"login", "welcome", "hello", "test", "demo",
	}

	passwordLower := strings.ToLower(password)
	for _, pattern := range commonPatterns {
		if strings.Contains(passwordLower, pattern) {
			errors = append(errors, "Password contains common patterns")
			break
		}
	}

	return len(errors) == 0, errors
}

// ValidateEmailFormat validates email format
func (a *AdvancedAuthService) ValidateEmailFormat(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// CheckIPReputation checks if IP is from a known malicious source
func (a *AdvancedAuthService) CheckIPReputation(ipAddress string) (bool, error) {
	// Check if IP is in blacklist
	blacklisted, err := a.blacklist.IsBlacklisted(context.Background(), ipAddress)
	if err != nil {
		return false, err
	}

	if blacklisted {
		return false, nil
	}

	// Check for suspicious IP patterns
	ip := net.ParseIP(ipAddress)
	if ip == nil {
		return false, fmt.Errorf("invalid IP address")
	}

	// Check for private IPs (allow for development)
	if ip.IsPrivate() {
		return true, nil
	}

	// Check for known VPN/proxy ranges (simplified)
	// In production, integrate with threat intelligence feeds
	return true, nil
}

// CalculateRiskScore calculates security risk score
func (a *AdvancedAuthService) CalculateRiskScore(userID, ipAddress, userAgent string) (float64, error) {
	ctx := context.Background()
	riskScore := 0.0

	// Get recent login attempts
	attemptsKey := fmt.Sprintf("login_attempts:%s", userID)
	attempts, err := a.redisClient.LRange(ctx, attemptsKey, 0, 9).Result()
	if err != nil && err != redis.Nil {
		return 0, err
	}

	// Calculate risk based on failed attempts
	failedCount := 0
	for _, attempt := range attempts {
		if strings.Contains(attempt, "false") {
			failedCount++
		}
	}

	// Risk increases with failed attempts
	riskScore += float64(failedCount) * 0.1

	// Check for unusual IP patterns
	ipKey := fmt.Sprintf("user_ips:%s", userID)
	ips, err := a.redisClient.SMembers(ctx, ipKey).Result()
	if err != nil && err != redis.Nil {
		return 0, err
	}

	// If IP is new, increase risk
	if !contains(ips, ipAddress) {
		riskScore += 0.2
	}

	// Check for concurrent logins
	concurrentKey := fmt.Sprintf("concurrent_logins:%s", userID)
	concurrentCount, err := a.redisClient.Get(ctx, concurrentKey).Int()
	if err != nil && err != redis.Nil {
		return 0, err
	}

	if concurrentCount > 3 {
		riskScore += 0.3
	}

	// Normalize risk score (0-1)
	if riskScore > 1.0 {
		riskScore = 1.0
	}

	return riskScore, nil
}

// LogSecurityEvent logs security events
func (a *AdvancedAuthService) LogSecurityEvent(event *SecurityEvent) error {
	ctx := context.Background()

	// Store in Redis with TTL
	eventKey := fmt.Sprintf("security_event:%s:%d", event.UserID, time.Now().Unix())

	eventData, err := json.Marshal(event)
	if err != nil {
		return err
	}

	// Store with 30-day TTL
	return a.redisClient.Set(ctx, eventKey, eventData, 30*24*time.Hour).Err()
}

// GetSecurityMetrics retrieves security metrics for a user
func (a *AdvancedAuthService) GetSecurityMetrics(userID string) (*SecurityMetrics, error) {
	ctx := context.Background()

	metrics := &SecurityMetrics{}

	// Get failed attempts
	attemptsKey := fmt.Sprintf("login_attempts:%s", userID)
	attempts, err := a.redisClient.LRange(ctx, attemptsKey, 0, 99).Result()
	if err != nil && err != redis.Nil {
		return nil, err
	}

	failedCount := 0
	totalCount := len(attempts)

	for _, attempt := range attempts {
		if strings.Contains(attempt, "false") {
			failedCount++
		}
	}

	metrics.FailedAttempts = failedCount
	if totalCount > 0 {
		metrics.SuccessRate = float64(totalCount-failedCount) / float64(totalCount)
	}

	// Get concurrent logins
	concurrentKey := fmt.Sprintf("concurrent_logins:%s", userID)
	concurrentCount, err := a.redisClient.Get(ctx, concurrentKey).Int()
	if err != nil && err != redis.Nil {
		concurrentCount = 0
	}
	metrics.ConcurrentLogins = concurrentCount

	// Calculate risk score
	riskScore, err := a.CalculateRiskScore(userID, "", "")
	if err != nil {
		riskScore = 0.5 // Default moderate risk
	}
	metrics.RiskScore = riskScore

	return metrics, nil
}

// Enhanced rate limiting with sliding window
func (a *AdvancedAuthService) CheckRateLimitAdvanced(identifier string, limit int, window time.Duration) (bool, error) {
	ctx := context.Background()
	key := fmt.Sprintf("rate_limit_advanced:%s", identifier)

	now := time.Now()
	windowStart := now.Add(-window)

	// Remove old entries
	a.redisClient.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", windowStart.Unix()))

	// Count current entries
	count, err := a.redisClient.ZCard(ctx, key).Result()
	if err != nil {
		return false, err
	}

	if count >= int64(limit) {
		return false, nil
	}

	// Add current request
	return true, a.redisClient.ZAdd(ctx, key, redis.Z{
		Score:  float64(now.Unix()),
		Member: fmt.Sprintf("%d", now.UnixNano()),
	}).Err()
}

// Helper function
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
