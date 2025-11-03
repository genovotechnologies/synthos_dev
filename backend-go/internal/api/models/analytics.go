package models

// -----------------------------
// GET /analytics/usage
type AnalyticsUsageLimit struct {
	ValidationsLimit     int16 `json:"validations_limit"`
	ValidationsUsed      int16 `json:"validations_used"`
	ValidationsRemaining int16 `json:"validations_remaining"`
}

type AnalyticsUsageResponse struct {
	Period               string              `json:"period"` // "2025-10 (YYYY-MM)"
	DatasetsUploaded     uint32              `json:"datasets_uploaded"`
	ValidationsCompleted uint32              `json:"validations_completed"`
	TotalRowsValidated   uint64              `json:"total_rows_validated"`
	AverageRiskScore     float32             `json:"average_risk_score"`
	WarantyContracts     int16               `json:"warranty_contracts"`
	SubscriptionTier     string              `json:"subscription_tier"`
	UsageLimits          AnalyticsUsageLimit `json:"usage_limits"`
}

//-----------------------------

// -----------------------------
// GET /analytics/validation-history
type ValidationHistQuery struct {
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	Order     string `json:"order"`
	RiskLevel string `json:"risk_level"`
}

type ValidationHistoryTrends struct {
	AverageRiskScore       float32 `json:"average_risk_score"`
	AverageRiskScoreChange float32 `json:"average_risk_score_change"`
	TotalComputeSaved      float32 `json:"total_compute_saved"`
}

// type ValidationHistData struct {
// 	ValidationId string    `json:"validation_id"`
// 	DatasetName  string     `json:"dataset_name"`
// 	RiskScore float32 `json:"risk_score"`
// 	CompletedAt   time.Time `json:"completed_at,omitempty"`

// }

type ValidationHistoryResponse struct {
	Validations []ValidationProps       `json:"validations"`
	Trends      ValidationHistoryTrends `json:"trends"`
}

//-----------------------------
