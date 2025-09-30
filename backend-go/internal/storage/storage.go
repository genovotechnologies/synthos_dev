package storage

import (
	"context"
	"time"
)

type SignedURLProvider interface {
	GetSignedURL(ctx context.Context, key string, ttl time.Duration) (string, error)
}
