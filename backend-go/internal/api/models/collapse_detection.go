package models

// ----------------------------------------
// GET /validations/{validation_id}/collapse-details
type CollapseDetailsResponse struct {
	ValidationID       string                      `json:"validation_id"`
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

//----------------------------------------
