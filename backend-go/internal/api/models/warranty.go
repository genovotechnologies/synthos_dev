package models

import "time"

// ---------------------------------------
// POST /validations/{validation_id}/warranty/request
type WarrReqTrainingDet struct {
	ModelSize            string    `json:"model_size"`
	Architecture         string    `json:"architecture"`
	ExpectedStartDate    time.Time `json:"expected_start_date"`
	EstimatedComputeCost float32   `json:"estimated_compute_cost"`
}

type WarrantyReqElig struct {
	RiskScore  float32 `json:"risk_score"`
	Threshold  float32 `json:"threshold"`
	IsEligible bool    `json:"eligible"`
}

type WarrantyTerms struct {
	CoverageType string  `json:"coverage_type"`
	MaxPayout    float32 `json:"max_payout"`
	Deductible   float32 `json:"deductible"`
	Premium      float32 `json:"premium"`
	DurationDays int16   `json:"duration_days"`
}

type WarrantyReqBody struct {
	ValidationId    string             `json:"validation_id"`
	TrainingDetails WarrReqTrainingDet `json:"training_details"`
}

type WarrantyReqResponse struct {
	WarrantyId      string          `json:"warranty_id"`
	ValidationId    string          `json:"validation_id"`
	Status          string          `json:"status"`
	Eligibility     WarrantyReqElig `json:"eligibility"`
	Terms           WarrantyTerms   `json:"terms"`
	Conditions      []string        `json:"conditions"`
	ReviewEstimated time.Time       `json:"review_estimated"`
}

//---------------------------------------

// ---------------------------------------
// GET /warranties/{warranty_id}
type CustomerOblig struct {
	Obligation  string     `json:"obligation"`
	Status      string     `json:"status"`
	VerifiedAt  *time.Time `json:"verified_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

type WarrantyByIdResponse struct {
	WarrantyId          string          `json:"warranty_id"`
	ValidationId        string          `json:"validation_id"`
	Status              string          `json:"status"`
	PurchasedAt         time.Location   `json:"purchased_at"`
	ExpiresAt           time.Time       `json:"expires_at"`
	Terms               WarrantyTerms   `json:"terms"`
	CustomerObligations []CustomerOblig `json:"customer_obligations"`
}

//---------------------------------------
