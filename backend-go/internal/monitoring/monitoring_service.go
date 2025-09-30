package monitoring

import (
	"fmt"
	"runtime"
	"sync"
	"time"
)

// MetricType represents the type of a metric
type MetricType string

const (
	MetricTypeCounter   MetricType = "counter"
	MetricTypeGauge     MetricType = "gauge"
	MetricTypeHistogram MetricType = "histogram"
	MetricTypeSummary   MetricType = "summary"
)

// AlertLevel represents the severity of an alert
type AlertLevel string

const (
	AlertLevelInfo      AlertLevel = "info"
	AlertLevelWarning   AlertLevel = "warning"
	AlertLevelCritical  AlertLevel = "critical"
	AlertLevelEmergency AlertLevel = "emergency"
)

// Metric represents a monitoring metric
type Metric struct {
	Name        string            `json:"name"`
	Type        MetricType        `json:"type"`
	Value       float64           `json:"value"`
	Labels      map[string]string `json:"labels"`
	Timestamp   time.Time         `json:"timestamp"`
	Description string            `json:"description"`
}

// Alert represents a monitoring alert
type Alert struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Level        AlertLevel        `json:"level"`
	Message      string            `json:"message"`
	Metric       string            `json:"metric"`
	Threshold    float64           `json:"threshold"`
	CurrentValue float64           `json:"current_value"`
	Labels       map[string]string `json:"labels"`
	Timestamp    time.Time         `json:"timestamp"`
	Resolved     bool              `json:"resolved"`
	ResolvedAt   *time.Time        `json:"resolved_at,omitempty"`
}

// HealthCheck represents a health check
type HealthCheck struct {
	Name      string            `json:"name"`
	Status    string            `json:"status"`
	Message   string            `json:"message"`
	Duration  time.Duration     `json:"duration"`
	Timestamp time.Time         `json:"timestamp"`
	Labels    map[string]string `json:"labels"`
}

// MonitoringService handles monitoring and alerting
type MonitoringService struct {
	metrics      map[string]*Metric
	alerts       map[string]*Alert
	healthChecks map[string]*HealthCheck
	mu           sync.RWMutex
	alertRules   []AlertRule
	notifiers    []Notifier
}

// AlertRule represents a rule for generating alerts
type AlertRule struct {
	Name      string            `json:"name"`
	Metric    string            `json:"metric"`
	Condition string            `json:"condition"` // ">", "<", ">=", "<=", "==", "!="
	Threshold float64           `json:"threshold"`
	Level     AlertLevel        `json:"level"`
	Duration  time.Duration     `json:"duration"`
	Labels    map[string]string `json:"labels"`
	Enabled   bool              `json:"enabled"`
}

// Notifier represents a notification channel
type Notifier interface {
	SendAlert(alert *Alert) error
	SendHealthCheck(healthCheck *HealthCheck) error
}

// NewMonitoringService creates a new monitoring service
func NewMonitoringService() *MonitoringService {
	service := &MonitoringService{
		metrics:      make(map[string]*Metric),
		alerts:       make(map[string]*Alert),
		healthChecks: make(map[string]*HealthCheck),
		alertRules:   make([]AlertRule, 0),
		notifiers:    make([]Notifier, 0),
	}

	// Initialize default alert rules
	service.initializeDefaultRules()

	// Start background monitoring
	go service.startBackgroundMonitoring()

	return service
}

// initializeDefaultRules sets up default alert rules
func (ms *MonitoringService) initializeDefaultRules() {
	defaultRules := []AlertRule{
		{
			Name:      "High CPU Usage",
			Metric:    "cpu_usage_percent",
			Condition: ">",
			Threshold: 80.0,
			Level:     AlertLevelWarning,
			Duration:  5 * time.Minute,
			Enabled:   true,
		},
		{
			Name:      "High Memory Usage",
			Metric:    "memory_usage_percent",
			Condition: ">",
			Threshold: 85.0,
			Level:     AlertLevelWarning,
			Duration:  5 * time.Minute,
			Enabled:   true,
		},
		{
			Name:      "High Error Rate",
			Metric:    "error_rate_percent",
			Condition: ">",
			Threshold: 5.0,
			Level:     AlertLevelCritical,
			Duration:  2 * time.Minute,
			Enabled:   true,
		},
		{
			Name:      "High Response Time",
			Metric:    "response_time_ms",
			Condition: ">",
			Threshold: 1000.0,
			Level:     AlertLevelWarning,
			Duration:  3 * time.Minute,
			Enabled:   true,
		},
		{
			Name:      "Low Disk Space",
			Metric:    "disk_usage_percent",
			Condition: ">",
			Threshold: 90.0,
			Level:     AlertLevelCritical,
			Duration:  1 * time.Minute,
			Enabled:   true,
		},
	}

	ms.alertRules = append(ms.alertRules, defaultRules...)
}

