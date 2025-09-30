package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"cloud.google.com/go/storage"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/feature/s3/presign"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"google.golang.org/api/option"
)

// StorageProvider represents different storage providers
type StorageProvider string

const (
	ProviderGCS   StorageProvider = "gcs"
	ProviderS3    StorageProvider = "s3"
	ProviderAzure StorageProvider = "azure"
)

// StorageConfig holds configuration for storage providers
type StorageConfig struct {
	Provider       StorageProvider
	GCPProjectID   string
	GCSBucket      string
	AWSAccessKey   string
	AWSSecretKey   string
	AWSRegion      string
	S3Bucket       string
	AzureAccount   string
	AzureKey       string
	AzureContainer string
}

// AdvancedStorage handles multi-provider storage operations
type AdvancedStorage struct {
	config      StorageConfig
	gcsClient   *storage.Client
	s3Client    *s3.Client
	s3Uploader  *manager.Uploader
	s3Presigner *presign.PresignClient
}

// StorageObject represents a stored object
type StorageObject struct {
	Key         string            `json:"key"`
	Bucket      string            `json:"bucket"`
	Size        int64             `json:"size"`
	ContentType string            `json:"content_type"`
	Metadata    map[string]string `json:"metadata"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	ETag        string            `json:"etag"`
	URL         string            `json:"url"`
}

// UploadResult represents the result of an upload operation
type UploadResult struct {
	Key      string            `json:"key"`
	Bucket   string            `json:"bucket"`
	Size     int64             `json:"size"`
	ETag     string            `json:"etag"`
	URL      string            `json:"url"`
	Provider StorageProvider   `json:"provider"`
	Metadata map[string]string `json:"metadata"`
}

// NewAdvancedStorage creates a new advanced storage instance
func NewAdvancedStorage(config StorageConfig) (*AdvancedStorage, error) {
	storage := &AdvancedStorage{
		config: config,
	}

	// Initialize GCS client if GCS is configured
	if config.Provider == ProviderGCS || config.GCSBucket != "" {
		ctx := context.Background()
		client, err := storage.NewClient(ctx, option.WithCredentialsFile(""))
		if err != nil {
			return nil, fmt.Errorf("failed to create GCS client: %w", err)
		}
		storage.gcsClient = client
	}

	// Initialize S3 client if S3 is configured
	if config.Provider == ProviderS3 || config.S3Bucket != "" {
		cfg, err := config.LoadDefaultConfig(context.TODO(),
			config.WithRegion(config.AWSRegion),
			config.WithCredentialsProvider(aws.NewCredentialsCache(
				aws.NewStaticCredentialsProvider(config.AWSAccessKey, config.AWSSecretKey, ""),
			)),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create AWS config: %w", err)
		}

		s3Client := s3.NewFromConfig(cfg)
		storage.s3Client = s3Client
		storage.s3Uploader = manager.NewUploader(s3Client)
		storage.s3Presigner = presign.NewPresignClient(s3Client)
	}

	return storage, nil
}

// Upload uploads data to the configured storage provider
func (s *AdvancedStorage) Upload(ctx context.Context, key string, data io.Reader, contentType string, metadata map[string]string) (*UploadResult, error) {
	switch s.config.Provider {
	case ProviderGCS:
		return s.uploadToGCS(ctx, key, data, contentType, metadata)
	case ProviderS3:
		return s.uploadToS3(ctx, key, data, contentType, metadata)
	default:
		return nil, fmt.Errorf("unsupported storage provider: %s", s.config.Provider)
	}
}

// Download downloads data from the configured storage provider
func (s *AdvancedStorage) Download(ctx context.Context, key string) (io.ReadCloser, error) {
	switch s.config.Provider {
	case ProviderGCS:
		return s.downloadFromGCS(ctx, key)
	case ProviderS3:
		return s.downloadFromS3(ctx, key)
	default:
		return nil, fmt.Errorf("unsupported storage provider: %s", s.config.Provider)
	}
}

// GenerateSignedURL generates a signed URL for the object
func (s *AdvancedStorage) GenerateSignedURL(ctx context.Context, key string, expiration time.Duration) (string, error) {
	switch s.config.Provider {
	case ProviderGCS:
		return s.generateGCSSignedURL(ctx, key, expiration)
	case ProviderS3:
		return s.generateS3SignedURL(ctx, key, expiration)
	default:
		return "", fmt.Errorf("unsupported storage provider: %s", s.config.Provider)
	}
}

// Delete deletes an object from storage
func (s *AdvancedStorage) Delete(ctx context.Context, key string) error {
	switch s.config.Provider {
	case ProviderGCS:
		return s.deleteFromGCS(ctx, key)
	case ProviderS3:
		return s.deleteFromS3(ctx, key)
	default:
		return fmt.Errorf("unsupported storage provider: %s", s.config.Provider)
	}
}

// ListObjects lists objects in the storage bucket
func (s *AdvancedStorage) ListObjects(ctx context.Context, prefix string, maxKeys int) ([]StorageObject, error) {
	switch s.config.Provider {
	case ProviderGCS:
		return s.listGCSObjects(ctx, prefix, maxKeys)
	case ProviderS3:
		return s.listS3Objects(ctx, prefix, maxKeys)
	default:
		return nil, fmt.Errorf("unsupported storage provider: %s", s.config.Provider)
	}
}

// GetObjectInfo gets information about an object
func (s *AdvancedStorage) GetObjectInfo(ctx context.Context, key string) (*StorageObject, error) {
	switch s.config.Provider {
	case ProviderGCS:
		return s.getGCSObjectInfo(ctx, key)
	case ProviderS3:
		return s.getS3ObjectInfo(ctx, key)
	default:
		return nil, fmt.Errorf("unsupported storage provider: %s", s.config.Provider)
	}
}

// GCS-specific methods
func (s *AdvancedStorage) uploadToGCS(ctx context.Context, key string, data io.Reader, contentType string, metadata map[string]string) (*UploadResult, error) {
	bucket := s.gcsClient.Bucket(s.config.GCSBucket)
	obj := bucket.Object(key)

	writer := obj.NewWriter(ctx)
	writer.ContentType = contentType
	writer.Metadata = metadata

	if _, err := io.Copy(writer, data); err != nil {
		writer.Close()
		return nil, fmt.Errorf("failed to upload to GCS: %w", err)
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close GCS writer: %w", err)
	}

	attrs, err := obj.Attrs(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get object attributes: %w", err)
	}

	return &UploadResult{
		Key:      key,
		Bucket:   s.config.GCSBucket,
		Size:     attrs.Size,
		ETag:     attrs.ETag,
		URL:      fmt.Sprintf("gs://%s/%s", s.config.GCSBucket, key),
		Provider: ProviderGCS,
		Metadata: metadata,
	}, nil
}

func (s *AdvancedStorage) downloadFromGCS(ctx context.Context, key string) (io.ReadCloser, error) {
	bucket := s.gcsClient.Bucket(s.config.GCSBucket)
	obj := bucket.Object(key)
	return obj.NewReader(ctx)
}

func (s *AdvancedStorage) generateGCSSignedURL(ctx context.Context, key string, expiration time.Duration) (string, error) {
	bucket := s.gcsClient.Bucket(s.config.GCSBucket)
	obj := bucket.Object(key)

	opts := &storage.SignedURLOptions{
		Scheme:  storage.SigningSchemeV4,
		Method:  "GET",
		Expires: time.Now().Add(expiration),
	}

	url, err := bucket.SignedURL(key, opts)
	if err != nil {
		return "", fmt.Errorf("failed to generate GCS signed URL: %w", err)
	}

	return url, nil
}

func (s *AdvancedStorage) deleteFromGCS(ctx context.Context, key string) error {
	bucket := s.gcsClient.Bucket(s.config.GCSBucket)
	obj := bucket.Object(key)
	return obj.Delete(ctx)
}

func (s *AdvancedStorage) listGCSObjects(ctx context.Context, prefix string, maxKeys int) ([]StorageObject, error) {
	bucket := s.gcsClient.Bucket(s.config.GCSBucket)
	query := &storage.Query{
		Prefix: prefix,
	}

	it := bucket.Objects(ctx, query)
	var objects []StorageObject

	for i := 0; i < maxKeys; i++ {
		attrs, err := it.Next()
		if err == storage.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to list GCS objects: %w", err)
		}

		objects = append(objects, StorageObject{
			Key:         attrs.Name,
			Bucket:      s.config.GCSBucket,
			Size:        attrs.Size,
			ContentType: attrs.ContentType,
			Metadata:    attrs.Metadata,
			CreatedAt:   attrs.Created,
			UpdatedAt:   attrs.Updated,
			ETag:        attrs.ETag,
			URL:         fmt.Sprintf("gs://%s/%s", s.config.GCSBucket, attrs.Name),
		})
	}

	return objects, nil
}

func (s *AdvancedStorage) getGCSObjectInfo(ctx context.Context, key string) (*StorageObject, error) {
	bucket := s.gcsClient.Bucket(s.config.GCSBucket)
	obj := bucket.Object(key)

	attrs, err := obj.Attrs(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get GCS object info: %w", err)
	}

	return &StorageObject{
		Key:         attrs.Name,
		Bucket:      s.config.GCSBucket,
		Size:        attrs.Size,
		ContentType: attrs.ContentType,
		Metadata:    attrs.Metadata,
		CreatedAt:   attrs.Created,
		UpdatedAt:   attrs.Updated,
		ETag:        attrs.ETag,
		URL:         fmt.Sprintf("gs://%s/%s", s.config.GCSBucket, attrs.Name),
	}, nil
}

// S3-specific methods
func (s *AdvancedStorage) uploadToS3(ctx context.Context, key string, data io.Reader, contentType string, metadata map[string]string) (*UploadResult, error) {
	_, err := s.s3Uploader.Upload(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.config.S3Bucket),
		Key:         aws.String(key),
		Body:        data,
		ContentType: aws.String(contentType),
		Metadata:    metadata,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to upload to S3: %w", err)
	}

	// Get object info
	info, err := s.getS3ObjectInfo(ctx, key)
	if err != nil {
		return nil, fmt.Errorf("failed to get S3 object info: %w", err)
	}

	return &UploadResult{
		Key:      key,
		Bucket:   s.config.S3Bucket,
		Size:     info.Size,
		ETag:     info.ETag,
		URL:      fmt.Sprintf("s3://%s/%s", s.config.S3Bucket, key),
		Provider: ProviderS3,
		Metadata: metadata,
	}, nil
}

func (s *AdvancedStorage) downloadFromS3(ctx context.Context, key string) (io.ReadCloser, error) {
	result, err := s.s3Client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.config.S3Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to download from S3: %w", err)
	}

	return result.Body, nil
}

func (s *AdvancedStorage) generateS3SignedURL(ctx context.Context, key string, expiration time.Duration) (string, error) {
	request, err := s.s3Presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.config.S3Bucket),
		Key:    aws.String(key),
	}, func(opts *presign.Options) {
		opts.Expires = expiration
	})
	if err != nil {
		return "", fmt.Errorf("failed to generate S3 signed URL: %w", err)
	}

	return request.URL, nil
}

func (s *AdvancedStorage) deleteFromS3(ctx context.Context, key string) error {
	_, err := s.s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.config.S3Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("failed to delete from S3: %w", err)
	}

	return nil
}

func (s *AdvancedStorage) listS3Objects(ctx context.Context, prefix string, maxKeys int) ([]StorageObject, error) {
	input := &s3.ListObjectsV2Input{
		Bucket:  aws.String(s.config.S3Bucket),
		Prefix:  aws.String(prefix),
		MaxKeys: aws.Int32(int32(maxKeys)),
	}

	result, err := s.s3Client.ListObjectsV2(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to list S3 objects: %w", err)
	}

	var objects []StorageObject
	for _, obj := range result.Contents {
		objects = append(objects, StorageObject{
			Key:       *obj.Key,
			Bucket:    s.config.S3Bucket,
			Size:      *obj.Size,
			CreatedAt: *obj.LastModified,
			UpdatedAt: *obj.LastModified,
			ETag:      *obj.ETag,
			URL:       fmt.Sprintf("s3://%s/%s", s.config.S3Bucket, *obj.Key),
		})
	}

	return objects, nil
}

func (s *AdvancedStorage) getS3ObjectInfo(ctx context.Context, key string) (*StorageObject, error) {
	result, err := s.s3Client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.config.S3Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get S3 object info: %w", err)
	}

	return &StorageObject{
		Key:         key,
		Bucket:      s.config.S3Bucket,
		Size:        *result.ContentLength,
		ContentType: *result.ContentType,
		Metadata:    result.Metadata,
		CreatedAt:   *result.LastModified,
		UpdatedAt:   *result.LastModified,
		ETag:        *result.ETag,
		URL:         fmt.Sprintf("s3://%s/%s", s.config.S3Bucket, key),
	}, nil
}

// Close closes all storage connections
func (s *AdvancedStorage) Close() error {
	if s.gcsClient != nil {
		return s.gcsClient.Close()
	}
	return nil
}
