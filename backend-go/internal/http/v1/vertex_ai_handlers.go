package v1

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/agents"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/config"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

// VertexAIHandlers handles all Vertex AI related endpoints
type VertexAIHandlers struct {
	vertexAI *agents.VertexAIAgent
	claude   *agents.ClaudeAgent
	logger   *zap.Logger
}

// NewVertexAIHandlers creates a new Vertex AI handlers instance
func NewVertexAIHandlers(cfg *config.Config) (*VertexAIHandlers, error) {
	// Initialize Vertex AI configuration
	vertexConfig := agents.VertexAIConfig{
		ProjectID:   cfg.GCPProjectID,
		Location:    cfg.GCPLocation,
		ModelName:   cfg.VertexDefaultModel,
		APIKey:      cfg.VertexAPIKey,
		Temperature: 0.7,
		MaxTokens:   4000,
		TopP:        0.9,
		TopK:        40,
	}

	// Initialize Vertex AI agent
	vertexAI, err := agents.NewVertexAIAgent(vertexConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create Vertex AI agent: %w", err)
	}

	// Initialize Claude agent with Vertex AI
	claude, err := agents.NewClaudeAgent(vertexConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create Claude agent: %w", err)
	}

	return &VertexAIHandlers{
		vertexAI: vertexAI,
		claude:   claude,
		logger:   zap.NewNop(),
	}, nil
}

// ListModels returns all available models through Vertex AI
func (h *VertexAIHandlers) ListModels(c *fiber.Ctx) error {
	models := h.vertexAI.ListAvailableModels()

	// Get capabilities and pricing for each model
	modelInfo := make([]map[string]interface{}, len(models))
	for i, model := range models {
		capabilities := h.vertexAI.GetModelCapabilities(model)
		pricing := h.vertexAI.GetModelPricing(model)

		modelInfo[i] = map[string]interface{}{
			"name":         string(model),
			"capabilities": capabilities,
			"pricing":      pricing,
			"available":    true,
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"models":  modelInfo,
		"total":   len(models),
	})
}

// GetModelInfo returns detailed information about a specific model
func (h *VertexAIHandlers) GetModelInfo(c *fiber.Ctx) error {
	modelName := c.Params("model")
	modelType := agents.ModelType(modelName)

	capabilities := h.vertexAI.GetModelCapabilities(modelType)
	pricing := h.vertexAI.GetModelPricing(modelType)

	return c.JSON(fiber.Map{
		"success":      true,
		"model":        modelName,
		"capabilities": capabilities,
		"pricing":      pricing,
	})
}

// GenerateText generates text using any available model
func (h *VertexAIHandlers) GenerateText(c *fiber.Ctx) error {
	var req struct {
		Model         string                 `json:"model" validate:"required"`
		Prompt        string                 `json:"prompt" validate:"required"`
		MaxTokens     int32                  `json:"max_tokens,omitempty"`
		Temperature   float32                `json:"temperature,omitempty"`
		TopP          float32                `json:"top_p,omitempty"`
		TopK          int32                  `json:"top_k,omitempty"`
		StopSequences []string               `json:"stop_sequences,omitempty"`
		Metadata      map[string]interface{} `json:"metadata,omitempty"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// Set defaults
	if req.MaxTokens == 0 {
		req.MaxTokens = 4000
	}
	if req.Temperature == 0 {
		req.Temperature = 0.7
	}
	if req.TopP == 0 {
		req.TopP = 0.9
	}
	if req.TopK == 0 {
		req.TopK = 40
	}

	// Create generation request
	genReq := agents.GenerationRequest{
		DatasetID: 0,
		UserID:    0,
		Config: agents.GenerationConfig{
			ModelType:    agents.ModelType(req.Model),
			Strategy:     agents.StrategyAICreative,
			Rows:         1000,
			PrivacyLevel: "medium",
		},
		SchemaAnalysis: agents.SchemaAnalysis{
			Columns: []agents.ColumnInfo{},
		},
	}

	// Generate text
	resp, err := h.vertexAI.GenerateText(genReq)
	if err != nil {
		h.logger.Error("Failed to generate text", zap.Error(err))
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to generate text",
		})
	}

	return c.JSON(fiber.Map{
		"success":         true,
		"job_id":          resp.JobID,
		"status":          resp.Status,
		"progress":        resp.Progress,
		"quality_metrics": resp.QualityMetrics,
		"output_key":      resp.OutputKey,
		"error":           resp.Error,
		"model_name":      req.Model,
	})
}

// GenerateSyntheticData generates synthetic data using AI models
func (h *VertexAIHandlers) GenerateSyntheticData(c *fiber.Ctx) error {
	var req struct {
		Model     string                 `json:"model" validate:"required"`
		Schema    map[string]interface{} `json:"schema" validate:"required"`
		NumRows   int                    `json:"num_rows" validate:"required,min=1,max=100000"`
		UserID    int64                  `json:"user_id" validate:"required"`
		DatasetID int64                  `json:"dataset_id" validate:"required"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// Generate synthetic data
	data, err := h.vertexAI.GenerateSyntheticData(req.Schema, req.NumRows, agents.ModelType(req.Model))
	if err != nil {
		h.logger.Error("Failed to generate synthetic data", zap.Error(err))
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to generate synthetic data",
		})
	}

	// Log generation event
	h.logger.Info("Synthetic data generated",
		zap.Int64("user_id", req.UserID),
		zap.Int64("dataset_id", req.DatasetID),
		zap.String("model", req.Model),
		zap.Int("rows", req.NumRows),
	)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    data,
		"count":   len(data),
		"model":   req.Model,
		"schema":  req.Schema,
	})
}

