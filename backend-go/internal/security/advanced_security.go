package security

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// ThreatLevel represents the severity of a security threat
type ThreatLevel string

const (
	ThreatLevelLow      ThreatLevel = "low"
	ThreatLevelMedium   ThreatLevel = "medium"
	ThreatLevelHigh     ThreatLevel = "high"
	ThreatLevelCritical ThreatLevel = "critical"
)

// SecurityEvent represents a security event
type SecurityEvent struct {
	ID        string                 `json:"id"`
	Timestamp time.Time              `json:"timestamp"`
	Level     ThreatLevel            `json:"level"`
	Type      string                 `json:"type"`
	Source    string                 `json:"source"`
	IPAddress string                 `json:"ip_address"`
	UserAgent string                 `json:"user_agent"`
	Details   map[string]interface{} `json:"details"`
	Action    string                 `json:"action"`
	Blocked   bool                   `json:"blocked"`
}

// SecurityService handles advanced security operations
type SecurityService struct {
	blockedIPs     map[string]time.Time
	rateLimits     map[string]*RateLimit
	threatPatterns []ThreatPattern
	securityEvents []SecurityEvent
}

// RateLimit represents rate limiting information
type RateLimit struct {
	IPAddress   string    `json:"ip_address"`
	Requests    int       `json:"requests"`
	WindowStart time.Time `json:"window_start"`
	Blocked     bool      `json:"blocked"`
}

// ThreatPattern represents a pattern for detecting threats
type ThreatPattern struct {
	Name        string         `json:"name"`
	Pattern     *regexp.Regexp `json:"pattern"`
	Level       ThreatLevel    `json:"level"`
	Description string         `json:"description"`
}

// NewSecurityService creates a new security service
func NewSecurityService() *SecurityService {
	service := &SecurityService{
		blockedIPs:     make(map[string]time.Time),
		rateLimits:     make(map[string]*RateLimit),
		securityEvents: make([]SecurityEvent, 0),
	}

	// Initialize threat patterns
	service.initializeThreatPatterns()

	return service
}

// initializeThreatPatterns sets up common threat detection patterns
func (ss *SecurityService) initializeThreatPatterns() {
	ss.threatPatterns = []ThreatPattern{
		{
			Name:        "SQL Injection",
			Pattern:     regexp.MustCompile(`(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute)`),
			Level:       ThreatLevelHigh,
			Description: "Potential SQL injection attempt",
		},
		{
			Name:        "XSS Attack",
			Pattern:     regexp.MustCompile(`(?i)(<script|javascript:|onload=|onerror=|onclick=)`),
			Level:       ThreatLevelHigh,
			Description: "Potential XSS attack attempt",
		},
		{
			Name:        "Path Traversal",
			Pattern:     regexp.MustCompile(`(\.\./|\.\.\\|%2e%2e%2f|%2e%2e%5c)`),
			Level:       ThreatLevelMedium,
			Description: "Potential path traversal attempt",
		},
		{
			Name:        "Command Injection",
			Pattern:     regexp.MustCompile(`(?i)(;|\||&|` + "`" + `|\$\(|\$\{)`),
			Level:       ThreatLevelHigh,
			Description: "Potential command injection attempt",
		},
		{
			Name:        "LDAP Injection",
			Pattern:     regexp.MustCompile(`(?i)(\*|\(|\)|\\|/|\||&)`),
			Level:       ThreatLevelMedium,
			Description: "Potential LDAP injection attempt",
		},
		{
			Name:        "NoSQL Injection",
			Pattern:     regexp.MustCompile(`(?i)(\$where|\$ne|\$gt|\$lt|\$regex)`),
			Level:       ThreatLevelHigh,
			Description: "Potential NoSQL injection attempt",
		},
	}
}

