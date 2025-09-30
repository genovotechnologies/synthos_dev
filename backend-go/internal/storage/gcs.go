package storage

import (
	"context"
	"time"

	cloudstorage "cloud.google.com/go/storage"
	"google.golang.org/api/option"
)

type GCSProvider struct {
	bucket string
	client *cloudstorage.Client
}

func NewGCSProvider(ctx context.Context, bucket string, opts ...option.ClientOption) (*GCSProvider, error) {
	c, err := cloudstorage.NewClient(ctx, opts...)
	if err != nil {
		return nil, err
	}
	return &GCSProvider{bucket: bucket, client: c}, nil
}

func (p *GCSProvider) GetSignedURL(ctx context.Context, key string, ttl time.Duration) (string, error) {
	// For simplicity, use SignedURL via storage.SignedURL (requires service account credentials)
	url, err := cloudstorage.SignedURL(p.bucket, key, &cloudstorage.SignedURLOptions{
		Method:  "GET",
		Expires: time.Now().Add(ttl),
	})
	if err != nil {
		return "", err
	}
	return url, nil
}
