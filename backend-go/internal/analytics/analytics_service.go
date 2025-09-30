package analytics

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// AnalyticsEvent represents an analytics event
type AnalyticsEvent struct {
	ID         string                 `json:"id"`
	UserID     string                 `json:"user_id"`
	Event      string                 `json:"event"`
	Category   string                 `json:"category"`
	Properties map[string]interface{} `json:"properties"`
	Timestamp  time.Time              `json:"timestamp"`
	SessionID  string                 `json:"session_id,omitempty"`
	IPAddress  string                 `json:"ip_address,omitempty"`
	UserAgent  string                 `json:"user_agent,omitempty"`
}

// AnalyticsMetric represents an analytics metric
type AnalyticsMetric struct {
	Name       string            `json:"name"`
	Value      float64           `json:"value"`
	Labels     map[string]string `json:"labels"`
	Timestamp  time.Time         `json:"timestamp"`
	Dimensions map[string]string `json:"dimensions"`
}

// AnalyticsReport represents an analytics report
type AnalyticsReport struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"`
	Period      string                 `json:"period"`
	StartDate   time.Time              `json:"start_date"`
	EndDate     time.Time              `json:"end_date"`
	Metrics     map[string]float64     `json:"metrics"`
	Insights    []string               `json:"insights"`
	Charts      []Chart                `json:"charts"`
	GeneratedAt time.Time              `json:"generated_at"`
	Filters     map[string]interface{} `json:"filters"`
}

// Chart represents a chart in a report
type Chart struct {
	Type    string                 `json:"type"`
	Title   string                 `json:"title"`
	Data    []ChartDataPoint       `json:"data"`
	XAxis   string                 `json:"x_axis"`
	YAxis   string                 `json:"y_axis"`
	Options map[string]interface{} `json:"options"`
}

// ChartDataPoint represents a data point in a chart
type ChartDataPoint struct {
	X     interface{} `json:"x"`
	Y     float64     `json:"y"`
	Label string      `json:"label,omitempty"`
}

// AnalyticsService handles analytics and reporting
type AnalyticsService struct {
	events   []AnalyticsEvent
	metrics  map[string]*AnalyticsMetric
	reports  map[string]*AnalyticsReport
	mu       sync.RWMutex
	insights []string
	trends   map[string][]float64
}

// NewAnalyticsService creates a new analytics service
func NewAnalyticsService() *AnalyticsService {
	service := &AnalyticsService{
		events:   make([]AnalyticsEvent, 0),
		metrics:  make(map[string]*AnalyticsMetric),
		reports:  make(map[string]*AnalyticsReport),
		insights: make([]string, 0),
		trends:   make(map[string][]float64),
	}

	// Start background processing
	go service.startBackgroundProcessing()

	return service
}

