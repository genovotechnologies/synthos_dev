package agents

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"cloud.google.com/go/vertexai/genai"
	"github.com/google/generative-ai-go/genai"
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

// ModelType represents different AI models available through Vertex AI
type ModelType string

const (
	Claude4Opus   ModelType = "claude-4-opus"
	Claude4Sonnet ModelType = "claude-4-sonnet"
	Claude3Opus   ModelType = "claude-3-opus"
	Claude3Sonnet ModelType = "claude-3-sonnet"
	Claude3Haiku  ModelType = "claude-3-haiku"
	Claude2       ModelType = "claude-2"
	GPT4          ModelType = "gpt-4"
	GPT4Turbo     ModelType = "gpt-4-turbo"
	GPT35Turbo    ModelType = "gpt-3.5-turbo"
	PaLM2         ModelType = "palm-2"
	Codey         ModelType = "codey"
	Imagen        ModelType = "imagen"
)

// GenerationRequest represents a request for synthetic data generation
type GenerationRequest struct {
	ModelType        ModelType               `json:"model_type"`
	Prompt           string                  `json:"prompt"`
	MaxTokens        int32                   `json:"max_tokens"`
	Temperature      float32                 `json:"temperature"`
	TopP             float32                 `json:"top_p"`
	TopK             int32                   `json:"top_k"`
	StopSequences    []string                `json:"stop_sequences"`
	SafetySettings   []*genai.SafetySetting  `json:"safety_settings"`
	GenerationConfig *genai.GenerationConfig `json:"generation_config"`
	CustomMetadata   map[string]interface{}  `json:"custom_metadata"`
}

// GenerationResponse represents the response from AI generation
type GenerationResponse struct {
	Text           string                 `json:"text"`
	Usage          *genai.UsageMetadata   `json:"usage"`
	SafetyRatings  []*genai.SafetyRating  `json:"safety_ratings"`
	FinishReason   genai.FinishReason     `json:"finish_reason"`
	ModelName      string                 `json:"model_name"`
	GenerationTime time.Duration          `json:"generation_time"`
	CustomMetadata map[string]interface{} `json:"custom_metadata"`
}

// NewVertexAIAgent creates a new Vertex AI agent
func NewVertexAIAgent(config VertexAIConfig) (*VertexAIAgent, error) {
	ctx := context.Background()

	// Initialize Vertex AI client
	client, err := genai.NewClient(ctx, option.WithAPIKey(config.APIKey))
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

	// Configure model based on request
	model := v.client.GenerativeModel(string(req.ModelType))
	model.SetTemperature(req.Temperature)
	model.SetMaxOutputTokens(req.MaxTokens)
	model.SetTopP(req.TopP)
	model.SetTopK(req.TopK)

	// Set stop sequences if provided
	if len(req.StopSequences) > 0 {
		model.SetStopSequences(req.StopSequences)
	}

	// Set safety settings if provided
	if len(req.SafetySettings) > 0 {
		model.SetSafetySettings(req.SafetySettings)
	}

	// Set generation config if provided
	if req.GenerationConfig != nil {
		model.SetGenerationConfig(req.GenerationConfig)
	}

	// Generate content
	resp, err := model.GenerateContent(v.ctx, genai.Text(req.Prompt))
	if err != nil {
		return nil, fmt.Errorf("failed to generate content: %w", err)
	}

	generationTime := time.Since(startTime)

	// Extract response data
	var text string
	var usage *genai.UsageMetadata
	var safetyRatings []*genai.SafetyRating
	var finishReason genai.FinishReason

	if len(resp.Candidates) > 0 {
		candidate := resp.Candidates[0]

		// Extract text content
		if candidate.Content != nil {
			for _, part := range candidate.Content.Parts {
				if part.Text != "" {
					text += part.Text
				}
			}
		}

		// Extract metadata
		finishReason = candidate.FinishReason
		safetyRatings = candidate.SafetyRatings
	}

	// Extract usage metadata
	if resp.UsageMetadata != nil {
		usage = resp.UsageMetadata
	}

	return &GenerationResponse{
		Text:           text,
		Usage:          usage,
		SafetyRatings:  safetyRatings,
		FinishReason:   finishReason,
		ModelName:      string(req.ModelType),
		GenerationTime: generationTime,
		CustomMetadata: req.CustomMetadata,
	}, nil
}

// GenerateSyntheticData generates synthetic data using AI models
func (v *VertexAIAgent) GenerateSyntheticData(schema map[string]interface{}, numRows int, modelType ModelType) ([]map[string]interface{}, error) {
	// Create prompt for synthetic data generation
	prompt := v.createSyntheticDataPrompt(schema, numRows)

	req := GenerationRequest{
		ModelType:   modelType,
		Prompt:      prompt,
		MaxTokens:   4000,
		Temperature: 0.7,
		TopP:        0.9,
		TopK:        40,
		CustomMetadata: map[string]interface{}{
			"task": "synthetic_data_generation",
			"rows": numRows,
		},
	}

	resp, err := v.GenerateText(req)
	if err != nil {
		return nil, fmt.Errorf("failed to generate synthetic data: %w", err)
	}

	// Parse the generated data
	var syntheticData []map[string]interface{}
	if err := json.Unmarshal([]byte(resp.Text), &syntheticData); err != nil {
		// If JSON parsing fails, try to extract structured data
		syntheticData = v.extractStructuredData(resp.Text, schema)
	}

	return syntheticData, nil
}

