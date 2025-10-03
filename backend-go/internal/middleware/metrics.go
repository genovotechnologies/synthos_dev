// Package middleware provides HTTP middleware for the Synthos APIpackage middleware

package middleware

import (
	"strconv"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTP metrics
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path", "status"},
	)

	httpRequestSize = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_size_bytes",
			Help:    "HTTP request size in bytes",
			Buckets: prometheus.ExponentialBuckets(100, 10, 8),
		},
		[]string{"method", "path"},
	)

	httpResponseSize = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_response_size_bytes",
			Help:    "HTTP response size in bytes",
			Buckets: prometheus.ExponentialBuckets(100, 10, 8),
		},
		[]string{"method", "path", "status"},
	)

	// Business metrics
	dataGenerationRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "data_generation_requests_total",
			Help: "Total number of data generation requests",
		},
		[]string{"status"},
	)

	dataGenerationRowsTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "data_generation_rows_total",
			Help: "Total number of synthetic data rows generated",
		},
	)

	datasetUploadsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "dataset_uploads_total",
			Help: "Total number of dataset uploads",
		},
		[]string{"status"},
	)

	userRegistrationsTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "user_registrations_total",
			Help: "Total number of user registrations",
		},
	)

	authAttemptsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "auth_attempts_total",
			Help: "Total number of authentication attempts",
		},
		[]string{"result"},
	)

	// Active connections
	activeConnections = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "http_active_connections",
			Help: "Number of active HTTP connections",
		},
	)

	// Database metrics
	dbQueryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "db_query_duration_seconds",
			Help:    "Database query duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"operation", "table"},
	)

	dbConnectionPoolSize = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connection_pool_size",
			Help: "Current size of the database connection pool",
		},
	)

	dbConnectionPoolInUse = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connection_pool_in_use",
			Help: "Number of database connections currently in use",
		},
	)
)

// PrometheusMiddleware creates a middleware that collects Prometheus metrics
func PrometheusMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Increment active connections
		activeConnections.Inc()
		defer activeConnections.Dec()

		// Start timer
		start := time.Now()

		// Record request size
		httpRequestSize.WithLabelValues(
			c.Method(),
			c.Path(),
		).Observe(float64(len(c.Body())))

		// Process request
		err := c.Next()

		// Calculate duration
		duration := time.Since(start).Seconds()
		status := strconv.Itoa(c.Response().StatusCode())

		// Record metrics
		httpRequestsTotal.WithLabelValues(
			c.Method(),
			c.Path(),
			status,
		).Inc()

		httpRequestDuration.WithLabelValues(
			c.Method(),
			c.Path(),
			status,
		).Observe(duration)

		httpResponseSize.WithLabelValues(
			c.Method(),
			c.Path(),
			status,
		).Observe(float64(len(c.Response().Body())))

		return err
	}
}

// MetricsRecorder provides methods to record business metrics
type MetricsRecorder struct {
	mu sync.RWMutex
}

// NewMetricsRecorder creates a new metrics recorder
func NewMetricsRecorder() *MetricsRecorder {
	return &MetricsRecorder{}
}

// RecordDataGeneration records a data generation event
func (m *MetricsRecorder) RecordDataGeneration(status string, rows int64) {
	dataGenerationRequestsTotal.WithLabelValues(status).Inc()
	if status == "success" {
		dataGenerationRowsTotal.Add(float64(rows))
	}
}

// RecordDatasetUpload records a dataset upload event
func (m *MetricsRecorder) RecordDatasetUpload(status string) {
	datasetUploadsTotal.WithLabelValues(status).Inc()
}

// RecordUserRegistration records a user registration event
func (m *MetricsRecorder) RecordUserRegistration() {
	userRegistrationsTotal.Inc()
}

// RecordAuthAttempt records an authentication attempt
func (m *MetricsRecorder) RecordAuthAttempt(result string) {
	authAttemptsTotal.WithLabelValues(result).Inc()
}

// RecordDBQuery records a database query execution
func (m *MetricsRecorder) RecordDBQuery(operation, table string, duration time.Duration) {
	dbQueryDuration.WithLabelValues(operation, table).Observe(duration.Seconds())
}

// UpdateDBPoolMetrics updates database connection pool metrics
func (m *MetricsRecorder) UpdateDBPoolMetrics(size, inUse int) {
	dbConnectionPoolSize.Set(float64(size))
	dbConnectionPoolInUse.Set(float64(inUse))
}

// GetMetricsRecorder retrieves the metrics recorder from context
func GetMetricsRecorder(c *fiber.Ctx) *MetricsRecorder {
	recorder := c.Locals("metrics_recorder")
	if recorder == nil {
		return NewMetricsRecorder()
	}
	return recorder.(*MetricsRecorder)
}

// MetricsRecorderMiddleware creates a middleware that provides metrics recorder
func MetricsRecorderMiddleware() fiber.Handler {
	recorder := NewMetricsRecorder()
	return func(c *fiber.Ctx) error {
		c.Locals("metrics_recorder", recorder)
		return c.Next()
	}
}
