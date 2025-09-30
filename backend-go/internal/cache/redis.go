package cache

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

type Redis struct {
	Client *redis.Client
}

func New(redisURL string) (*Redis, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil { return nil, err }
	client := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil { return nil, err }
	return &Redis{Client: client}, nil
}


