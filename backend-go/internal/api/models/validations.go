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

type ValidationCreateOptions struct {
	TargetModelSize string             `json:"target_model_size"`
	TargetArch      string             `json:"target_architecture"`
	Priority        ValidationPriority `json:"priority"`
	EnableWarranty  bool               `json:"enable_warranty"`
}

// POST /validations/create
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

// POST /validations/create
type ValidationCreateResponse struct {
	DatasetId    string `json:"dataset_id"`
	ValidationId string `json:"validation_id"`
	// "queued"
	Status            string             `json:"status"`
	EstimatedComplete time.Time          `json:"estimated_completion"`
	EstimatedCost     float32            `json:"estimated_cost"`
	Stages            []ValidationStages `json:"stages"`
}

type StageInGetValidation struct {
	Stage         string     `json:"stage"`
	Status        string     `json:"status"`
	Progress      float32    `json:"progress"`
	StartedAt     *time.Time `json:"started_at,omitempty"`
	ModelsTrained *int32     `json:"models_trained,omitempty"`
	ModelsTotal   *int32     `json:"models_total,omitempty"`
	CompletedAt   *time.Time `json:"completed_at,omitempty"`
}

// GET /validations/{validation_id}
type ValidationsGetResponse struct {
	DatasetId    string `json:"dataset_id"`
	ValidationId string `json:"validation_id"`
	// "queued" | "running"
	Status            string               `json:"status"`
	EstimatedComplete time.Time            `json:"estimated_completion"`
	CreatedAt         time.Time            `json:"created_at"`
	StartedAt         time.Time            `json:"started_at"`
	CurrentStage      string               `json:"current_stage"`
	Progress          float32              `json:"progress"`
	Stages            StageInGetValidation `json:"stages"`
}