// TrackEvent tracks an analytics event
func (as *AnalyticsService) TrackEvent(ctx context.Context, event AnalyticsEvent) error {
	// Set default values
	if event.ID == "" {
		event.ID = generateEventID()
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	as.mu.Lock()
	as.events = append(as.events, event)
	as.mu.Unlock()

	// Update metrics
	as.updateMetrics(event)

	return nil
}

// TrackUserAction tracks a user action
func (as *AnalyticsService) TrackUserAction(ctx context.Context, userID, action, category string, properties map[string]interface{}) error {
	event := AnalyticsEvent{
		UserID:     userID,
		Event:      action,
		Category:   category,
		Properties: properties,
		Timestamp:  time.Now(),
	}

	return as.TrackEvent(ctx, event)
}

// TrackDataGeneration tracks data generation events
func (as *AnalyticsService) TrackDataGeneration(ctx context.Context, userID, datasetID string, rows int, model string, duration time.Duration) error {
	event := AnalyticsEvent{
		UserID:   userID,
		Event:    "data_generated",
		Category: "generation",
		Properties: map[string]interface{}{
			"dataset_id": datasetID,
			"rows":       rows,
			"model":      model,
			"duration":   duration.Milliseconds(),
		},
		Timestamp: time.Now(),
	}

	return as.TrackEvent(ctx, event)
}

// TrackAPICall tracks API calls
func (as *AnalyticsService) TrackAPICall(ctx context.Context, userID, endpoint, method string, statusCode int, duration time.Duration) error {
	event := AnalyticsEvent{
		UserID:   userID,
		Event:    "api_call",
		Category: "api",
		Properties: map[string]interface{}{
			"endpoint":    endpoint,
			"method":      method,
			"status_code": statusCode,
			"duration":    duration.Milliseconds(),
		},
		Timestamp: time.Now(),
	}

	return as.TrackEvent(ctx, event)
}

// TrackPayment tracks payment events
func (as *AnalyticsService) TrackPayment(ctx context.Context, userID, planID string, amount float64, currency string) error {
	event := AnalyticsEvent{
		UserID:   userID,
		Event:    "payment_completed",
		Category: "payment",
		Properties: map[string]interface{}{
			"plan_id":  planID,
			"amount":   amount,
			"currency": currency,
		},
		Timestamp: time.Now(),
	}

	return as.TrackEvent(ctx, event)
}

// updateMetrics updates metrics based on events
func (as *AnalyticsService) updateMetrics(event AnalyticsEvent) {
	as.mu.Lock()
	defer as.mu.Unlock()

	// Update event count
	eventCountMetric := as.getOrCreateMetric("event_count", map[string]string{"event": event.Event})
	eventCountMetric.Value++

	// Update user activity
	userActivityMetric := as.getOrCreateMetric("user_activity", map[string]string{"user_id": event.UserID})
	userActivityMetric.Value++

	// Update category metrics
	categoryMetric := as.getOrCreateMetric("category_count", map[string]string{"category": event.Category})
	categoryMetric.Value++

	// Update specific event metrics
	switch event.Event {
	case "data_generated":
		if rows, ok := event.Properties["rows"].(int); ok {
			rowsMetric := as.getOrCreateMetric("total_rows_generated", map[string]string{})
			rowsMetric.Value += float64(rows)
		}
	case "api_call":
		if duration, ok := event.Properties["duration"].(int64); ok {
			latencyMetric := as.getOrCreateMetric("api_latency_ms", map[string]string{"endpoint": event.Properties["endpoint"].(string)})
			latencyMetric.Value = float64(duration)
		}
	case "payment_completed":
		if amount, ok := event.Properties["amount"].(float64); ok {
			revenueMetric := as.getOrCreateMetric("revenue", map[string]string{"currency": event.Properties["currency"].(string)})
			revenueMetric.Value += amount
		}
	}
}

// getOrCreateMetric gets or creates a metric
func (as *AnalyticsService) getOrCreateMetric(name string, labels map[string]string) *AnalyticsMetric {
	key := as.getMetricKey(name, labels)
	metric, exists := as.metrics[key]
	if !exists {
		metric = &AnalyticsMetric{
			Name:       name,
			Value:      0,
			Labels:     labels,
			Timestamp:  time.Now(),
			Dimensions: make(map[string]string),
		}
		as.metrics[key] = metric
	}
	return metric
}

// getMetricKey generates a unique key for a metric
func (as *AnalyticsService) getMetricKey(name string, labels map[string]string) string {
	key := name
	for k, v := range labels {
		key += fmt.Sprintf("_%s_%s", k, v)
	}
	return key
}

// GetMetrics returns all metrics
func (as *AnalyticsService) GetMetrics() map[string]*AnalyticsMetric {
	as.mu.RLock()
	defer as.mu.RUnlock()

	metrics := make(map[string]*AnalyticsMetric)
	for key, metric := range as.metrics {
		metrics[key] = metric
	}

	return metrics
}

// GetMetric returns a specific metric
func (as *AnalyticsService) GetMetric(name string, labels map[string]string) (*AnalyticsMetric, bool) {
	as.mu.RLock()
	defer as.mu.RUnlock()

	key := as.getMetricKey(name, labels)
	metric, exists := as.metrics[key]
	return metric, exists
}

// GetEvents returns events with filtering
func (as *AnalyticsService) GetEvents(filters EventFilters) []AnalyticsEvent {
	as.mu.RLock()
	defer as.mu.RUnlock()

	var filteredEvents []AnalyticsEvent
	for _, event := range as.events {
		if as.matchesEventFilters(event, filters) {
			filteredEvents = append(filteredEvents, event)
		}
	}

	return filteredEvents
}

// EventFilters represents filters for events
type EventFilters struct {
	UserID    string     `json:"user_id,omitempty"`
	Event     string     `json:"event,omitempty"`
	Category  string     `json:"category,omitempty"`
	StartTime *time.Time `json:"start_time,omitempty"`
	EndTime   *time.Time `json:"end_time,omitempty"`
	Limit     int        `json:"limit,omitempty"`
	Offset    int        `json:"offset,omitempty"`
}

// matchesEventFilters checks if an event matches the given filters
func (as *AnalyticsService) matchesEventFilters(event AnalyticsEvent, filters EventFilters) bool {
	if filters.UserID != "" && event.UserID != filters.UserID {
		return false
	}
	if filters.Event != "" && event.Event != filters.Event {
		return false
	}
	if filters.Category != "" && event.Category != filters.Category {
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

// GenerateReport generates an analytics report
func (as *AnalyticsService) GenerateReport(ctx context.Context, reportType, period string, filters map[string]interface{}) (*AnalyticsReport, error) {
	startDate, endDate := as.getPeriodDates(period)

	report := &AnalyticsReport{
		ID:          generateReportID(),
		Name:        fmt.Sprintf("%s Report - %s", reportType, period),
		Type:        reportType,
		Period:      period,
		StartDate:   startDate,
		EndDate:     endDate,
		Metrics:     make(map[string]float64),
		Insights:    make([]string, 0),
		Charts:      make([]Chart, 0),
		GeneratedAt: time.Now(),
		Filters:     filters,
	}

	// Generate metrics based on report type
	switch reportType {
	case "overview":
		as.generateOverviewReport(report)
	case "user_activity":
		as.generateUserActivityReport(report)
	case "data_generation":
		as.generateDataGenerationReport(report)
	case "revenue":
		as.generateRevenueReport(report)
	case "performance":
		as.generatePerformanceReport(report)
	default:
		return nil, fmt.Errorf("unsupported report type: %s", reportType)
	}

	// Generate insights
	as.generateInsights(report)

	// Generate charts
	as.generateCharts(report)

	// Store report
	as.mu.Lock()
	as.reports[report.ID] = report
	as.mu.Unlock()

	return report, nil
}

// getPeriodDates returns start and end dates for a period
func (as *AnalyticsService) getPeriodDates(period string) (time.Time, time.Time) {
	now := time.Now()

	switch period {
	case "today":
		start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		return start, now
	case "yesterday":
		yesterday := now.AddDate(0, 0, -1)
		start := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, yesterday.Location())
		end := start.Add(24 * time.Hour)
		return start, end
	case "this_week":
		weekday := int(now.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		start := now.AddDate(0, 0, -weekday+1)
		start = time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, start.Location())
		return start, now
	case "this_month":
		start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		return start, now
	case "last_month":
		lastMonth := now.AddDate(0, -1, 0)
		start := time.Date(lastMonth.Year(), lastMonth.Month(), 1, 0, 0, 0, 0, lastMonth.Location())
		end := start.AddDate(0, 1, 0)
		return start, end
	case "this_year":
		start := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
		return start, now
	default:
		return now.AddDate(0, 0, -30), now // Default to last 30 days
	}
}

// generateOverviewReport generates an overview report
func (as *AnalyticsService) generateOverviewReport(report *AnalyticsReport) {
	// Get total events
	totalEvents := 0
	uniqueUsers := make(map[string]bool)

	for _, event := range as.events {
		if event.Timestamp.After(report.StartDate) && event.Timestamp.Before(report.EndDate) {
			totalEvents++
			uniqueUsers[event.UserID] = true
		}
	}

	report.Metrics["total_events"] = float64(totalEvents)
	report.Metrics["unique_users"] = float64(len(uniqueUsers))
	report.Metrics["events_per_user"] = float64(totalEvents) / float64(len(uniqueUsers))
}

// generateUserActivityReport generates a user activity report
func (as *AnalyticsService) generateUserActivityReport(report *AnalyticsReport) {
	userActivity := make(map[string]int)

	for _, event := range as.events {
		if event.Timestamp.After(report.StartDate) && event.Timestamp.Before(report.EndDate) {
			userActivity[event.UserID]++
		}
	}

	report.Metrics["active_users"] = float64(len(userActivity))

	// Calculate average activity per user
	totalActivity := 0
	for _, activity := range userActivity {
		totalActivity += activity
	}

	if len(userActivity) > 0 {
		report.Metrics["avg_activity_per_user"] = float64(totalActivity) / float64(len(userActivity))
	}
}

// generateDataGenerationReport generates a data generation report
func (as *AnalyticsService) generateDataGenerationReport(report *AnalyticsReport) {
	totalRows := 0
	generationEvents := 0

	for _, event := range as.events {
		if event.Timestamp.After(report.StartDate) && event.Timestamp.Before(report.EndDate) && event.Event == "data_generated" {
			generationEvents++
			if rows, ok := event.Properties["rows"].(int); ok {
				totalRows += rows
			}
		}
	}

	report.Metrics["total_rows_generated"] = float64(totalRows)
	report.Metrics["generation_events"] = float64(generationEvents)

	if generationEvents > 0 {
		report.Metrics["avg_rows_per_generation"] = float64(totalRows) / float64(generationEvents)
	}
}

// generateRevenueReport generates a revenue report
func (as *AnalyticsService) generateRevenueReport(report *AnalyticsReport) {
	totalRevenue := 0.0
	paymentEvents := 0

	for _, event := range as.events {
		if event.Timestamp.After(report.StartDate) && event.Timestamp.Before(report.EndDate) && event.Event == "payment_completed" {
			paymentEvents++
			if amount, ok := event.Properties["amount"].(float64); ok {
				totalRevenue += amount
			}
		}
	}

	report.Metrics["total_revenue"] = totalRevenue
	report.Metrics["payment_events"] = float64(paymentEvents)

	if paymentEvents > 0 {
		report.Metrics["avg_revenue_per_payment"] = totalRevenue / float64(paymentEvents)
	}
}

// generatePerformanceReport generates a performance report
func (as *AnalyticsService) generatePerformanceReport(report *AnalyticsReport) {
	totalLatency := 0.0
	apiCalls := 0

	for _, event := range as.events {
		if event.Timestamp.After(report.StartDate) && event.Timestamp.Before(report.EndDate) && event.Event == "api_call" {
			apiCalls++
			if duration, ok := event.Properties["duration"].(int64); ok {
				totalLatency += float64(duration)
			}
		}
	}

	report.Metrics["total_api_calls"] = float64(apiCalls)

	if apiCalls > 0 {
		report.Metrics["avg_latency_ms"] = totalLatency / float64(apiCalls)
	}
}

// generateInsights generates insights for a report
func (as *AnalyticsService) generateInsights(report *AnalyticsReport) {
	insights := make([]string, 0)

	// Generate insights based on metrics
	if totalEvents, ok := report.Metrics["total_events"]; ok {
		if totalEvents > 1000 {
			insights = append(insights, "High user activity detected - consider scaling infrastructure")
		}
	}

	if avgLatency, ok := report.Metrics["avg_latency_ms"]; ok {
		if avgLatency > 1000 {
			insights = append(insights, "High API latency detected - investigate performance bottlenecks")
		}
	}

	if totalRevenue, ok := report.Metrics["total_revenue"]; ok {
		if totalRevenue > 10000 {
			insights = append(insights, "Strong revenue growth - consider expanding features")
		}
	}

	report.Insights = insights
}

// generateCharts generates charts for a report
func (as *AnalyticsService) generateCharts(report *AnalyticsReport) {
	charts := make([]Chart, 0)

	// Generate event timeline chart
	eventTimeline := Chart{
		Type:  "line",
		Title: "Event Timeline",
		XAxis: "Time",
		YAxis: "Events",
		Data:  as.generateEventTimelineData(report.StartDate, report.EndDate),
		Options: map[string]interface{}{
			"responsive": true,
		},
	}
	charts = append(charts, eventTimeline)

	// Generate category distribution chart
	categoryDistribution := Chart{
		Type:  "pie",
		Title: "Event Categories",
		XAxis: "Category",
		YAxis: "Count",
		Data:  as.generateCategoryDistributionData(report.StartDate, report.EndDate),
		Options: map[string]interface{}{
			"responsive": true,
		},
	}
	charts = append(charts, categoryDistribution)

	report.Charts = charts
}

// generateEventTimelineData generates data for event timeline chart
func (as *AnalyticsService) generateEventTimelineData(startDate, endDate time.Time) []ChartDataPoint {
	// This would generate actual timeline data
	// For now, return mock data
	return []ChartDataPoint{
		{X: "00:00", Y: 10},
		{X: "06:00", Y: 25},
		{X: "12:00", Y: 45},
		{X: "18:00", Y: 30},
	}
}

// generateCategoryDistributionData generates data for category distribution chart
func (as *AnalyticsService) generateCategoryDistributionData(startDate, endDate time.Time) []ChartDataPoint {
	categoryCounts := make(map[string]int)

	for _, event := range as.events {
		if event.Timestamp.After(startDate) && event.Timestamp.Before(endDate) {
			categoryCounts[event.Category]++
		}
	}

	var data []ChartDataPoint
	for category, count := range categoryCounts {
		data = append(data, ChartDataPoint{
			X:     category,
			Y:     float64(count),
			Label: category,
		})
	}

	return data
}

// startBackgroundProcessing starts background analytics processing
func (as *AnalyticsService) startBackgroundProcessing() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			as.processInsights()
			as.updateTrends()
		}
	}
}