// RecordMetric records a metric value
func (ms *MonitoringService) RecordMetric(name string, value float64, labels map[string]string) {
	ms.mu.Lock()
	defer ms.mu.Unlock()

	metric := &Metric{
		Name:      name,
		Type:      MetricTypeGauge,
		Value:     value,
		Labels:    labels,
		Timestamp: time.Now(),
	}

	ms.metrics[name] = metric

	// Check alert rules
	ms.checkAlertRules(metric)
}

// IncrementCounter increments a counter metric
func (ms *MonitoringService) IncrementCounter(name string, labels map[string]string) {
	ms.mu.Lock()
	defer ms.mu.Unlock()

	metric, exists := ms.metrics[name]
	if !exists {
		metric = &Metric{
			Name:      name,
			Type:      MetricTypeCounter,
			Value:     0,
			Labels:    labels,
			Timestamp: time.Now(),
		}
		ms.metrics[name] = metric
	}

	metric.Value++
	metric.Timestamp = time.Now()

	// Check alert rules
	ms.checkAlertRules(metric)
}

// RecordHistogram records a histogram metric
func (ms *MonitoringService) RecordHistogram(name string, value float64, labels map[string]string) {
	ms.mu.Lock()
	defer ms.mu.Unlock()

	metric := &Metric{
		Name:      name,
		Type:      MetricTypeHistogram,
		Value:     value,
		Labels:    labels,
		Timestamp: time.Now(),
	}

	ms.metrics[name] = metric

	// Check alert rules
	ms.checkAlertRules(metric)
}

// checkAlertRules checks if any alert rules are triggered
func (ms *MonitoringService) checkAlertRules(metric *Metric) {
	for _, rule := range ms.alertRules {
		if !rule.Enabled || rule.Metric != metric.Name {
			continue
		}

		if ms.evaluateCondition(metric.Value, rule.Condition, rule.Threshold) {
			alert := &Alert{
				ID:           generateAlertID(),
				Name:         rule.Name,
				Level:        rule.Level,
				Message:      fmt.Sprintf("%s: %s is %.2f (threshold: %.2f)", rule.Name, metric.Name, metric.Value, rule.Threshold),
				Metric:       metric.Name,
				Threshold:    rule.Threshold,
				CurrentValue: metric.Value,
				Labels:       rule.Labels,
				Timestamp:    time.Now(),
				Resolved:     false,
			}

			ms.alerts[alert.ID] = alert

			// Send notifications
			for _, notifier := range ms.notifiers {
				go notifier.SendAlert(alert)
			}
		}
	}
}

// evaluateCondition evaluates a condition
func (ms *MonitoringService) evaluateCondition(value float64, condition string, threshold float64) bool {
	switch condition {
	case ">":
		return value > threshold
	case "<":
		return value < threshold
	case ">=":
		return value >= threshold
	case "<=":
		return value <= threshold
	case "==":
		return value == threshold
	case "!=":
		return value != threshold
	default:
		return false
	}
}

// AddAlertRule adds a new alert rule
func (ms *MonitoringService) AddAlertRule(rule AlertRule) {
	ms.mu.Lock()
	defer ms.mu.Unlock()

	ms.alertRules = append(ms.alertRules, rule)
}

// RemoveAlertRule removes an alert rule
func (ms *MonitoringService) RemoveAlertRule(ruleName string) {
	ms.mu.Lock()
	defer ms.mu.Unlock()

	for i, rule := range ms.alertRules {
		if rule.Name == ruleName {
			ms.alertRules = append(ms.alertRules[:i], ms.alertRules[i+1:]...)
			break
		}
	}
}

