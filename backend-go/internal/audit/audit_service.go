package audit

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

// AuditLevel represents the severity level of an audit event
type AuditLevel string

const (
	LevelInfo     AuditLevel = "info"
	LevelWarning  AuditLevel = "warning"
	LevelError    AuditLevel = "error"
	LevelCritical AuditLevel = "critical"
)

// AuditEvent represents an audit event
type AuditEvent struct {
	ID         string                 `json:"id"`
	Timestamp  time.Time              `json:"timestamp"`
	Level      AuditLevel             `json:"level"`
	Category   string                 `json:"category"`
	Action     string                 `json:"action"`
	UserID     string                 `json:"user_id,omitempty"`
	SessionID  string                 `json:"session_id,omitempty"`
	IPAddress  string                 `json:"ip_address,omitempty"`
	UserAgent  string                 `json:"user_agent,omitempty"`
	Resource   string                 `json:"resource,omitempty"`
	ResourceID string                 `json:"resource_id,omitempty"`
	Details    map[string]interface{} `json:"details"`
	Metadata   map[string]interface{} `json:"metadata"`
	Compliance ComplianceInfo         `json:"compliance"`
}

// ComplianceInfo represents compliance-related information
type ComplianceInfo struct {
	GDPR      bool   `json:"gdpr"`
	CCPA      bool   `json:"ccpa"`
	HIPAA     bool   `json:"hipaa"`
	SOX       bool   `json:"sox"`
	PCI       bool   `json:"pci"`
	Retention int    `json:"retention_days"`
	DataClass string `json:"data_classification"`
	PII       bool   `json:"contains_pii"`
	Encrypted bool   `json:"encrypted"`
}

// AuditService handles audit logging and compliance
type AuditService struct {
	events    []AuditEvent
	retention time.Duration
	encrypted bool
}

// NewAuditService creates a new audit service
func NewAuditService(retentionDays int, encrypted bool) *AuditService {
	return &AuditService{
		events:    make([]AuditEvent, 0),
		retention: time.Duration(retentionDays) * 24 * time.Hour,
		encrypted: encrypted,
	}
}

// LogEvent logs an audit event
func (as *AuditService) LogEvent(ctx context.Context, event AuditEvent) error {
	// Set default values
	if event.ID == "" {
		event.ID = generateEventID()
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}
	if event.Level == "" {
		event.Level = LevelInfo
	}

	// Validate required fields
	if event.Category == "" || event.Action == "" {
		return fmt.Errorf("category and action are required")
	}

	// Add to events
	as.events = append(as.events, event)

	// Cleanup old events
	as.cleanupOldEvents()

	return nil
}

// LogUserAction logs a user action
func (as *AuditService) LogUserAction(ctx context.Context, userID, action, resource string, details map[string]interface{}) error {
	event := AuditEvent{
		Category:   "user_action",
		Action:     action,
		UserID:     userID,
		Resource:   resource,
		Details:    details,
		Compliance: as.getDefaultCompliance(),
	}

	return as.LogEvent(ctx, event)
}

// LogDataAccess logs data access events
func (as *AuditService) LogDataAccess(ctx context.Context, userID, resource, resourceID string, details map[string]interface{}) error {
	event := AuditEvent{
		Category:   "data_access",
		Action:     "access",
		UserID:     userID,
		Resource:   resource,
		ResourceID: resourceID,
		Details:    details,
		Compliance: ComplianceInfo{
			GDPR:      true,
			CCPA:      true,
			Retention: 2555, // 7 years
			DataClass: "sensitive",
			PII:       true,
			Encrypted: true,
		},
	}

	return as.LogEvent(ctx, event)
}

// LogDataGeneration logs data generation events
func (as *AuditService) LogDataGeneration(ctx context.Context, userID, datasetID string, rows int, details map[string]interface{}) error {
	event := AuditEvent{
		Category:   "data_generation",
		Action:     "generate",
		UserID:     userID,
		Resource:   "dataset",
		ResourceID: datasetID,
		Details: map[string]interface{}{
			"rows_generated":  rows,
			"generation_time": details["generation_time"],
			"privacy_level":   details["privacy_level"],
			"model_used":      details["model_used"],
		},
		Compliance: ComplianceInfo{
			GDPR:      true,
			CCPA:      true,
			Retention: 2555,
			DataClass: "synthetic",
			PII:       false,
			Encrypted: true,
		},
	}

	return as.LogEvent(ctx, event)
}

