package storage

import (
	"context"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Provider struct {
	bucket    string
	presigner *s3.PresignClient
}

func NewS3Provider(ctx context.Context, bucket string, region string) (*S3Provider, error) {
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		return nil, err
	}
	client := s3.NewFromConfig(cfg)
	pres := s3.NewPresignClient(client)
	return &S3Provider{bucket: bucket, presigner: pres}, nil
}

func (p *S3Provider) GetSignedURL(ctx context.Context, key string, ttl time.Duration) (string, error) {
	req, err := p.presigner.PresignGetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(p.bucket), Key: aws.String(key)}, func(opts *s3.PresignOptions) { opts.Expires = ttl })
	if err != nil {
		return "", err
	}
	return req.URL, nil
}