// AnalyzeRequest analyzes an HTTP request for security threats
func (ss *SecurityService) AnalyzeRequest(r *http.Request) (*SecurityEvent, error) {
	ip := ss.getClientIP(r)
	userAgent := r.UserAgent()

	// Check if IP is blocked
	if ss.isIPBlocked(ip) {
		return &SecurityEvent{
			ID:        generateEventID(),
			Timestamp: time.Now(),
			Level:     ThreatLevelHigh,
			Type:      "blocked_ip",
			Source:    "security_service",
			IPAddress: ip,
			UserAgent: userAgent,
			Details: map[string]interface{}{
				"reason": "IP address is blocked",
			},
			Action:  "blocked",
			Blocked: true,
		}, nil
	}

	// Check rate limiting
	if ss.isRateLimited(ip) {
		return &SecurityEvent{
			ID:        generateEventID(),
			Timestamp: time.Now(),
			Level:     ThreatLevelMedium,
			Type:      "rate_limit",
			Source:    "security_service",
			IPAddress: ip,
			UserAgent: userAgent,
			Details: map[string]interface{}{
				"reason": "Rate limit exceeded",
			},
			Action:  "rate_limited",
			Blocked: true,
		}, nil
	}

	// Analyze request for threats
	threats := ss.detectThreats(r)
	if len(threats) > 0 {
		// Get the highest threat level
		highestLevel := ss.getHighestThreatLevel(threats)

		event := &SecurityEvent{
			ID:        generateEventID(),
			Timestamp: time.Now(),
			Level:     highestLevel,
			Type:      "threat_detected",
			Source:    "security_service",
			IPAddress: ip,
			UserAgent: userAgent,
			Details: map[string]interface{}{
				"threats": threats,
				"url":     r.URL.String(),
				"method":  r.Method,
			},
			Action:  "threat_detected",
			Blocked: highestLevel == ThreatLevelCritical || highestLevel == ThreatLevelHigh,
		}

		// Log the security event
		ss.logSecurityEvent(*event)

		return event, nil
	}

	// Update rate limiting
	ss.updateRateLimit(ip)

	return nil, nil
}

// detectThreats analyzes the request for security threats
func (ss *SecurityService) detectThreats(r *http.Request) []map[string]interface{} {
	var threats []map[string]interface{}

	// Check URL parameters
	for key, values := range r.URL.Query() {
		for _, value := range values {
			threat := ss.checkForThreats(value, "query_param", key)
			if threat != nil {
				threats = append(threats, threat)
			}
		}
	}

	// Check headers
	for key, values := range r.Header {
		for _, value := range values {
			threat := ss.checkForThreats(value, "header", key)
			if threat != nil {
				threats = append(threats, threat)
			}
		}
	}

	// Check body (if it's a POST/PUT request)
	if r.Method == "POST" || r.Method == "PUT" {
		// This would require reading the body, which should be done carefully
		// to avoid consuming the request body
	}

	return threats
}

// checkForThreats checks a string value for security threats
func (ss *SecurityService) checkForThreats(value, source, field string) map[string]interface{} {
	for _, pattern := range ss.threatPatterns {
		if pattern.Pattern.MatchString(value) {
			return map[string]interface{}{
				"pattern":     pattern.Name,
				"level":       pattern.Level,
				"description": pattern.Description,
				"source":      source,
				"field":       field,
				"value":       value,
			}
		}
	}
	return nil
}

// getHighestThreatLevel returns the highest threat level from a list of threats
func (ss *SecurityService) getHighestThreatLevel(threats []map[string]interface{}) ThreatLevel {
	highest := ThreatLevelLow

	for _, threat := range threats {
		if level, ok := threat["level"].(ThreatLevel); ok {
			switch level {
			case ThreatLevelCritical:
				return ThreatLevelCritical
			case ThreatLevelHigh:
				if highest != ThreatLevelCritical {
					highest = ThreatLevelHigh
				}
			case ThreatLevelMedium:
				if highest != ThreatLevelCritical && highest != ThreatLevelHigh {
					highest = ThreatLevelMedium
				}
			}
		}
	}

	return highest
}