// LogSecurityEvent logs security-related events
func (as *AuditService) LogSecurityEvent(ctx context.Context, level AuditLevel, action, userID string, details map[string]interface{}) error {
	event := AuditEvent{
		Level:    level,
		Category: "security",
		Action:   action,
		UserID:   userID,
		Details:  details,
		Compliance: ComplianceInfo{
			GDPR:      true,
			CCPA:      true,
			HIPAA:     true,
			Retention: 2555,
			DataClass: "security",
			PII:       true,
			Encrypted: true,
		},
	}

	return as.LogEvent(ctx, event)
}

// LogSystemEvent logs system events
func (as *AuditService) LogSystemEvent(ctx context.Context, level AuditLevel, action string, details map[string]interface{}) error {
	event := AuditEvent{
		Level:      level,
		Category:   "system",
		Action:     action,
		Details:    details,
		Compliance: as.getDefaultCompliance(),
	}

	return as.LogEvent(ctx, event)
}

// LogPaymentEvent logs payment-related events
func (as *AuditService) LogPaymentEvent(ctx context.Context, userID, action, paymentID string, details map[string]interface{}) error {
	event := AuditEvent{
		Category:   "payment",
		Action:     action,
		UserID:     userID,
		Resource:   "payment",
		ResourceID: paymentID,
		Details:    details,
		Compliance: ComplianceInfo{
			GDPR:      true,
			CCPA:      true,
			PCI:       true,
			Retention: 2555,
			DataClass: "financial",
			PII:       true,
			Encrypted: true,
		},
	}

	return as.LogEvent(ctx, event)
}

// GetEvents retrieves audit events with filtering
func (as *AuditService) GetEvents(ctx context.Context, filters AuditFilters) ([]AuditEvent, error) {
	var filteredEvents []AuditEvent

	for _, event := range as.events {
		if as.matchesFilters(event, filters) {
			filteredEvents = append(filteredEvents, event)
		}
	}

	return filteredEvents, nil
}

// AuditFilters represents filters for audit events
type AuditFilters struct {
	UserID     string     `json:"user_id,omitempty"`
	Category   string     `json:"category,omitempty"`
	Action     string     `json:"action,omitempty"`
	Level      AuditLevel `json:"level,omitempty"`
	Resource   string     `json:"resource,omitempty"`
	ResourceID string     `json:"resource_id,omitempty"`
	StartTime  *time.Time `json:"start_time,omitempty"`
	EndTime    *time.Time `json:"end_time,omitempty"`
	Limit      int        `json:"limit,omitempty"`
	Offset     int        `json:"offset,omitempty"`
}

// matchesFilters checks if an event matches the given filters
func (as *AuditService) matchesFilters(event AuditEvent, filters AuditFilters) bool {
	if filters.UserID != "" && event.UserID != filters.UserID {
		return false
	}
	if filters.Category != "" && event.Category != filters.Category {
		return false
	}
	if filters.Action != "" && event.Action != filters.Action {
		return false
	}
	if filters.Level != "" && event.Level != filters.Level {
		return false
	}
	if filters.Resource != "" && event.Resource != filters.Resource {
		return false
	}
	if filters.ResourceID != "" && event.ResourceID != filters.ResourceID {
		return false
	}
	if filters.StartTime != nil && event.Timestamp.Before(*filters.StartTime) {
		return false
	}
	if filters.EndTime != nil && event.Timestamp.After(*filters.EndTime) {
		return false
	}

	return true
}

// GetComplianceReport generates a compliance report
func (as *AuditService) GetComplianceReport(ctx context.Context, startTime, endTime time.Time) (*ComplianceReport, error) {
	report := &ComplianceReport{
		StartTime: startTime,
		EndTime:   endTime,
		Generated: time.Now(),
	}

	// Filter events by time range
	var relevantEvents []AuditEvent
	for _, event := range as.events {
		if event.Timestamp.After(startTime) && event.Timestamp.Before(endTime) {
			relevantEvents = append(relevantEvents, event)
		}
	}

	// Generate statistics
	report.TotalEvents = len(relevantEvents)
	report.EventsByCategory = make(map[string]int)
	report.EventsByLevel = make(map[AuditLevel]int)
	report.EventsByUser = make(map[string]int)
	report.ComplianceStats = make(map[string]int)

	for _, event := range relevantEvents {
		report.EventsByCategory[event.Category]++
		report.EventsByLevel[event.Level]++
		if event.UserID != "" {
			report.EventsByUser[event.UserID]++
		}

		// Compliance statistics
		if event.Compliance.GDPR {
			report.ComplianceStats["gdpr"]++
		}
		if event.Compliance.CCPA {
			report.ComplianceStats["ccpa"]++
		}
		if event.Compliance.HIPAA {
			report.ComplianceStats["hipaa"]++
		}
		if event.Compliance.PCI {
			report.ComplianceStats["pci"]++
		}
	}

	return report, nil
}

