package models

import "time"

type ValidationType string
type ValidationPriority string

const (
	ValidationFull ValidationType = "full"
	ValidationPart ValidationType = "partial"
)

const (
	StandardPriority ValidationPriority = "standard"
	// e.g SpecialPriority ValidationPriority = "special"
)

// ------------------------------------------------
// POST /validations/create
type ValidationCreateOptions struct {
	TargetModelSize string             `json:"target_model_size"`
	TargetArch      string             `json:"target_architecture"`
	Priority        ValidationPriority `json:"priority"`
	EnableWarranty  bool               `json:"enable_warranty"`
}

type ValidationCreateBody struct {
	DatasetId      string                  `json:"dataset_id"`
	ValidationType ValidationType          `json:"validation_type"`
	Options        ValidationCreateOptions `json:"options"`
}

type ValidationStages struct {
	Stage             string `json:"stage"`
	Status            string `json:"status"`
	EstimatedDuration int32  `json:"estimated_duration"`
}

type ValidationCreateResponse struct {
	DatasetId    string `json:"dataset_id"`
	ValidationId string `json:"validation_id"`
	// "queued"
	Status            string             `json:"status"`
	EstimatedComplete time.Time          `json:"estimated_completion"`
	EstimatedCost     float32            `json:"estimated_cost"`
	Stages            []ValidationStages `json:"stages"`
}

//-------------------------------------------------

// -------------------------------------------------
// GET /validations/{validation_id}
type StageInGetValidationById struct {
	Stage         string     `json:"stage"`
	Status        string     `json:"status"`
	Progress      float32    `json:"progress"`
	StartedAt     *time.Time `json:"started_at,omitempty"`
	ModelsTrained *int32     `json:"models_trained,omitempty"`
	ModelsTotal   *int32     `json:"models_total,omitempty"`
	CompletedAt   *time.Time `json:"completed_at,omitempty"`
}

type ValidationPredPerf struct {
	Accuracy     float32   `json:"accuracy"`
	ConfInterval []float32 `json:"confidence_interval"`
	ConfLevel    float32   `json:"confidence_level"`
}

type ValidationDimensions struct {
	DistributionFidelity float32 `json:"distribution_fidelity"`
	CorrelationPresv     float32 `json:"correlation_preservation"`
	DiversityRetention   float32 `json:"diversity_retention"`
	RarePattHandling     float32 `json:"rare_pattern_handling"`
	TemporalStability    float32 `json:"temporal_stability"`
	SemanticCoherence    float32 `json:"semantic_coherence"`
}

type ValidationsGetByIdResult struct {
	RiskScore int16 `json:"risk_score"`
	// "low" | "average" | "high"
	RiskLevel     string               `json:"risk_level"`
	PredictedPerf ValidationPredPerf   `json:"prediction_performance"`
	CollapseProb  float32              `json:"collapse_probability"`
	Dimensions    ValidationDimensions `json:"dimensions"`
	// "approved" | "rejected"
	Recommendation     string `json:"recommendation"`
	IsWarrantyEligible bool   `json:"warranty_eligible"`
}

type ValidationsGetByIdResponse struct {
	// "completed" | "running"
	Status       string    `json:"status"`
	DatasetId    string    `json:"dataset_id"`
	ValidationId string    `json:"validation_id"`
	CreatedAt    time.Time `json:"created_at"`
	// For when the `Status` is set to "running"
	StartedAt         *time.Time                  `json:"started_at"`
	EstimatedComplete *time.Time                  `json:"estimated_completion"`
	CurrentStage      *string                     `json:"current_stage"`
	Progress          *float32                    `json:"progress"`
	Stages            *[]StageInGetValidationById `json:"stages"`
	// For when the `Status` is set to "completed"
	CompletedAt    *time.Time                `json:"completed_at"`
	Result         *ValidationsGetByIdResult `json:"results"`
	ReportUrl      *string                   `json:"report_url"`
	CertificateUrl *string                   `json:"certificate_url"`
}

//------------------------------------------

// ------------------------------------------
// GET /validations
type ValidationProps struct {
	// "queued" | "completed" | "running"
	Status       string     `json:"status"`
	DatasetId    string     `json:"dataset_id"`
	ValidationId string     `json:"validation_id"`
	DatasetName  string     `json:"dataset_name"`
	RiskScore    int16      `json:"risk_score"`
	CreatedAt    time.Time  `json:"created_at"`
	CompletedAt  *time.Time `json:"completed_at"`
}

type GetValidationsResponse struct {
	Validations []ValidationProps `json:"validations"`
	Pagination  Pagination        `json:"pagination"`
}

//------------------------------------------

//------------------------------------------
/* GET /validations/{validation_id}/report
 * Purpose: Download detailed validation report (PDF)
 * Response: Binary PDF file with headers:
 */

/*
 * GET /validations/{validation_id}/certificate
 * Purpose: Download validation certificate (if passed)
 * Response: Binary PDF file with digital signature
 */
//------------------------------------------
