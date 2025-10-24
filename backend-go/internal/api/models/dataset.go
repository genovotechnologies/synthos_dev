package models

import "time"

type DatasetFileType string
type CompletionStatus string
type ProcessingStage string
type ProcessingStatus string

const (
	TypeCSV DatasetFileType = "text/csv"
	// TypeJSON DatasetFileType = "application/json"
	// TypeXML  DatasetFileType = "text/xml"
)

const (
	PendingCompletion CompletionStatus = "pending"
	Completed         CompletionStatus = "completed"
	PendingStatus     ProcessingStatus = "pending"
	InProgressStatus  ProcessingStatus = "in_progress"
	DoneStatus        ProcessingStatus = "processed"
)

const (
	IngestionStage ProcessingStage = "ingestion"
	ProfilingStage ProcessingStage = "profiling"
	// _____Stage ProcessingStage = "ingestion"
)

// POST /auth/register
type RegisterBody struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	CompanyName string `json:"company_name"`
	FullName    string `json:"full_name"`
}

// POST /auth/register
type RegisterResponse struct {
	UserId    string    `json:"user_id"`
	Email     string    `json:"email"`
	CompanyID string    `json:"company_id"`
	CreatedAt time.Time `json:"created_at"`
}

// POST /auth/login
type LoginBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// POST /auth/login
type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int32  `json:"expires_in"`
	User         struct {
		UserId           string `json:"user_id"`
		Email            string `json:"email"`
		CompanyName      string `json:"company_name"`
		SubscriptionTier string `json:"subscription_tier"`
	} `json:"user"`
}

// POST /auth/refresh
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// POST /auth/refresh
type RefreshResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int32  `json:"expires_in"`
}

// POST /datasets/upload
type DatasetUploadBody struct {
	FileName    string          `json:"filename"`
	FileSize    int32           `json:"file_size"`
	FileType    DatasetFileType `json:"file_type"`
	Description string          `json:"description"`
}

// POST /datasets/upload
type DatasetUploadResponse struct {
	DatasetId    string `json:"dataset_id"`
	UploadUrl    string `json:"upload_url"`
	UploadMethod string `json:"upload_method"`
	ChunkSize    int32  `json:"chunk_size"`
	ExpiresIn    int32  `json:"expires_in"`
}

// POST /datasets/{dataset_id}/complete
type DatasetCompleteBody struct {
	DatasetId string `json:"dataset_id"`
	Etag      string `json:"etag"`
}

type DatasetProgressInfo struct {
	Stage    ProcessingStage  `json:"stage"`
	Status   ProcessingStatus `json:"status"`
	Progress float32          `json:"progress"`
}

// POST /datasets/{dataset_id}/complete
type DatasetCompleteResponse struct {
	DatasetId           string                `json:"dataset_id"`
	Status              CompletionStatus      `json:"status"`
	EstimatedCompletion time.Time             `json:"estimated_completion"`
	ProcessingStages    []DatasetProgressInfo `json:"processing_stages"`
}

type DatasetMetadataSchema struct {
	ColumnName string  `json:"column_name"`
	DataType   string  `json:"data_type"`
	NullRate   float32 `json:"null_rate"`
	UniqueRate float32 `json:"unique_rate"`
}

type DatasetMetadata struct {
	QualityScore float32                 `json:"data_quality_score"`
	HasPli       bool                    `json:"has_pli"`
	Schema       []DatasetMetadataSchema `json:"schema"`
}

type DatasetProps struct {
	DatasetId  string           `json:"dataset_id"`
	FileName   string           `json:"filename"`
	RowCount   int32            `json:"row_count"`
	Status     CompletionStatus `json:"status"`
	UploadedAt time.Time        `json:"uploaded_at"`
}

// GET /datasets/{dataset_id}
type DatasetByIDResponse struct {
	DatasetProps
	FileSize    int32           `json:"file_size"`
	ColumnCount int32           `json:"column_count"`
	ProcessedAt time.Time       `json:"processed_at"`
	Metadata    DatasetMetadata `json:"metadata"`
}

type Pagination struct {
	Page       int16 `json:"page"`
	PageSize   int16 `json:"page_size"`
	TotalCount int32 `json:"total_count"`
	TotalPages int32 `json:"total_pages"`
}

// GET /datasets
type DatasetsAllResponse struct {
	Datasets   []DatasetProps `json:"datasets"`
	Pagination Pagination     `json:"pagination"`
}

// DELETE /datasets/{dataset_id}
type DatasetDeleteResponse struct {
	DatasetId string `json:"dataset_id"`
	// "deleted"
	Status    string    `json:"status"`
	DeletedAt time.Time `json:"deleted_at"`
}