// AddNotifier adds a notification channel
func (ms *MonitoringService) AddNotifier(notifier Notifier) {
	ms.mu.Lock()
	defer ms.mu.Unlock()

	ms.notifiers = append(ms.notifiers, notifier)
}

// GetMetrics returns all metrics
func (ms *MonitoringService) GetMetrics() map[string]*Metric {
	ms.mu.RLock()
	defer ms.mu.RUnlock()

	// Return a copy to avoid race conditions
	metrics := make(map[string]*Metric)
	for name, metric := range ms.metrics {
		metrics[name] = metric
	}

	return metrics
}

// GetMetric returns a specific metric
func (ms *MonitoringService) GetMetric(name string) (*Metric, bool) {
	ms.mu.RLock()
	defer ms.mu.RUnlock()

	metric, exists := ms.metrics[name]
	return metric, exists
}

// GetAlerts returns all alerts
func (ms *MonitoringService) GetAlerts() map[string]*Alert {
	ms.mu.RLock()
	defer ms.mu.RUnlock()

	alerts := make(map[string]*Alert)
	for id, alert := range ms.alerts {
		alerts[id] = alert
	}

	return alerts
}

// GetActiveAlerts returns only active (unresolved) alerts
func (ms *MonitoringService) GetActiveAlerts() []*Alert {
	ms.mu.RLock()
	defer ms.mu.RUnlock()

	var activeAlerts []*Alert
	for _, alert := range ms.alerts {
		if !alert.Resolved {
			activeAlerts = append(activeAlerts, alert)
		}
	}

	return activeAlerts
}

// ResolveAlert resolves an alert
func (ms *MonitoringService) ResolveAlert(alertID string) error {
	ms.mu.Lock()
	defer ms.mu.Unlock()

	alert, exists := ms.alerts[alertID]
	if !exists {
		return fmt.Errorf("alert not found: %s", alertID)
	}

	alert.Resolved = true
	now := time.Now()
	alert.ResolvedAt = &now

	return nil
}

// PerformHealthCheck performs a health check
func (ms *MonitoringService) PerformHealthCheck(name string, checkFunc func() error) {
	start := time.Now()

	healthCheck := &HealthCheck{
		Name:      name,
		Status:    "healthy",
		Message:   "OK",
		Timestamp: time.Now(),
		Labels:    make(map[string]string),
	}

	if err := checkFunc(); err != nil {
		healthCheck.Status = "unhealthy"
		healthCheck.Message = err.Error()
	}

	healthCheck.Duration = time.Since(start)

	ms.mu.Lock()
	ms.healthChecks[name] = healthCheck
	ms.mu.Unlock()

	// Send notification if unhealthy
	if healthCheck.Status == "unhealthy" {
		for _, notifier := range ms.notifiers {
			go notifier.SendHealthCheck(healthCheck)
		}
	}
}

// GetHealthChecks returns all health checks
func (ms *MonitoringService) GetHealthChecks() map[string]*HealthCheck {
	ms.mu.RLock()
	defer ms.mu.RUnlock()

	healthChecks := make(map[string]*HealthCheck)
	for name, healthCheck := range ms.healthChecks {
		healthChecks[name] = healthCheck
	}

	return healthChecks
}

// GetSystemMetrics returns system-level metrics
func (ms *MonitoringService) GetSystemMetrics() map[string]float64 {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	metrics := map[string]float64{
		"goroutines":      float64(runtime.NumGoroutine()),
		"memory_alloc_mb": float64(m.Alloc) / 1024 / 1024,
		"memory_sys_mb":   float64(m.Sys) / 1024 / 1024,
		"gc_runs":         float64(m.NumGC),
		"gc_pause_ms":     float64(m.PauseTotalNs) / 1000000,
	}

	return metrics
}

// startBackgroundMonitoring starts background monitoring tasks
func (ms *MonitoringService) startBackgroundMonitoring() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			ms.collectSystemMetrics()
			ms.performSystemHealthChecks()
		}
	}
}

// collectSystemMetrics collects system metrics
func (ms *MonitoringService) collectSystemMetrics() {
	systemMetrics := ms.GetSystemMetrics()

	for name, value := range systemMetrics {
		ms.RecordMetric(name, value, map[string]string{"source": "system"})
	}
}

