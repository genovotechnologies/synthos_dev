package db

import (
	"context"
	"database/sql"
	"time"

	"github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

type Database struct {
	SQL  *sqlx.DB
}

func New(databaseURL string) (*Database, error) {
	// register pgx stdlib driver implicitly by importing stdlib
	_ = stdlib.GetDefaultDriver()
	db, err := sqlx.Open("pgx", databaseURL)
	if err != nil { return nil, err }
	db.SetMaxOpenConns(50)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(30 * time.Minute)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil { return nil, err }
	return &Database{SQL: db}, nil
}