// isIPBlocked checks if an IP address is blocked
func (ss *SecurityService) isIPBlocked(ip string) bool {
	blockTime, exists := ss.blockedIPs[ip]
	if !exists {
		return false
	}

	// Check if block has expired (24 hours)
	if time.Since(blockTime) > 24*time.Hour {
		delete(ss.blockedIPs, ip)
		return false
	}

	return true
}

// isRateLimited checks if an IP address is rate limited
func (ss *SecurityService) isRateLimited(ip string) bool {
	rateLimit, exists := ss.rateLimits[ip]
	if !exists {
		return false
	}

	// Reset window if it's been more than 1 minute
	if time.Since(rateLimit.WindowStart) > time.Minute {
		rateLimit.Requests = 0
		rateLimit.WindowStart = time.Now()
		rateLimit.Blocked = false
		return false
	}

	// Check if rate limit exceeded (100 requests per minute)
	if rateLimit.Requests >= 100 {
		rateLimit.Blocked = true
		return true
	}

	return false
}

// updateRateLimit updates the rate limit for an IP address
func (ss *SecurityService) updateRateLimit(ip string) {
	rateLimit, exists := ss.rateLimits[ip]
	if !exists {
		rateLimit = &RateLimit{
			IPAddress:   ip,
			Requests:    0,
			WindowStart: time.Now(),
			Blocked:     false,
		}
		ss.rateLimits[ip] = rateLimit
	}

	rateLimit.Requests++
}

// BlockIP blocks an IP address
func (ss *SecurityService) BlockIP(ip string, duration time.Duration) {
	ss.blockedIPs[ip] = time.Now()

	// Log the block event
	event := SecurityEvent{
		ID:        generateEventID(),
		Timestamp: time.Now(),
		Level:     ThreatLevelHigh,
		Type:      "ip_blocked",
		Source:    "security_service",
		IPAddress: ip,
		Details: map[string]interface{}{
			"duration": duration.String(),
			"reason":   "Manual block",
		},
		Action: "ip_blocked",
	}

	ss.logSecurityEvent(event)
}

// UnblockIP unblocks an IP address
func (ss *SecurityService) UnblockIP(ip string) {
	delete(ss.blockedIPs, ip)

	// Log the unblock event
	event := SecurityEvent{
		ID:        generateEventID(),
		Timestamp: time.Now(),
		Level:     ThreatLevelLow,
		Type:      "ip_unblocked",
		Source:    "security_service",
		IPAddress: ip,
		Details: map[string]interface{}{
			"reason": "Manual unblock",
		},
		Action: "ip_unblocked",
	}

	ss.logSecurityEvent(event)
}

// GetBlockedIPs returns all blocked IP addresses
func (ss *SecurityService) GetBlockedIPs() []string {
	var blockedIPs []string
	for ip := range ss.blockedIPs {
		blockedIPs = append(blockedIPs, ip)
	}
	return blockedIPs
}

// GetSecurityEvents returns security events with filtering
func (ss *SecurityService) GetSecurityEvents(filters SecurityEventFilters) []SecurityEvent {
	var filteredEvents []SecurityEvent

	for _, event := range ss.securityEvents {
		if ss.matchesFilters(event, filters) {
			filteredEvents = append(filteredEvents, event)
		}
	}

	return filteredEvents
}

// SecurityEventFilters represents filters for security events
type SecurityEventFilters struct {
	Level     ThreatLevel `json:"level,omitempty"`
	Type      string      `json:"type,omitempty"`
	IPAddress string      `json:"ip_address,omitempty"`
	StartTime *time.Time  `json:"start_time,omitempty"`
	EndTime   *time.Time  `json:"end_time,omitempty"`
	Blocked   *bool       `json:"blocked,omitempty"`
	Limit     int         `json:"limit,omitempty"`
}