// ComplianceReport represents a compliance report
type ComplianceReport struct {
	StartTime        time.Time          `json:"start_time"`
	EndTime          time.Time          `json:"end_time"`
	Generated        time.Time          `json:"generated"`
	TotalEvents      int                `json:"total_events"`
	EventsByCategory map[string]int     `json:"events_by_category"`
	EventsByLevel    map[AuditLevel]int `json:"events_by_level"`
	EventsByUser     map[string]int     `json:"events_by_user"`
	ComplianceStats  map[string]int     `json:"compliance_stats"`
	Recommendations  []string           `json:"recommendations"`
}

// ExportEvents exports audit events to JSON
func (as *AuditService) ExportEvents(ctx context.Context, filters AuditFilters) ([]byte, error) {
	events, err := as.GetEvents(ctx, filters)
	if err != nil {
		return nil, err
	}

	return json.MarshalIndent(events, "", "  ")
}

// GetAuditStats returns audit statistics
func (as *AuditService) GetAuditStats() map[string]interface{} {
	stats := map[string]interface{}{
		"total_events":       len(as.events),
		"events_by_level":    make(map[AuditLevel]int),
		"events_by_category": make(map[string]int),
		"oldest_event":       time.Time{},
		"newest_event":       time.Time{},
	}

	if len(as.events) == 0 {
		return stats
	}

	oldest := as.events[0].Timestamp
	newest := as.events[0].Timestamp

	for _, event := range as.events {
		// Count by level
		levelCount := stats["events_by_level"].(map[AuditLevel]int)
		levelCount[event.Level]++

		// Count by category
		categoryCount := stats["events_by_category"].(map[string]int)
		categoryCount[event.Category]++

		// Find oldest and newest
		if event.Timestamp.Before(oldest) {
			oldest = event.Timestamp
		}
		if event.Timestamp.After(newest) {
			newest = event.Timestamp
		}
	}

	stats["oldest_event"] = oldest
	stats["newest_event"] = newest

	return stats
}

// cleanupOldEvents removes events older than the retention period
func (as *AuditService) cleanupOldEvents() {
	cutoff := time.Now().Add(-as.retention)
	var keptEvents []AuditEvent

	for _, event := range as.events {
		if event.Timestamp.After(cutoff) {
			keptEvents = append(keptEvents, event)
		}
	}

	as.events = keptEvents
}

// getDefaultCompliance returns default compliance settings
func (as *AuditService) getDefaultCompliance() ComplianceInfo {
	return ComplianceInfo{
		GDPR:      true,
		CCPA:      true,
		Retention: 2555, // 7 years
		DataClass: "general",
		PII:       false,
		Encrypted: true,
	}
}

// generateEventID generates a unique event ID
func generateEventID() string {
	return fmt.Sprintf("audit_%d", time.Now().UnixNano())
}

// AuditLogger provides structured logging for audit events
type AuditLogger struct {
	service *AuditService
}

// NewAuditLogger creates a new audit logger
func NewAuditLogger(service *AuditService) *AuditLogger {
	return &AuditLogger{
		service: service,
	}
}

// Info logs an info-level audit event
func (al *AuditLogger) Info(ctx context.Context, category, action string, details map[string]interface{}) error {
	event := AuditEvent{
		Level:      LevelInfo,
		Category:   category,
		Action:     action,
		Details:    details,
		Compliance: al.service.getDefaultCompliance(),
	}

	return al.service.LogEvent(ctx, event)
}

// Warning logs a warning-level audit event
func (al *AuditLogger) Warning(ctx context.Context, category, action string, details map[string]interface{}) error {
	event := AuditEvent{
		Level:      LevelWarning,
		Category:   category,
		Action:     action,
		Details:    details,
		Compliance: al.service.getDefaultCompliance(),
	}

	return al.service.LogEvent(ctx, event)
}

// Error logs an error-level audit event
func (al *AuditLogger) Error(ctx context.Context, category, action string, details map[string]interface{}) error {
	event := AuditEvent{
		Level:      LevelError,
		Category:   category,
		Action:     action,
		Details:    details,
		Compliance: al.service.getDefaultCompliance(),
	}

	return al.service.LogEvent(ctx, event)
}

// Critical logs a critical-level audit event
func (al *AuditLogger) Critical(ctx context.Context, category, action string, details map[string]interface{}) error {
	event := AuditEvent{
		Level:      LevelCritical,
		Category:   category,
		Action:     action,
		Details:    details,
		Compliance: al.service.getDefaultCompliance(),
	}

	return al.service.LogEvent(ctx, event)
}
