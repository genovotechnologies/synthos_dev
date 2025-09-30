package auth

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

type Blacklist struct{ rdb *redis.Client }

func NewBlacklist(rdb *redis.Client) *Blacklist { return &Blacklist{rdb: rdb} }

func (b *Blacklist) Blacklist(ctx context.Context, token string, ttl time.Duration) error {
	if b.rdb == nil { return nil }
	key := "blacklisted_token:" + token
	return b.rdb.SetEx(ctx, key, "1", ttl).Err()
}

func (b *Blacklist) IsBlacklisted(ctx context.Context, token string) (bool, error) {
	if b.rdb == nil { return false, nil }
	key := "blacklisted_token:" + token
	res, err := b.rdb.Exists(ctx, key).Result()
	return res == 1, err
}


