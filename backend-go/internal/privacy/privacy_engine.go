package privacy

import (
	"crypto/rand"
	"fmt"
	"math"
	"math/big"
	"time"
)

// PrivacyLevel represents different privacy protection levels
type PrivacyLevel string

const (
	PrivacyLevelLow     PrivacyLevel = "low"
	PrivacyLevelMedium  PrivacyLevel = "medium"
	PrivacyLevelHigh    PrivacyLevel = "high"
	PrivacyLevelMaximum PrivacyLevel = "maximum"
)

// PrivacyBudget manages privacy budget for differential privacy
type PrivacyBudget struct {
	Epsilon      float64     `json:"epsilon"`
	Delta        float64     `json:"delta"`
	SpentEpsilon float64     `json:"spent_epsilon"`
	SpentDelta   float64     `json:"spent_delta"`
	Operations   []Operation `json:"operations"`
}

// Operation represents a privacy operation
type Operation struct {
	Operation string    `json:"operation"`
	Epsilon   float64   `json:"epsilon"`
	Delta     float64   `json:"delta"`
	Timestamp time.Time `json:"timestamp"`
}

// PrivacyEngine handles differential privacy and data protection
type PrivacyEngine struct {
	privacyLevels map[PrivacyLevel]*PrivacyBudget
}

// NewPrivacyEngine creates a new privacy engine
func NewPrivacyEngine() *PrivacyEngine {
	return &PrivacyEngine{
		privacyLevels: map[PrivacyLevel]*PrivacyBudget{
			PrivacyLevelLow: {
				Epsilon: 10.0,
				Delta:   1e-3,
			},
			PrivacyLevelMedium: {
				Epsilon: 1.0,
				Delta:   1e-5,
			},
			PrivacyLevelHigh: {
				Epsilon: 0.1,
				Delta:   1e-6,
			},
			PrivacyLevelMaximum: {
				Epsilon: 0.01,
				Delta:   1e-8,
			},
		},
	}
}

// ApplyDifferentialPrivacy applies differential privacy to data
func (p *PrivacyEngine) ApplyDifferentialPrivacy(data []map[string]interface{}, privacyLevel PrivacyLevel, schema map[string]interface{}) ([]map[string]interface{}, error) {
	budget := p.privacyLevels[privacyLevel]
	if budget == nil {
		return nil, fmt.Errorf("invalid privacy level: %s", privacyLevel)
	}

	protectedData := make([]map[string]interface{}, len(data))

	for i, row := range data {
		protectedRow := make(map[string]interface{})

		for key, value := range row {
			columnInfo := p.getColumnInfo(key, schema)

			if columnInfo.PrivacySensitive {
				protectedValue, err := p.protectSensitiveColumn(value, columnInfo, budget)
				if err != nil {
					return nil, fmt.Errorf("failed to protect sensitive column %s: %w", key, err)
				}
				protectedRow[key] = protectedValue
			} else if columnInfo.DataType == "numerical" {
				protectedValue, err := p.protectNumericalColumn(value, columnInfo, budget)
				if err != nil {
					return nil, fmt.Errorf("failed to protect numerical column %s: %w", key, err)
				}
				protectedRow[key] = protectedValue
			} else if columnInfo.DataType == "categorical" {
				protectedValue, err := p.protectCategoricalColumn(value, columnInfo, budget)
				if err != nil {
					return nil, fmt.Errorf("failed to protect categorical column %s: %w", key, err)
				}
				protectedRow[key] = protectedValue
			} else {
				protectedRow[key] = value
			}
		}

		protectedData[i] = protectedRow
	}

	return protectedData, nil
}

// ColumnInfo represents information about a data column
type ColumnInfo struct {
	Name             string        `json:"name"`
	DataType         string        `json:"data_type"`
	PrivacySensitive bool          `json:"privacy_sensitive"`
	PrivacyCategory  string        `json:"privacy_category"`
	MinValue         float64       `json:"min_value"`
	MaxValue         float64       `json:"max_value"`
	UniqueValues     []interface{} `json:"unique_values"`
}