// createSyntheticDataPrompt creates a prompt for synthetic data generation
func (v *VertexAIAgent) createSyntheticDataPrompt(schema map[string]interface{}, numRows int) string {
	schemaJSON, _ := json.MarshalIndent(schema, "", "  ")

	return fmt.Sprintf(`
You are an expert data scientist specializing in synthetic data generation. 
Generate %d rows of realistic synthetic data that matches the following schema:

Schema:
%s

Requirements:
1. Generate realistic, diverse data that maintains statistical properties
2. Preserve relationships between columns
3. Ensure data privacy and anonymity
4. Maintain data quality and consistency
5. Follow the exact schema structure

Return the data as a JSON array of objects.
`, numRows, string(schemaJSON))
}

// extractStructuredData extracts structured data from text response
func (v *VertexAIAgent) extractStructuredData(text string, schema map[string]interface{}) []map[string]interface{} {
	// This is a simplified extraction - in production, you'd want more robust parsing
	var data []map[string]interface{}

	// Try to find JSON array in the text
	start := -1
	end := -1

	for i, char := range text {
		if char == '[' {
			start = i
		}
		if char == ']' && start != -1 {
			end = i
			break
		}
	}

	if start != -1 && end != -1 {
		jsonStr := text[start : end+1]
		json.Unmarshal([]byte(jsonStr), &data)
	}

	return data
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
	case Claude4Opus, Claude4Sonnet:
		capabilities["max_tokens"] = 200000
		capabilities["multimodal"] = true
		capabilities["reasoning"] = "advanced"
	case Claude3Opus, Claude3Sonnet:
		capabilities["max_tokens"] = 200000
		capabilities["multimodal"] = true
		capabilities["reasoning"] = "advanced"
	case Claude3Haiku:
		capabilities["max_tokens"] = 32000
		capabilities["reasoning"] = "fast"
	case GPT4, GPT4Turbo:
		capabilities["max_tokens"] = 128000
		capabilities["multimodal"] = true
		capabilities["reasoning"] = "advanced"
	case GPT35Turbo:
		capabilities["max_tokens"] = 16000
		capabilities["reasoning"] = "fast"
	case PaLM2:
		capabilities["max_tokens"] = 8192
		capabilities["reasoning"] = "good"
	case Codey:
		capabilities["code_generation"] = true
		capabilities["max_tokens"] = 8192
		capabilities["reasoning"] = "code_focused"
	}

	return capabilities
}

// ListAvailableModels returns all available models through Vertex AI
func (v *VertexAIAgent) ListAvailableModels() []ModelType {
	return []ModelType{
		Claude4Opus,
		Claude4Sonnet,
		Claude3Opus,
		Claude3Sonnet,
		Claude3Haiku,
		Claude2,
		GPT4,
		GPT4Turbo,
		GPT35Turbo,
		PaLM2,
		Codey,
		Imagen,
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
	case Claude4Opus:
		pricing["input_tokens_per_1k"] = 0.015
		pricing["output_tokens_per_1k"] = 0.075
	case Claude4Sonnet:
		pricing["input_tokens_per_1k"] = 0.003
		pricing["output_tokens_per_1k"] = 0.015
	case Claude3Opus:
		pricing["input_tokens_per_1k"] = 0.015
		pricing["output_tokens_per_1k"] = 0.075
	case Claude3Sonnet:
		pricing["input_tokens_per_1k"] = 0.003
		pricing["output_tokens_per_1k"] = 0.015
	case Claude3Haiku:
		pricing["input_tokens_per_1k"] = 0.00025
		pricing["output_tokens_per_1k"] = 0.00125
	case GPT4:
		pricing["input_tokens_per_1k"] = 0.03
		pricing["output_tokens_per_1k"] = 0.06
	case GPT4Turbo:
		pricing["input_tokens_per_1k"] = 0.01
		pricing["output_tokens_per_1k"] = 0.03
	case GPT35Turbo:
		pricing["input_tokens_per_1k"] = 0.001
		pricing["output_tokens_per_1k"] = 0.002
	case PaLM2:
		pricing["input_tokens_per_1k"] = 0.0005
		pricing["output_tokens_per_1k"] = 0.0015
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
		ModelType:   Claude3Haiku, // Use a lightweight model for health check
		Prompt:      "Hello",
		MaxTokens:   10,
		Temperature: 0.1,
	}

	_, err := v.GenerateText(req)
	return err
}
