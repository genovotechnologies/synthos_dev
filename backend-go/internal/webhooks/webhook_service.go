package webhooks

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"
)

// WebhookStatus represents the status of a webhook delivery
type WebhookStatus string

const (
	StatusPending   WebhookStatus = "pending"
	StatusDelivered WebhookStatus = "delivered"
	StatusFailed    WebhookStatus = "failed"
	StatusRetrying  WebhookStatus = "retrying"
)

// WebhookEvent represents a webhook event
type WebhookEvent struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
	Source    string                 `json:"source"`
	Version   string                 `json:"version"`
}

// WebhookDelivery represents a webhook delivery attempt
type WebhookDelivery struct {
	ID           string        `json:"id"`
	WebhookID    string        `json:"webhook_id"`
	URL          string        `json:"url"`
	Status       WebhookStatus `json:"status"`
	Attempt      int           `json:"attempt"`
	MaxAttempts  int           `json:"max_attempts"`
	ResponseCode int           `json:"response_code"`
	ResponseBody string        `json:"response_body"`
	ErrorMessage string        `json:"error_message"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
	NextRetryAt  *time.Time    `json:"next_retry_at"`
}

// Webhook represents a webhook configuration
type Webhook struct {
	ID         string            `json:"id"`
	Name       string            `json:"name"`
	URL        string            `json:"url"`
	Events     []string          `json:"events"`
	Secret     string            `json:"secret"`
	Active     bool              `json:"active"`
	Headers    map[string]string `json:"headers"`
	Timeout    time.Duration     `json:"timeout"`
	MaxRetries int               `json:"max_retries"`
	RetryDelay time.Duration     `json:"retry_delay"`
	CreatedAt  time.Time         `json:"created_at"`
	UpdatedAt  time.Time         `json:"updated_at"`
}

// WebhookService handles webhook operations
type WebhookService struct {
	httpClient *http.Client
	webhooks   map[string]*Webhook
	deliveries map[string]*WebhookDelivery
}

// NewWebhookService creates a new webhook service
func NewWebhookService() *WebhookService {
	return &WebhookService{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		webhooks:   make(map[string]*Webhook),
		deliveries: make(map[string]*WebhookDelivery),
	}
}

// RegisterWebhook registers a new webhook
func (ws *WebhookService) RegisterWebhook(webhook *Webhook) error {
	if webhook.ID == "" {
		webhook.ID = generateID()
	}

	webhook.CreatedAt = time.Now()
	webhook.UpdatedAt = time.Now()

	ws.webhooks[webhook.ID] = webhook
	return nil
}

// UnregisterWebhook removes a webhook
func (ws *WebhookService) UnregisterWebhook(webhookID string) error {
	delete(ws.webhooks, webhookID)
	return nil
}

// GetWebhook retrieves a webhook by ID
func (ws *WebhookService) GetWebhook(webhookID string) (*Webhook, error) {
	webhook, exists := ws.webhooks[webhookID]
	if !exists {
		return nil, fmt.Errorf("webhook not found: %s", webhookID)
	}
	return webhook, nil
}

// ListWebhooks returns all registered webhooks
func (ws *WebhookService) ListWebhooks() []*Webhook {
	var webhooks []*Webhook
	for _, webhook := range ws.webhooks {
		webhooks = append(webhooks, webhook)
	}
	return webhooks
}

// TriggerWebhook triggers a webhook for a specific event
func (ws *WebhookService) TriggerWebhook(ctx context.Context, event *WebhookEvent) error {
	// Find webhooks that should receive this event
	var targetWebhooks []*Webhook
	for _, webhook := range ws.webhooks {
		if !webhook.Active {
			continue
		}

		// Check if webhook is interested in this event type
		for _, eventType := range webhook.Events {
			if eventType == event.Type || eventType == "*" {
				targetWebhooks = append(targetWebhooks, webhook)
				break
			}
		}
	}

	// Trigger webhooks
	for _, webhook := range targetWebhooks {
		go ws.deliverWebhook(ctx, webhook, event)
	}

	return nil
}

// deliverWebhook delivers a webhook to a specific endpoint
func (ws *WebhookService) deliverWebhook(ctx context.Context, webhook *Webhook, event *WebhookEvent) {
	delivery := &WebhookDelivery{
		ID:          generateID(),
		WebhookID:   webhook.ID,
		URL:         webhook.URL,
		Status:      StatusPending,
		Attempt:     0,
		MaxAttempts: webhook.MaxRetries,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	ws.deliveries[delivery.ID] = delivery

	// Retry logic
	for delivery.Attempt < delivery.MaxAttempts {
		delivery.Attempt++
		delivery.Status = StatusRetrying
		delivery.UpdatedAt = time.Now()

		err := ws.sendWebhookRequest(ctx, webhook, event, delivery)
		if err == nil {
			delivery.Status = StatusDelivered
			delivery.UpdatedAt = time.Now()
			return
		}

		delivery.ErrorMessage = err.Error()
		delivery.UpdatedAt = time.Now()

		// Calculate next retry time
		retryDelay := webhook.RetryDelay * time.Duration(delivery.Attempt)
		nextRetry := time.Now().Add(retryDelay)
		delivery.NextRetryAt = &nextRetry

		// Wait before retry
		select {
		case <-ctx.Done():
			delivery.Status = StatusFailed
			return
		case <-time.After(retryDelay):
			// Continue to next attempt
		}
	}

	delivery.Status = StatusFailed
	delivery.UpdatedAt = time.Now()
}

// sendWebhookRequest sends the actual HTTP request
func (ws *WebhookService) sendWebhookRequest(ctx context.Context, webhook *Webhook, event *WebhookEvent, delivery *WebhookDelivery) error {
	// Prepare payload
	payload, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	// Create request
	req, err := http.NewRequestWithContext(ctx, "POST", webhook.URL, bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Synthos-Webhook/1.0")
	req.Header.Set("X-Webhook-Event", event.Type)
	req.Header.Set("X-Webhook-ID", event.ID)
	req.Header.Set("X-Webhook-Timestamp", strconv.FormatInt(event.Timestamp.Unix(), 10))

	// Add custom headers
	for key, value := range webhook.Headers {
		req.Header.Set(key, value)
	}

	// Add signature if secret is provided
	if webhook.Secret != "" {
		signature := ws.generateSignature(payload, webhook.Secret)
		req.Header.Set("X-Webhook-Signature", signature)
	}

	// Send request
	resp, err := ws.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	// Update delivery status
	delivery.ResponseCode = resp.StatusCode
	delivery.ResponseBody = string(body)

	// Check if request was successful
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}

	return fmt.Errorf("webhook returned status %d: %s", resp.StatusCode, string(body))
}

// generateSignature generates HMAC signature for webhook payload
func (ws *WebhookService) generateSignature(payload []byte, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(payload)
	return "sha256=" + hex.EncodeToString(h.Sum(nil))
}

// VerifySignature verifies webhook signature
func (ws *WebhookService) VerifySignature(payload []byte, signature, secret string) bool {
	expectedSignature := ws.generateSignature(payload, secret)
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// GetDelivery retrieves a webhook delivery by ID
func (ws *WebhookService) GetDelivery(deliveryID string) (*WebhookDelivery, error) {
	delivery, exists := ws.deliveries[deliveryID]
	if !exists {
		return nil, fmt.Errorf("delivery not found: %s", deliveryID)
	}
	return delivery, nil
}

// ListDeliveries returns all webhook deliveries
func (ws *WebhookService) ListDeliveries() []*WebhookDelivery {
	var deliveries []*WebhookDelivery
	for _, delivery := range ws.deliveries {
		deliveries = append(deliveries, delivery)
	}
	return deliveries
}

// GetDeliveriesByWebhook returns deliveries for a specific webhook
func (ws *WebhookService) GetDeliveriesByWebhook(webhookID string) []*WebhookDelivery {
	var deliveries []*WebhookDelivery
	for _, delivery := range ws.deliveries {
		if delivery.WebhookID == webhookID {
			deliveries = append(deliveries, delivery)
		}
	}
	return deliveries
}

// RetryFailedDeliveries retries all failed webhook deliveries
func (ws *WebhookService) RetryFailedDeliveries(ctx context.Context) error {
	for _, delivery := range ws.deliveries {
		if delivery.Status == StatusFailed && delivery.NextRetryAt != nil && time.Now().After(*delivery.NextRetryAt) {
			webhook, err := ws.GetWebhook(delivery.WebhookID)
			if err != nil {
				continue
			}

			// Create new event from delivery data
			event := &WebhookEvent{
				ID:        generateID(),
				Type:      "retry",
				Data:      map[string]interface{}{"delivery_id": delivery.ID},
				Timestamp: time.Now(),
				Source:    "webhook_service",
				Version:   "1.0",
			}

			go ws.deliverWebhook(ctx, webhook, event)
		}
	}

	return nil
}

// GetWebhookStats returns statistics for webhook deliveries
func (ws *WebhookService) GetWebhookStats() map[string]interface{} {
	stats := map[string]interface{}{
		"total_webhooks":     len(ws.webhooks),
		"total_deliveries":   len(ws.deliveries),
		"pending_deliveries": 0,
		"delivered_count":    0,
		"failed_count":       0,
		"retrying_count":     0,
	}

	for _, delivery := range ws.deliveries {
		switch delivery.Status {
		case StatusPending:
			stats["pending_deliveries"] = stats["pending_deliveries"].(int) + 1
		case StatusDelivered:
			stats["delivered_count"] = stats["delivered_count"].(int) + 1
		case StatusFailed:
			stats["failed_count"] = stats["failed_count"].(int) + 1
		case StatusRetrying:
			stats["retrying_count"] = stats["retrying_count"].(int) + 1
		}
	}

	return stats
}

// CleanupOldDeliveries removes old webhook deliveries
func (ws *WebhookService) CleanupOldDeliveries(olderThan time.Duration) error {
	cutoff := time.Now().Add(-olderThan)

	for id, delivery := range ws.deliveries {
		if delivery.CreatedAt.Before(cutoff) && delivery.Status == StatusDelivered {
			delete(ws.deliveries, id)
		}
	}

	return nil
}

// generateID generates a unique ID
func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// WebhookHandler handles incoming webhook requests
type WebhookHandler struct {
	service *WebhookService
}

// NewWebhookHandler creates a new webhook handler
func NewWebhookHandler(service *WebhookService) *WebhookHandler {
	return &WebhookHandler{
		service: service,
	}
}

// HandleWebhook handles incoming webhook requests
func (wh *WebhookHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	// Read request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	// Verify signature if provided
	signature := r.Header.Get("X-Webhook-Signature")
	if signature != "" {
		// In a real implementation, you'd get the secret from the webhook configuration
		secret := "your-webhook-secret" // This should be retrieved from webhook config
		if !wh.service.VerifySignature(body, signature, secret) {
			http.Error(w, "Invalid signature", http.StatusUnauthorized)
			return
		}
	}

	// Parse webhook event
	var event WebhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Process webhook event
	// This is where you'd implement your business logic
	// For example, updating user status, sending notifications, etc.

	// Respond with success
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"message":  "Webhook received",
		"event_id": event.ID,
	})
}