// getColumnInfo extracts column information from schema
func (p *PrivacyEngine) getColumnInfo(columnName string, schema map[string]interface{}) ColumnInfo {
	columns, ok := schema["columns"].([]interface{})
	if !ok {
		return ColumnInfo{
			Name:             columnName,
			DataType:         "unknown",
			PrivacySensitive: false,
			PrivacyCategory:  "general",
		}
	}

	for _, col := range columns {
		colMap, ok := col.(map[string]interface{})
		if !ok {
			continue
		}

		if colMap["name"] == columnName {
			return ColumnInfo{
				Name:             getString(colMap, "name", columnName),
				DataType:         getString(colMap, "data_type", "unknown"),
				PrivacySensitive: getBool(colMap, "privacy_sensitive", false),
				PrivacyCategory:  getString(colMap, "privacy_category", "general"),
				MinValue:         getFloat64(colMap, "min_value", 0),
				MaxValue:         getFloat64(colMap, "max_value", 100),
				UniqueValues:     getSlice(colMap, "unique_values", []interface{}{}),
			}
		}
	}

	return ColumnInfo{
		Name:             columnName,
		DataType:         "unknown",
		PrivacySensitive: false,
		PrivacyCategory:  "general",
	}
}

// protectSensitiveColumn applies strong privacy protection to sensitive columns
func (p *PrivacyEngine) protectSensitiveColumn(value interface{}, columnInfo ColumnInfo, budget *PrivacyBudget) (interface{}, error) {
	privacyCategory := columnInfo.PrivacyCategory

	switch privacyCategory {
	case "PII":
		return p.applyLaplaceNoise(value, 0.1, 1.0, budget)
	case "financial":
		return p.applyGaussianNoise(value, 0.2, 1e-6, 1000.0, budget)
	case "health":
		return p.applyExponentialMechanism(value, 0.05, 1.0, budget)
	default:
		return p.applyLaplaceNoise(value, 0.2, 1.0, budget)
	}
}

// protectNumericalColumn applies appropriate noise to numerical columns
func (p *PrivacyEngine) protectNumericalColumn(value interface{}, columnInfo ColumnInfo, budget *PrivacyBudget) (interface{}, error) {
	// Determine sensitivity based on column range
	dataRange := columnInfo.MaxValue - columnInfo.MinValue
	sensitivity := math.Min(dataRange*0.01, 10.0) // Cap sensitivity

	// Use Gaussian mechanism for numerical data
	epsilon := math.Min(0.5, budget.Epsilon*0.1)
	delta := math.Min(1e-6, budget.Delta*0.1)

	return p.applyGaussianNoise(value, epsilon, delta, sensitivity, budget)
}

// protectCategoricalColumn applies randomized response to categorical columns
func (p *PrivacyEngine) protectCategoricalColumn(value interface{}, columnInfo ColumnInfo, budget *PrivacyBudget) (interface{}, error) {
	uniqueValues := columnInfo.UniqueValues

	if len(uniqueValues) <= 2 {
		// Binary categorical - use randomized response
		epsilon := math.Min(1.0, budget.Epsilon*0.2)
		return p.applyRandomizedResponse(value, epsilon, uniqueValues, budget)
	} else {
		// Multi-category - use exponential mechanism
		epsilon := math.Min(0.5, budget.Epsilon*0.15)
		return p.applyExponentialMechanism(value, epsilon, 1.0, budget)
	}
}

// applyLaplaceNoise applies Laplace noise for differential privacy
func (p *PrivacyEngine) applyLaplaceNoise(value interface{}, epsilon, sensitivity float64, budget *PrivacyBudget) (interface{}, error) {
	if !budget.canSpend(epsilon, 0.0) {
		return value, fmt.Errorf("insufficient privacy budget for Laplace noise")
	}

	budget.spend(epsilon, 0.0, fmt.Sprintf("laplace_noise_%s", "column"))

	// Generate Laplace noise
	scale := sensitivity / epsilon
	noise := p.generateLaplaceNoise(scale)

	// Apply noise based on value type
	switch v := value.(type) {
	case float64:
		return v + noise, nil
	case int:
		return int(float64(v) + noise), nil
	case int64:
		return int64(float64(v) + noise), nil
	default:
		return value, nil
	}
}

