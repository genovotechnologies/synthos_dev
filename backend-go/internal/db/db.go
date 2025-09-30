package db

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

type Database struct {
	SQL *sqlx.DB
}

func New(databaseURL string) (*Database, error) {
	// register pgx stdlib driver implicitly by importing stdlib
	_ = stdlib.GetDefaultDriver()
	db, err := sqlx.Open("pgx", databaseURL)
	if err != nil {
		return nil, err
	}
	// Optimized connection pool settings
	db.SetMaxOpenConns(25)                  // Reduced from 50 to prevent connection exhaustion
	db.SetMaxIdleConns(5)                   // Reduced from 10 to be more conservative
	db.SetConnMaxLifetime(15 * time.Minute) // Reduced from 30 minutes
	db.SetConnMaxIdleTime(5 * time.Minute)  // Add idle timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		return nil, err
	}
	return &Database{SQL: db}, nil
}