// StreamGeneration streams synthetic data generation
func (h *VertexAIHandlers) StreamGeneration(c *fiber.Ctx) error {
	var req struct {
		Model     string                 `json:"model" validate:"required"`
		Schema    map[string]interface{} `json:"schema" validate:"required"`
		NumRows   int                    `json:"num_rows" validate:"required,min=1,max=100000"`
		UserID    int64                  `json:"user_id" validate:"required"`
		DatasetID int64                  `json:"dataset_id" validate:"required"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// Set up Server-Sent Events
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")

	// Create a channel for streaming data
	dataChan := make(chan map[string]interface{}, 100)
	errorChan := make(chan error, 1)

	// Start generation in a goroutine
	go func() {
		defer close(dataChan)
		defer close(errorChan)

		// Generate data in batches
		batchSize := 100
		for i := 0; i < req.NumRows; i += batchSize {
			end := i + batchSize
			if end > req.NumRows {
				end = req.NumRows
			}

			// Generate batch
			batchData, err := h.vertexAI.GenerateSyntheticData(req.Schema, end-i, agents.ModelType(req.Model))
			if err != nil {
				errorChan <- err
				return
			}

			// Send batch data
			for _, row := range batchData {
				select {
				case dataChan <- row:
				case <-c.Context().Done():
					return
				}
			}
		}
	}()

	// Stream data to client
	rowCount := 0
	for {
		select {
		case data, ok := <-dataChan:
			if !ok {
				// Generation complete
				c.WriteString(fmt.Sprintf("data: %s\n\n", `{"type": "complete", "total_rows": `+strconv.Itoa(rowCount)+`}`))
				return nil
			}

			rowCount++
			jsonData, _ := json.Marshal(data)
			c.WriteString(fmt.Sprintf("data: %s\n\n", jsonData))
			// c.Response().Flush()

		case err := <-errorChan:
			if err != nil {
				c.WriteString(fmt.Sprintf("data: %s\n\n", `{"type": "error", "message": "`+err.Error()+`"}`))
				return err
			}

		case <-c.Context().Done():
			return nil
		}
	}
}

// HealthCheck checks the health of Vertex AI services
func (h *VertexAIHandlers) HealthCheck(c *fiber.Ctx) error {
	// Check Vertex AI health
	err := h.vertexAI.HealthCheck()
	if err != nil {
		return c.Status(503).JSON(fiber.Map{
			"success": false,
			"status":  "unhealthy",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"status":    "healthy",
		"timestamp": time.Now().Unix(),
		"services": map[string]string{
			"vertex_ai": "healthy",
			"claude":    "healthy",
		},
	})
}

// GetUsageStats returns usage statistics for Vertex AI
func (h *VertexAIHandlers) GetUsageStats(c *fiber.Ctx) error {
	// This would typically query a database for usage statistics
	// For now, return mock data
	stats := map[string]interface{}{
		"total_requests":  1250,
		"total_tokens":    45000,
		"total_cost":      125.50,
		"requests_today":  45,
		"tokens_today":    1800,
		"cost_today":      5.25,
		"models_used":     []string{"claude-4-opus", "claude-4-sonnet", "gpt-4"},
		"average_latency": 1.2,
	}

	return c.JSON(fiber.Map{
		"success": true,
		"stats":   stats,
	})
}

// GetModelPricing returns pricing information for all models
func (h *VertexAIHandlers) GetModelPricing(c *fiber.Ctx) error {
	models := h.vertexAI.ListAvailableModels()
	pricing := make(map[string]interface{})

	for _, model := range models {
		pricing[string(model)] = h.vertexAI.GetModelPricing(model)
	}

	return c.JSON(fiber.Map{
		"success":  true,
		"pricing":  pricing,
		"currency": "USD",
	})
}