// matchesFilters checks if an event matches the given filters
func (ss *SecurityService) matchesFilters(event SecurityEvent, filters SecurityEventFilters) bool {
	if filters.Level != "" && event.Level != filters.Level {
		return false
	}
	if filters.Type != "" && event.Type != filters.Type {
		return false
	}
	if filters.IPAddress != "" && event.IPAddress != filters.IPAddress {
		return false
	}
	if filters.StartTime != nil && event.Timestamp.Before(*filters.StartTime) {
		return false
	}
	if filters.EndTime != nil && event.Timestamp.After(*filters.EndTime) {
		return false
	}
	if filters.Blocked != nil && event.Blocked != *filters.Blocked {
		return false
	}

	return true
}

// logSecurityEvent logs a security event
func (ss *SecurityService) logSecurityEvent(event SecurityEvent) {
	ss.securityEvents = append(ss.securityEvents, event)

	// Keep only last 1000 events to prevent memory issues
	if len(ss.securityEvents) > 1000 {
		ss.securityEvents = ss.securityEvents[1:]
	}
}

// getClientIP extracts the client IP address from the request
func (ss *SecurityService) getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}

	return ip
}

// ValidateInput validates user input for security
func (ss *SecurityService) ValidateInput(input string, inputType string) (bool, []string) {
	var issues []string

	// Check for common injection patterns
	for _, pattern := range ss.threatPatterns {
		if pattern.Pattern.MatchString(input) {
			issues = append(issues, fmt.Sprintf("Potential %s detected", pattern.Name))
		}
	}

	// Check for excessive length
	if len(input) > 10000 {
		issues = append(issues, "Input too long")
	}

	// Check for null bytes
	if strings.Contains(input, "\x00") {
		issues = append(issues, "Null bytes detected")
	}

	// Check for control characters
	if strings.ContainsAny(input, "\x01\x02\x03\x04\x05\x06\x07\x08\x0b\x0c\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f") {
		issues = append(issues, "Control characters detected")
	}

	return len(issues) == 0, issues
}

// GenerateSecureToken generates a cryptographically secure token
func (ss *SecurityService) GenerateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// HashPassword hashes a password using SHA-256
func (ss *SecurityService) HashPassword(password string) string {
	hash := sha256.Sum256([]byte(password))
	return hex.EncodeToString(hash[:])
}

// VerifyPassword verifies a password against its hash
func (ss *SecurityService) VerifyPassword(password, hash string) bool {
	hashedPassword := ss.HashPassword(password)
	return hashedPassword == hash
}

// GetSecurityStats returns security statistics
func (ss *SecurityService) GetSecurityStats() map[string]interface{} {
	stats := map[string]interface{}{
		"total_events":     len(ss.securityEvents),
		"blocked_ips":      len(ss.blockedIPs),
		"rate_limited_ips": 0,
		"events_by_level":  make(map[ThreatLevel]int),
		"events_by_type":   make(map[string]int),
		"recent_threats":   0,
	}

	// Count events by level and type
	for _, event := range ss.securityEvents {
		// Count by level
		levelCount := stats["events_by_level"].(map[ThreatLevel]int)
		levelCount[event.Level]++

		// Count by type
		typeCount := stats["events_by_type"].(map[string]int)
		typeCount[event.Type]++
	}

	// Count rate limited IPs
	for _, rateLimit := range ss.rateLimits {
		if rateLimit.Blocked {
			stats["rate_limited_ips"] = stats["rate_limited_ips"].(int) + 1
		}
	}

	// Count recent threats (last 24 hours)
	cutoff := time.Now().Add(-24 * time.Hour)
	recentThreats := 0
	for _, event := range ss.securityEvents {
		if event.Timestamp.After(cutoff) && event.Level == ThreatLevelHigh {
			recentThreats++
		}
	}
	stats["recent_threats"] = recentThreats

	return stats
}

// generateEventID generates a unique event ID
func generateEventID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
