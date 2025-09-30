package repo

import (
	"context"
	"time"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/models"
	"github.com/jmoiron/sqlx"
)

type GenerationRepo struct{ db *sqlx.DB }

func NewGenerationRepo(db *sqlx.DB) *GenerationRepo { return &GenerationRepo{db: db} }

func (r *GenerationRepo) CreateSchema(ctx context.Context) error {
	stmt := `CREATE TABLE IF NOT EXISTS generation_jobs (
        id BIGSERIAL PRIMARY KEY,
        dataset_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        rows_requested BIGINT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        output_key TEXT NULL,
        output_format TEXT NULL,
        rows_generated BIGINT NOT NULL DEFAULT 0,
        processing_time DOUBLE PRECISION NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        started_at TIMESTAMPTZ NULL,
        completed_at TIMESTAMPTZ NULL
    )`
	_, err := r.db.ExecContext(ctx, stmt)
	return err
}

func (r *GenerationRepo) Insert(ctx context.Context, job *models.GenerationJob) (*models.GenerationJob, error) {
	q := `INSERT INTO generation_jobs (dataset_id, user_id, rows_requested, status)
          VALUES ($1,$2,$3,'pending')
          RETURNING id, dataset_id, user_id, rows_requested, status, output_key, output_format, rows_generated, processing_time, created_at, started_at, completed_at`
	var out models.GenerationJob
	if err := r.db.QueryRowxContext(ctx, q, job.DatasetID, job.UserID, job.RowsRequested).StructScan(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *GenerationRepo) GetByOwner(ctx context.Context, userID, jobID int64) (*models.GenerationJob, error) {
	q := `SELECT id, dataset_id, user_id, rows_requested, status, output_key, output_format, rows_generated, processing_time, created_at, started_at, completed_at
          FROM generation_jobs WHERE id=$1 AND user_id=$2`
	var out models.GenerationJob
	if err := r.db.QueryRowxContext(ctx, q, jobID, userID).StructScan(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *GenerationRepo) ListByOwner(ctx context.Context, userID int64, limit, offset int) ([]models.GenerationJob, error) {
	q := `SELECT id, dataset_id, user_id, rows_requested, status, output_key, output_format, rows_generated, processing_time, created_at, started_at, completed_at
          FROM generation_jobs WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
	rows, err := r.db.QueryxContext(ctx, q, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.GenerationJob
	for rows.Next() {
		var j models.GenerationJob
		if err := rows.StructScan(&j); err != nil {
			return nil, err
		}
		list = append(list, j)
	}
	return list, rows.Err()
}

func (r *GenerationRepo) Cancel(ctx context.Context, userID, jobID int64) error {
	q := `UPDATE generation_jobs SET status='cancelled', completed_at=NOW() WHERE id=$1 AND user_id=$2 AND status IN ('pending','running')`
	_, err := r.db.ExecContext(ctx, q, jobID, userID)
	return err
}

func (r *GenerationRepo) GetMonthlyRowsGenerated(ctx context.Context, userID int64, startOfMonth time.Time) (int64, error) {
	query := `
		SELECT COALESCE(SUM(rows_generated), 0) 
		FROM generation_jobs 
		WHERE user_id = $1 AND status = 'completed' AND created_at >= $2
	`
	var total int64
	err := r.db.GetContext(ctx, &total, query, userID, startOfMonth)
	return total, err
}
