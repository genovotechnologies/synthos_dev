package agents

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/vertexai/genai"
	"google.golang.org/api/option"
)

// VertexAIConfig holds configuration for Vertex AI
type VertexAIConfig struct {
	ProjectID   string
	Location    string
	ModelName   string
	APIKey      string
	Temperature float32
	MaxTokens   int32
	TopP        float32
	TopK        int32
}

// VertexAIAgent handles all AI model interactions through Vertex AI
type VertexAIAgent struct {
	config VertexAIConfig
	client *genai.Client
	ctx    context.Context
	model  *genai.GenerativeModel
}

// NewVertexAIAgent creates a new Vertex AI agent
func NewVertexAIAgent(config VertexAIConfig) (*VertexAIAgent, error) {
	ctx := context.Background()

	// Initialize Vertex AI client
	client, err := genai.NewClient(ctx, config.ProjectID, config.Location, option.WithAPIKey(config.APIKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create Vertex AI client: %w", err)
	}

	// Get the appropriate model
	model := client.GenerativeModel(config.ModelName)

	// Configure model parameters
	model.SetTemperature(config.Temperature)
	model.SetMaxOutputTokens(config.MaxTokens)
	model.SetTopP(config.TopP)
	model.SetTopK(config.TopK)

	return &VertexAIAgent{
		config: config,
		client: client,
		ctx:    ctx,
		model:  model,
	}, nil
}

// GenerateText generates text using the specified model
func (v *VertexAIAgent) GenerateText(req GenerationRequest) (*GenerationResponse, error) {
	startTime := time.Now()

	// Use the configured model with user parameters
	model := v.model
	model.SetTemperature(req.Config.Temperature)
	model.SetMaxOutputTokens(int32(req.Config.MaxTokens))
	model.SetTopP(req.Config.TopP)
	model.SetTopK(int32(req.Config.TopK))

	// Generate content
	resp, err := model.GenerateContent(v.ctx, genai.Text("Generate synthetic data"))
	if err != nil {
		return nil, fmt.Errorf("failed to generate content: %w", err)
	}

	_ = time.Since(startTime)

	// Extract response data
	var text string
	if len(resp.Candidates) > 0 {
		candidate := resp.Candidates[0]
		if candidate.Content != nil {
			for _, part := range candidate.Content.Parts {
				// Use fmt.Sprint to convert part to string representation
				partText := fmt.Sprint(part)
				if partText != "" {
					text += partText
				}
			}
		}
	}

	return &GenerationResponse{
		JobID:  1,
		Status: "completed",
	}, nil
}

// GenerateSyntheticData generates synthetic data using AI models
func (v *VertexAIAgent) GenerateSyntheticData(schema map[string]interface{}, numRows int, modelType ModelType) ([]map[string]interface{}, error) {
	// Create prompt for synthetic data generation
	_ = v.createSyntheticDataPrompt(schema, numRows)

	req := GenerationRequest{
		DatasetID: 0,
		UserID:    0,
		Config: GenerationConfig{
			ModelType:    modelType,
			Strategy:     StrategyAICreative,
			Rows:         int64(numRows),
			PrivacyLevel: "medium",
			Epsilon:      1.0,
			Delta:        1e-5,
		},
		SchemaAnalysis: SchemaAnalysis{
			Columns: []ColumnInfo{},
		},
	}

	resp, err := v.GenerateText(req)
	if err != nil {
		return nil, fmt.Errorf("failed to generate synthetic data: %w", err)
	}

	// Parse the generated data
	var syntheticData []map[string]interface{}
	if resp.Status == "completed" {
		// Return mock data for now
		syntheticData = make([]map[string]interface{}, numRows)
		for i := 0; i < numRows; i++ {
			syntheticData[i] = map[string]interface{}{
				"id":   i + 1,
				"data": "Generated synthetic data",
			}
		}
	}

	return syntheticData, nil
}

// createSyntheticDataPrompt creates a prompt for synthetic data generation
func (v *VertexAIAgent) createSyntheticDataPrompt(schema map[string]interface{}, numRows int) string {
	return fmt.Sprintf("Generate %d rows of synthetic data matching the provided schema", numRows)
}

// GetModelCapabilities returns the capabilities of a specific model
func (v *VertexAIAgent) GetModelCapabilities(modelType ModelType) map[string]interface{} {
	capabilities := map[string]interface{}{
		"text_generation":    true,
		"code_generation":    true,
		"data_generation":    true,
		"max_tokens":         4000,
		"supports_streaming": true,
	}

	switch modelType {
	case ModelClaude41Opus, ModelClaude41Sonnet:
		capabilities["max_tokens"] = 200000
		capabilities["multimodal"] = true
		capabilities["reasoning"] = "advanced"
	case ModelClaude37Sonnet, ModelClaude35Sonnet, ModelClaude3Sonnet:
		capabilities["max_tokens"] = 200000
		capabilities["multimodal"] = true
		capabilities["reasoning"] = "advanced"
	case ModelClaude4Haiku, ModelClaude35Haiku, ModelClaude3Haiku:
		capabilities["max_tokens"] = 32000
		capabilities["reasoning"] = "fast"
	}

	return capabilities
}

// ListAvailableModels returns all available models through Vertex AI
func (v *VertexAIAgent) ListAvailableModels() []ModelType {
	return []ModelType{
		ModelClaude41Opus,
		ModelClaude41Sonnet,
		ModelClaude4Haiku,
		ModelClaude37Sonnet,
		ModelClaude35Sonnet,
		ModelClaude3Sonnet,
		ModelClaude3Opus,
		ModelClaude35Haiku,
		ModelClaude3Haiku,
		ModelClaude2,
	}
}

// GetModelPricing returns pricing information for a model
func (v *VertexAIAgent) GetModelPricing(modelType ModelType) map[string]interface{} {
	pricing := map[string]interface{}{
		"input_tokens_per_1k":  0.0,
		"output_tokens_per_1k": 0.0,
		"currency":             "USD",
	}

	switch modelType {
	case ModelClaude41Opus, ModelClaude3Opus:
		pricing["input_tokens_per_1k"] = 0.015
		pricing["output_tokens_per_1k"] = 0.075
	case ModelClaude41Sonnet, ModelClaude37Sonnet, ModelClaude35Sonnet, ModelClaude3Sonnet:
		pricing["input_tokens_per_1k"] = 0.003
		pricing["output_tokens_per_1k"] = 0.015
	case ModelClaude4Haiku, ModelClaude35Haiku, ModelClaude3Haiku:
		pricing["input_tokens_per_1k"] = 0.00025
		pricing["output_tokens_per_1k"] = 0.00125
	}

	return pricing
}

// Close closes the Vertex AI client
func (v *VertexAIAgent) Close() error {
	if v.client != nil {
		return v.client.Close()
	}
	return nil
}

// HealthCheck checks if the Vertex AI service is healthy
func (v *VertexAIAgent) HealthCheck() error {
	// Simple health check by trying to generate a small response
	req := GenerationRequest{
		DatasetID: 0,
		UserID:    0,
		Config: GenerationConfig{
			ModelType:    ModelClaude3Haiku,
			Strategy:     StrategyAICreative,
			Rows:         1,
			PrivacyLevel: "low",
		},
		SchemaAnalysis: SchemaAnalysis{
			Columns: []ColumnInfo{},
		},
	}

	_, err := v.GenerateText(req)
	return err
}
