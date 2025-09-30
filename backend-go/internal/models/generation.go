package models

import "time"

type GenerationStatus string

const (
	GenPending   GenerationStatus = "pending"
	GenRunning   GenerationStatus = "running"
	GenCompleted GenerationStatus = "completed"
	GenFailed    GenerationStatus = "failed"
	GenCancelled GenerationStatus = "cancelled"
)

type GenerationJob struct {
	ID             int64            `db:"id" json:"id"`
	DatasetID      int64            `db:"dataset_id" json:"dataset_id"`
	UserID         int64            `db:"user_id" json:"user_id"`
	RowsRequested  int64            `db:"rows_requested" json:"rows_requested"`
	Status         GenerationStatus `db:"status" json:"status"`
	OutputKey      *string          `db:"output_key" json:"output_key,omitempty"`
	OutputFormat   *string          `db:"output_format" json:"output_format,omitempty"`
	RowsGenerated  int64            `db:"rows_generated" json:"rows_generated"`
	ProcessingTime float64          `db:"processing_time" json:"processing_time"`
	CreatedAt      time.Time        `db:"created_at" json:"created_at"`
	StartedAt      *time.Time       `db:"started_at" json:"started_at,omitempty"`
	CompletedAt    *time.Time       `db:"completed_at" json:"completed_at,omitempty"`
}