// performSystemHealthChecks performs system health checks
func (ms *MonitoringService) performSystemHealthChecks() {
	// Memory health check
	ms.PerformHealthCheck("memory", func() error {
		var m runtime.MemStats
		runtime.ReadMemStats(&m)

		memoryUsagePercent := float64(m.Alloc) / float64(m.Sys) * 100
		if memoryUsagePercent > 90 {
			return fmt.Errorf("memory usage too high: %.2f%%", memoryUsagePercent)
		}
		return nil
	})

	// Goroutine health check
	ms.PerformHealthCheck("goroutines", func() error {
		goroutines := runtime.NumGoroutine()
		if goroutines > 1000 {
			return fmt.Errorf("too many goroutines: %d", goroutines)
		}
		return nil
	})
}

// GetMonitoringStats returns monitoring statistics
func (ms *MonitoringService) GetMonitoringStats() map[string]interface{} {
	ms.mu.RLock()
	defer ms.mu.RUnlock()

	stats := map[string]interface{}{
		"total_metrics":       len(ms.metrics),
		"total_alerts":        len(ms.alerts),
		"active_alerts":       0,
		"resolved_alerts":     0,
		"total_health_checks": len(ms.healthChecks),
		"unhealthy_checks":    0,
		"alert_rules":         len(ms.alertRules),
		"notifiers":           len(ms.notifiers),
	}

	// Count active and resolved alerts
	for _, alert := range ms.alerts {
		if alert.Resolved {
			stats["resolved_alerts"] = stats["resolved_alerts"].(int) + 1
		} else {
			stats["active_alerts"] = stats["active_alerts"].(int) + 1
		}
	}

	// Count unhealthy health checks
	for _, healthCheck := range ms.healthChecks {
		if healthCheck.Status == "unhealthy" {
			stats["unhealthy_checks"] = stats["unhealthy_checks"].(int) + 1
		}
	}

	return stats
}

// generateAlertID generates a unique alert ID
func generateAlertID() string {
	return fmt.Sprintf("alert_%d", time.Now().UnixNano())
}

// EmailNotifier implements Notifier interface for email notifications
type EmailNotifier struct {
	SMTPHost     string
	SMTPPort     int
	SMTPUsername string
	SMTPPassword string
	FromEmail    string
	ToEmails     []string
}

// NewEmailNotifier creates a new email notifier
func NewEmailNotifier(smtpHost string, smtpPort int, smtpUsername, smtpPassword, fromEmail string, toEmails []string) *EmailNotifier {
	return &EmailNotifier{
		SMTPHost:     smtpHost,
		SMTPPort:     smtpPort,
		SMTPUsername: smtpUsername,
		SMTPPassword: smtpPassword,
		FromEmail:    fromEmail,
		ToEmails:     toEmails,
	}
}

// SendAlert sends an alert via email
func (en *EmailNotifier) SendAlert(alert *Alert) error {
	// This would implement actual email sending
	fmt.Printf("Email Alert: %s - %s\n", alert.Level, alert.Message)
	return nil
}

// SendHealthCheck sends a health check notification via email
func (en *EmailNotifier) SendHealthCheck(healthCheck *HealthCheck) error {
	// This would implement actual email sending
	fmt.Printf("Email Health Check: %s - %s\n", healthCheck.Status, healthCheck.Message)
	return nil
}

// SlackNotifier implements Notifier interface for Slack notifications
type SlackNotifier struct {
	WebhookURL string
	Channel    string
}

// NewSlackNotifier creates a new Slack notifier
func NewSlackNotifier(webhookURL, channel string) *SlackNotifier {
	return &SlackNotifier{
		WebhookURL: webhookURL,
		Channel:    channel,
	}
}

// SendAlert sends an alert via Slack
func (sn *SlackNotifier) SendAlert(alert *Alert) error {
	// This would implement actual Slack webhook sending
	fmt.Printf("Slack Alert: %s - %s\n", alert.Level, alert.Message)
	return nil
}

// SendHealthCheck sends a health check notification via Slack
func (sn *SlackNotifier) SendHealthCheck(healthCheck *HealthCheck) error {
	// This would implement actual Slack webhook sending
	fmt.Printf("Slack Health Check: %s - %s\n", healthCheck.Status, healthCheck.Message)
	return nil
}