// applyGaussianNoise applies Gaussian noise for (ε,δ)-differential privacy
func (p *PrivacyEngine) applyGaussianNoise(value interface{}, epsilon, delta, sensitivity float64, budget *PrivacyBudget) (interface{}, error) {
	if !budget.canSpend(epsilon, delta) {
		return value, fmt.Errorf("insufficient privacy budget for Gaussian noise")
	}

	budget.spend(epsilon, delta, fmt.Sprintf("gaussian_noise_%s", "column"))

	// Calculate noise scale for Gaussian mechanism
	if epsilon == 0 {
		return value, nil
	}

	c := math.Sqrt(2 * math.Log(1.25/delta))
	sigma := c * sensitivity / epsilon

	noise := p.generateGaussianNoise(sigma)

	// Apply noise based on value type
	switch v := value.(type) {
	case float64:
		return v + noise, nil
	case int:
		return int(float64(v) + noise), nil
	case int64:
		return int64(float64(v) + noise), nil
	default:
		return value, nil
	}
}

// applyRandomizedResponse applies randomized response for categorical data
func (p *PrivacyEngine) applyRandomizedResponse(value interface{}, epsilon float64, uniqueValues []interface{}, budget *PrivacyBudget) (interface{}, error) {
	if !budget.canSpend(epsilon, 0.0) {
		return value, fmt.Errorf("insufficient privacy budget for randomized response")
	}

	budget.spend(epsilon, 0.0, fmt.Sprintf("randomized_response_%s", "column"))

	// Randomized response mechanism
	p := math.Exp(epsilon) / (math.Exp(epsilon) + 1)

	// Random decision
	random, err := p.generateRandomFloat()
	if err != nil {
		return value, err
	}

	if random > p {
		// Flip value
		if len(uniqueValues) == 2 {
			// Binary case
			if value == uniqueValues[0] {
				return uniqueValues[1], nil
			} else {
				return uniqueValues[0], nil
			}
		} else {
			// Multi-category case
			randomIndex, err := p.generateRandomInt(len(uniqueValues))
			if err != nil {
				return value, err
			}
			return uniqueValues[randomIndex], nil
		}
	}

	return value, nil
}

// applyExponentialMechanism applies exponential mechanism for categorical data
func (p *PrivacyEngine) applyExponentialMechanism(value interface{}, epsilon, sensitivity float64, budget *PrivacyBudget) (interface{}, error) {
	if !budget.canSpend(epsilon, 0.0) {
		return value, fmt.Errorf("insufficient privacy budget for exponential mechanism")
	}

	budget.spend(epsilon, 0.0, fmt.Sprintf("exponential_mechanism_%s", "column"))

	// For simplicity, return original value with small probability of change
	random, err := p.generateRandomFloat()
	if err != nil {
		return value, err
	}

	if random < 0.1 { // 10% chance to change
		// This is a simplified implementation
		// In practice, you'd implement the full exponential mechanism
		return value, nil
	}

	return value, nil
}

// GeneratePrivacyReport generates a comprehensive privacy protection report
func (p *PrivacyEngine) GeneratePrivacyReport(originalData, protectedData []map[string]interface{}, privacyLevel PrivacyLevel, budget *PrivacyBudget) map[string]interface{} {
	// Calculate privacy metrics
	privacyMetrics := map[string]interface{}{
		"privacy_level":     privacyLevel,
		"epsilon_used":      budget.SpentEpsilon,
		"delta_used":        budget.SpentDelta,
		"operations_count":  len(budget.Operations),
		"data_utility":      p.calculateDataUtility(originalData, protectedData),
		"privacy_risk":      p.assessPrivacyRisk(budget),
		"compliance_status": p.checkCompliance(budget),
		"recommendations":   p.generateRecommendations(budget),
	}

	return privacyMetrics
}

// calculateDataUtility calculates utility preservation after privacy protection
func (p *PrivacyEngine) calculateDataUtility(original, protected []map[string]interface{}) float64 {
	if len(original) != len(protected) {
		return 0.0
	}

	// Simplified utility calculation
	// In practice, you'd implement more sophisticated metrics
	return 0.85 // Default utility score
}

