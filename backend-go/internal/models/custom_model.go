package models

import (
	"time"
)

// CustomModelType represents supported ML frameworks
type CustomModelType string

const (
	CustomModelTensorFlow  CustomModelType = "tensorflow"
	CustomModelPyTorch     CustomModelType = "pytorch"
	CustomModelHuggingFace CustomModelType = "huggingface"
	CustomModelONNX        CustomModelType = "onnx"
	CustomModelScikitLearn CustomModelType = "scikit_learn"
)

// CustomModelStatus represents model lifecycle states
type CustomModelStatus string

const (
	CustomModelUploading  CustomModelStatus = "uploading"
	CustomModelValidating CustomModelStatus = "validating"
	CustomModelReady      CustomModelStatus = "ready"
	CustomModelError      CustomModelStatus = "error"
	CustomModelArchived   CustomModelStatus = "archived"
)

// CustomModel represents user-uploaded ML models
type CustomModel struct {
	ID                   int64             `db:"id" json:"id"`
	OwnerID              int64             `db:"owner_id" json:"owner_id"`
	Name                 string            `db:"name" json:"name"`
	Description          *string           `db:"description" json:"description,omitempty"`
	ModelType            CustomModelType   `db:"model_type" json:"model_type"`
	Status               CustomModelStatus `db:"status" json:"status"`
	Version              *string           `db:"version" json:"version,omitempty"`
	FrameworkVersion     *string           `db:"framework_version" json:"framework_version,omitempty"`
	AccuracyScore        *float64          `db:"accuracy_score" json:"accuracy_score,omitempty"`
	ValidationMetrics    *string           `db:"validation_metrics" json:"validation_metrics,omitempty"` // JSON
	ModelS3Key           *string           `db:"model_s3_key" json:"model_s3_key,omitempty"`
	ConfigS3Key          *string           `db:"config_s3_key" json:"config_s3_key,omitempty"`
	RequirementsS3Key    *string           `db:"requirements_s3_key" json:"requirements_s3_key,omitempty"`
	FileSize             *int64            `db:"file_size" json:"file_size,omitempty"`
	SupportedColumnTypes *string           `db:"supported_column_types" json:"supported_column_types,omitempty"` // JSON array
	MaxColumns           *int64            `db:"max_columns" json:"max_columns,omitempty"`
	MaxRows              *int64            `db:"max_rows" json:"max_rows,omitempty"`
	RequiresGPU          bool              `db:"requires_gpu" json:"requires_gpu"`
	UsageCount           int64             `db:"usage_count" json:"usage_count"`
	LastUsedAt           *time.Time        `db:"last_used_at" json:"last_used_at,omitempty"`
	Tags                 *string           `db:"tags" json:"tags,omitempty"`                     // JSON array
	ModelMetadata        *string           `db:"model_metadata" json:"model_metadata,omitempty"` // JSON
	CreatedAt            time.Time         `db:"created_at" json:"created_at"`
	UpdatedAt            time.Time         `db:"updated_at" json:"updated_at"`
}

// DatasetColumn represents individual columns in datasets
type DatasetColumn struct {
	ID           int64          `db:"id" json:"id"`
	DatasetID    int64          `db:"dataset_id" json:"dataset_id"`
	Name         string         `db:"name" json:"name"`
	DataType     ColumnDataType `db:"data_type" json:"data_type"`
	IsNullable   bool           `db:"is_nullable" json:"is_nullable"`
	IsUnique     bool           `db:"is_unique" json:"is_unique"`
	IsPrimaryKey bool           `db:"is_primary_key" json:"is_primary_key"`
	DefaultValue *string        `db:"default_value" json:"default_value,omitempty"`
	Constraints  *string        `db:"constraints" json:"constraints,omitempty"` // JSON
	Statistics   *string        `db:"statistics" json:"statistics,omitempty"`   // JSON
	CreatedAt    time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time      `db:"updated_at" json:"updated_at"`
}

// ColumnDataType represents supported data types
type ColumnDataType string

const (
	ColumnTypeString      ColumnDataType = "string"
	ColumnTypeText        ColumnDataType = "text"
	ColumnTypeInteger     ColumnDataType = "integer"
	ColumnTypeNumeric     ColumnDataType = "numeric"
	ColumnTypeFloat       ColumnDataType = "float"
	ColumnTypeBoolean     ColumnDataType = "boolean"
	ColumnTypeDate        ColumnDataType = "date"
	ColumnTypeDateTime    ColumnDataType = "datetime"
	ColumnTypeEmail       ColumnDataType = "email"
	ColumnTypePhone       ColumnDataType = "phone"
	ColumnTypeAddress     ColumnDataType = "address"
	ColumnTypeCategorical ColumnDataType = "categorical"
	ColumnTypeCustom      ColumnDataType = "custom"
)