// processInsights processes insights from analytics data
func (as *AnalyticsService) processInsights() {
	as.mu.Lock()
	defer as.mu.Unlock()

	// This would implement actual insight processing
	// For now, just add a placeholder insight
	insight := fmt.Sprintf("Analytics processed at %s", time.Now().Format(time.RFC3339))
	as.insights = append(as.insights, insight)

	// Keep only last 100 insights
	if len(as.insights) > 100 {
		as.insights = as.insights[1:]
	}
}

// updateTrends updates trend data
func (as *AnalyticsService) updateTrends() {
	as.mu.Lock()
	defer as.mu.Unlock()

	// This would implement actual trend analysis
	// For now, just add placeholder trend data
	trendKey := "user_activity"
	if as.trends[trendKey] == nil {
		as.trends[trendKey] = make([]float64, 0)
	}

	as.trends[trendKey] = append(as.trends[trendKey], float64(len(as.events)))

	// Keep only last 100 data points
	if len(as.trends[trendKey]) > 100 {
		as.trends[trendKey] = as.trends[trendKey][1:]
	}
}

// GetReports returns all reports
func (as *AnalyticsService) GetReports() map[string]*AnalyticsReport {
	as.mu.RLock()
	defer as.mu.RUnlock()

	reports := make(map[string]*AnalyticsReport)
	for id, report := range as.reports {
		reports[id] = report
	}

	return reports
}