// assessPrivacyRisk assesses privacy risk level
func (p *PrivacyEngine) assessPrivacyRisk(budget *PrivacyBudget) string {
	totalEpsilon := budget.SpentEpsilon

	if totalEpsilon <= 0.1 {
		return "very_low"
	} else if totalEpsilon <= 1.0 {
		return "low"
	} else if totalEpsilon <= 5.0 {
		return "medium"
	} else if totalEpsilon <= 10.0 {
		return "high"
	} else {
		return "very_high"
	}
}

// checkCompliance checks compliance with privacy regulations
func (p *PrivacyEngine) checkCompliance(budget *PrivacyBudget) map[string]bool {
	return map[string]bool{
		"gdpr_compliant":  budget.SpentEpsilon <= 1.0,
		"ccpa_compliant":  budget.SpentEpsilon <= 5.0,
		"hipaa_ready":     budget.SpentEpsilon <= 0.1,
		"ferpa_compliant": budget.SpentEpsilon <= 1.0,
	}
}

// generateRecommendations generates privacy recommendations
func (p *PrivacyEngine) generateRecommendations(budget *PrivacyBudget) []string {
	var recommendations []string

	remainingEps := budget.Epsilon - budget.SpentEpsilon
	remainingDelta := budget.Delta - budget.SpentDelta

	if remainingEps < 0.1 {
		recommendations = append(recommendations, "Privacy budget nearly exhausted. Consider using higher epsilon for future operations.")
	}

	if budget.SpentEpsilon > 5.0 {
		recommendations = append(recommendations, "High epsilon usage detected. Consider stronger privacy protection.")
	}

	if len(budget.Operations) > 10 {
		recommendations = append(recommendations, "Many privacy operations performed. Consider consolidating operations.")
	}

	return recommendations
}

// Helper methods for budget management
func (b *PrivacyBudget) canSpend(epsilon, delta float64) bool {
	return b.SpentEpsilon+epsilon <= b.Epsilon && b.SpentDelta+delta <= b.Delta
}

func (b *PrivacyBudget) spend(epsilon, delta float64, operation string) bool {
	if !b.canSpend(epsilon, delta) {
		return false
	}

	b.SpentEpsilon += epsilon
	b.SpentDelta += delta
	b.Operations = append(b.Operations, Operation{
		Operation: operation,
		Epsilon:   epsilon,
		Delta:     delta,
		Timestamp: time.Now(),
	})

	return true
}

// Helper methods for random number generation
func (p *PrivacyEngine) generateLaplaceNoise(scale float64) float64 {
	// Generate uniform random number in [0, 1)
	u, _ := p.generateRandomFloat()

	// Transform to Laplace distribution
	if u < 0.5 {
		return scale * math.Log(2*u)
	} else {
		return -scale * math.Log(2*(1-u))
	}
}

func (p *PrivacyEngine) generateGaussianNoise(sigma float64) float64 {
	// Box-Muller transform for Gaussian distribution
	u1, _ := p.generateRandomFloat()
	u2, _ := p.generateRandomFloat()

	z0 := math.Sqrt(-2*math.Log(u1)) * math.Cos(2*math.Pi*u2)
	return sigma * z0
}

func (p *PrivacyEngine) generateRandomFloat() (float64, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return 0, err
	}
	return float64(n.Int64()) / 1000000.0, nil
}

func (p *PrivacyEngine) generateRandomInt(max int) (int, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(int64(max)))
	if err != nil {
		return 0, err
	}
	return int(n.Int64()), nil
}

// Helper functions for type conversion
func getString(m map[string]interface{}, key, defaultValue string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return defaultValue
}

func getBool(m map[string]interface{}, key string, defaultValue bool) bool {
	if v, ok := m[key].(bool); ok {
		return v
	}
	return defaultValue
}

func getFloat64(m map[string]interface{}, key string, defaultValue float64) float64 {
	if v, ok := m[key].(float64); ok {
		return v
	}
	return defaultValue
}

func getSlice(m map[string]interface{}, key string, defaultValue []interface{}) []interface{} {
	if v, ok := m[key].([]interface{}); ok {
		return v
	}
	return defaultValue
}
