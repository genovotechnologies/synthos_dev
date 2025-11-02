package models

// ----------------------------------------
// GET /validations/{validation_id}/collapse-details
type CollapseDetailsResponse struct {
	ValidationId       string                      `json:"validation_id"`
	CollapseDetected   bool                        `json:"collapse_detected"`
	CollapseType       string                      `json:"collapse_type"`
	Severity           string                      `json:"severity"`
	AffectedDimensions []CollapseDimension         `json:"affected_dimensions"`
	ProblematicRegions []CollapseProblematicRegion `json:"problematic_regions"`
	RootCauses         []CollapseRootCause         `json:"root_causes"`
}

type CollapseDimension struct {
	Dimension string `json:"dimension"`
	Score     int    `json:"score"`
	Threshold int    `json:"threshold"`
	Impact    string `json:"impact"`
}

type CollapseProblematicRegion struct {
	RegionID        string   `json:"region_id"`
	RowRange        []int    `json:"row_range"`
	Issue           string   `json:"issue"`
	ImpactScore     int      `json:"impact_score"`
	AffectedColumns []string `json:"affected_columns"`
}

type CollapseRootCause struct {
	Cause       string `json:"cause"`
	Percentage  int    `json:"percentage"`
	Description string `json:"description"`
}

//----------------------------------------

//----------------------------------------
// GET /validations/{validation_id}/recommendations
// Purpose: Get actionable recommendations to fix data

type CollapseCombinedImpact struct {
	CurrentRiskScore  float32 `json:"current_risk_score"`
	ExpectedRiskScore float32 `json:"expected_risk_score"`
	TotalImprovement  float32 `json:"total_improvement"`
	EstimatedTime     string  `json:"estimated_time"` // "3.5 hours"
}

type CollapseRecomImpact struct {
	CurrentRiskScore  float32 `json:"current_risk_score"`
	ExpectedRiskScore float32 `json:"expected_risk_score"`
	Improvement       float32 `json:"improvement"`
}

type CollapseRecomImplemen struct {
	Method        string `json:"method"`
	AffectedRows  uint32 `json:"affected_rows"`
	EstimatedTime string `json:"estimated_time"` // "2 hours"
}

type CollapseRecommendation struct {
	Priority       int16                 `json:"priority"`
	Category       string                `json:"category"` // "data_removal" | "data_augmentation"
	Title          string                `json:"title"`
	Description    string                `json:"description"`
	Impact         CollapseRecomImpact   `json:"impact"`
	Implementation CollapseRecomImplemen `json:"implementation"`
}

type CollapseRecomResponse struct {
	ValidationId    string                   `json:"validation_id"`
	Recommendations []CollapseRecommendation `json:"recommendations"`
	CombinedImpact  CollapseCombinedImpact   `json:"combined_impact"`
}

//----------------------------------------
