// Package testutil provides testing utilities, mocks, and fixtures for the Synthos API
package testutil

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/models"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/require"
)

// TestDB represents a test database connection with mock capabilities
type TestDB struct {
	DB   *sqlx.DB
	Mock sqlmock.Sqlmock
}

// NewTestDB creates a new test database with sqlmock
func NewTestDB(t *testing.T) *TestDB {
	mockDB, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
	require.NoError(t, err)

	sqlxDB := sqlx.NewDb(mockDB, "sqlmock")

	return &TestDB{
		DB:   sqlxDB,
		Mock: mock,
	}
}

// Close closes the test database connection
func (db *TestDB) Close() error {
	return db.DB.Close()
}

// AssertExpectations verifies that all expectations were met
func (db *TestDB) AssertExpectations(t *testing.T) {
	err := db.Mock.ExpectationsWereMet()
	require.NoError(t, err, "unfulfilled expectations")
}

// MockContext returns a test context with timeout
func MockContext() context.Context {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	_ = cancel // Context will be cancelled by test cleanup
	return ctx
}

// MockContextWithCancel returns a test context with cancel function
func MockContextWithCancel() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 5*time.Second)
}

// UserFixture provides test fixture data for users
type UserFixture struct {
	ID               int64
	Email            string
	HashedPassword   string
	FullName         *string
	Company          *string
	Role             models.UserRole
	IsActive         bool
	IsVerified       bool
	SubscriptionTier models.SubscriptionTier
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

// DefaultUser returns a default user fixture
func DefaultUser() *UserFixture {
	fullName := "Test User"
	company := "Test Company"
	now := time.Now()

	return &UserFixture{
		ID:               1,
		Email:            "test@example.com",
		HashedPassword:   "$2a$10$abc123def456", // Mock bcrypt hash
		FullName:         &fullName,
		Company:          &company,
		Role:             models.RoleUser,
		IsActive:         true,
		IsVerified:       true,
		SubscriptionTier: models.TierFree,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
}

// AdminUser returns an admin user fixture
func AdminUser() *UserFixture {
	user := DefaultUser()
	user.ID = 2
	user.Email = "admin@example.com"
	user.Role = models.RoleAdmin
	return user
}

// ToModel converts UserFixture to models.User
func (f *UserFixture) ToModel() *models.User {
	return &models.User{
		ID:               f.ID,
		Email:            f.Email,
		HashedPassword:   f.HashedPassword,
		FullName:         f.FullName,
		Company:          f.Company,
		Role:             f.Role,
		IsActive:         f.IsActive,
		IsVerified:       f.IsVerified,
		SubscriptionTier: f.SubscriptionTier,
		CreatedAt:        f.CreatedAt,
		UpdatedAt:        f.UpdatedAt,
	}
}

// DatasetFixture provides test fixture data for datasets
type DatasetFixture struct {
	ID           int64
	OwnerID      int64
	Name         string
	Description  *string
	Status       models.DatasetStatus
	OriginalFile string
	FileSize     int64
	FileType     string
	ObjectKey    *string
	RowCount     int64
	ColumnCount  int64
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// DefaultDataset returns a default dataset fixture
func DefaultDataset() *DatasetFixture {
	desc := "Test dataset"
	key := "datasets/test-key.csv"
	now := time.Now()

	return &DatasetFixture{
		ID:           1,
		OwnerID:      1,
		Name:         "Test Dataset",
		Description:  &desc,
		Status:       models.DatasetReady,
		OriginalFile: "test.csv",
		FileSize:     1024,
		FileType:     "text/csv",
		ObjectKey:    &key,
		RowCount:     100,
		ColumnCount:  5,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

// ToModel converts DatasetFixture to models.Dataset
func (f *DatasetFixture) ToModel() *models.Dataset {
	return &models.Dataset{
		ID:           f.ID,
		OwnerID:      f.OwnerID,
		Name:         f.Name,
		Description:  f.Description,
		Status:       f.Status,
		OriginalFile: f.OriginalFile,
		FileSize:     f.FileSize,
		FileType:     f.FileType,
		ObjectKey:    f.ObjectKey,
		RowCount:     f.RowCount,
		ColumnCount:  f.ColumnCount,
		CreatedAt:    f.CreatedAt,
		UpdatedAt:    f.UpdatedAt,
	}
}

// GenerationJobFixture provides test fixture data for generation jobs
type GenerationJobFixture struct {
	ID            int64
	DatasetID     int64
	UserID        int64
	RowsRequested int64
	Status        models.GenerationStatus
	OutputKey     *string
	OutputFormat  *string
	RowsGenerated int64
	CreatedAt     time.Time
	StartedAt     *time.Time
	CompletedAt   *time.Time
}

// DefaultGenerationJob returns a default generation job fixture
func DefaultGenerationJob() *GenerationJobFixture {
	outputKey := "generations/output.csv"
	outputFormat := "csv"
	now := time.Now()

	return &GenerationJobFixture{
		ID:            1,
		DatasetID:     1,
		UserID:        1,
		RowsRequested: 1000,
		Status:        models.GenCompleted,
		OutputKey:     &outputKey,
		OutputFormat:  &outputFormat,
		RowsGenerated: 1000,
		CreatedAt:     now,
		StartedAt:     &now,
		CompletedAt:   &now,
	}
}

// ToModel converts GenerationJobFixture to models.GenerationJob
func (f *GenerationJobFixture) ToModel() *models.GenerationJob {
	return &models.GenerationJob{
		ID:            f.ID,
		DatasetID:     f.DatasetID,
		UserID:        f.UserID,
		RowsRequested: f.RowsRequested,
		Status:        f.Status,
		OutputKey:     f.OutputKey,
		OutputFormat:  f.OutputFormat,
		RowsGenerated: f.RowsGenerated,
		CreatedAt:     f.CreatedAt,
		StartedAt:     f.StartedAt,
		CompletedAt:   f.CompletedAt,
	}
}

// CustomModelFixture provides test fixture data for custom models
type CustomModelFixture struct {
	ID                   int64
	OwnerID              int64
	Name                 string
	Description          *string
	ModelType            models.CustomModelType
	Status               models.CustomModelStatus
	Version              *string
	FrameworkVersion     *string
	AccuracyScore        *float64
	ValidationMetrics    *string
	ModelS3Key           *string
	ConfigS3Key          *string
	RequirementsS3Key    *string
	FileSize             *int64
	SupportedColumnTypes *string
	MaxColumns           *int64
	MaxRows              *int64
	RequiresGPU          bool
	UsageCount           int64
	LastUsedAt           *time.Time
	Tags                 *string
	ModelMetadata        *string
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

// DefaultCustomModel returns a default custom model fixture
func DefaultCustomModel() *CustomModelFixture {
	desc := "Test model"
	version := "1.0.0"
	framework := "tensorflow==2.15.0"
	accuracy := 0.95
	metrics := `{"accuracy": 0.95, "f1": 0.93}`
	modelKey := "models/test-model.h5"
	configKey := "models/test-config.json"
	requirementsKey := "models/requirements.txt"
	fileSize := int64(10485760) // 10MB
	columnTypes := "numeric,categorical,text"
	maxCols := int64(100)
	maxRows := int64(1000000)
	tags := "test,classification"
	metadata := `{"framework": "tensorflow"}`
	now := time.Now()

	return &CustomModelFixture{
		ID:                   1,
		OwnerID:              1,
		Name:                 "Test Model",
		Description:          &desc,
		ModelType:            models.CustomModelTensorFlow,
		Status:               models.CustomModelReady,
		Version:              &version,
		FrameworkVersion:     &framework,
		AccuracyScore:        &accuracy,
		ValidationMetrics:    &metrics,
		ModelS3Key:           &modelKey,
		ConfigS3Key:          &configKey,
		RequirementsS3Key:    &requirementsKey,
		FileSize:             &fileSize,
		SupportedColumnTypes: &columnTypes,
		MaxColumns:           &maxCols,
		MaxRows:              &maxRows,
		RequiresGPU:          false,
		UsageCount:           0,
		LastUsedAt:           nil,
		Tags:                 &tags,
		ModelMetadata:        &metadata,
		CreatedAt:            now,
		UpdatedAt:            now,
	}
}

// ToModel converts CustomModelFixture to models.CustomModel
func (f *CustomModelFixture) ToModel() *models.CustomModel {
	return &models.CustomModel{
		ID:                   f.ID,
		OwnerID:              f.OwnerID,
		Name:                 f.Name,
		Description:          f.Description,
		ModelType:            f.ModelType,
		Status:               f.Status,
		Version:              f.Version,
		FrameworkVersion:     f.FrameworkVersion,
		AccuracyScore:        f.AccuracyScore,
		ValidationMetrics:    f.ValidationMetrics,
		ModelS3Key:           f.ModelS3Key,
		ConfigS3Key:          f.ConfigS3Key,
		RequirementsS3Key:    f.RequirementsS3Key,
		FileSize:             f.FileSize,
		SupportedColumnTypes: f.SupportedColumnTypes,
		MaxColumns:           f.MaxColumns,
		MaxRows:              f.MaxRows,
		RequiresGPU:          f.RequiresGPU,
		UsageCount:           f.UsageCount,
		LastUsedAt:           f.LastUsedAt,
		Tags:                 f.Tags,
		ModelMetadata:        f.ModelMetadata,
		CreatedAt:            f.CreatedAt,
		UpdatedAt:            f.UpdatedAt,
	}
}

// MockSQLError creates a mock SQL error for testing
func MockSQLError(err error) error {
	if err == nil {
		return sql.ErrNoRows
	}
	return err
}
