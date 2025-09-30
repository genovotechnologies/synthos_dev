package models

import "time"

type DatasetStatus string

const (
	DatasetProcessing DatasetStatus = "processing"
	DatasetReady      DatasetStatus = "ready"
	DatasetArchived   DatasetStatus = "archived"
	DatasetError      DatasetStatus = "error"
)

type Dataset struct {
	ID           int64         `db:"id" json:"id"`
	OwnerID      int64         `db:"owner_id" json:"owner_id"`
	Name         string        `db:"name" json:"name"`
	Description  *string       `db:"description" json:"description,omitempty"`
	Status       DatasetStatus `db:"status" json:"status"`
	OriginalFile string        `db:"original_filename" json:"original_filename"`
	FileSize     int64         `db:"file_size" json:"file_size"`
	FileType     string        `db:"file_type" json:"file_type"`
	ObjectKey    *string       `db:"object_key" json:"object_key,omitempty"`
	RowCount     int64         `db:"row_count" json:"row_count"`
	ColumnCount  int64         `db:"column_count" json:"column_count"`
	CreatedAt    time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time     `db:"updated_at" json:"updated_at"`
}
