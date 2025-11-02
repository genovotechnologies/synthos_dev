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

type WarrantyReqTerms struct {
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
	WarrantyId      string           `json:"warranty_id"`
	ValidationId    string           `json:"validation_id"`
	Status          string           `json:"status"`
	Eligibility     WarrantyReqElig  `json:"eligibility"`
	Terms           WarrantyReqTerms `json:"terms"`
	Conditions      []string         `json:"conditions"`
	ReviewEstimated time.Time        `json:"review_estimated"`
}

//---------------------------------------