// GetReport returns a specific report
func (as *AnalyticsService) GetReport(reportID string) (*AnalyticsReport, bool) {
	as.mu.RLock()
	defer as.mu.RUnlock()

	report, exists := as.reports[reportID]
	return report, exists
}

// GetAnalyticsStats returns analytics statistics
func (as *AnalyticsService) GetAnalyticsStats() map[string]interface{} {
	as.mu.RLock()
	defer as.mu.RUnlock()

	stats := map[string]interface{}{
		"total_events":   len(as.events),
		"total_metrics":  len(as.metrics),
		"total_reports":  len(as.reports),
		"total_insights": len(as.insights),
		"trends":         as.trends,
		"oldest_event":   time.Time{},
		"newest_event":   time.Time{},
	}

	if len(as.events) > 0 {
		oldest := as.events[0].Timestamp
		newest := as.events[0].Timestamp

		for _, event := range as.events {
			if event.Timestamp.Before(oldest) {
				oldest = event.Timestamp
			}
			if event.Timestamp.After(newest) {
				newest = event.Timestamp
			}
		}

		stats["oldest_event"] = oldest
		stats["newest_event"] = newest
	}

	return stats
}

// generateEventID generates a unique event ID
func generateEventID() string {
	return fmt.Sprintf("event_%d", time.Now().UnixNano())
}

// generateReportID generates a unique report ID
func generateReportID() string {
	return fmt.Sprintf("report_%d", time.Now().UnixNano())
}
