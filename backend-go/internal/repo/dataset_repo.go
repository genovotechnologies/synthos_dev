package repo

import (
	"context"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/models"
	"github.com/jmoiron/sqlx"
)

type DatasetRepo struct{ db *sqlx.DB }

func NewDatasetRepo(db *sqlx.DB) *DatasetRepo { return &DatasetRepo{db: db} }

func (r *DatasetRepo) CreateSchema(ctx context.Context) error {
	stmt := `CREATE TABLE IF NOT EXISTS datasets (
        id BIGSERIAL PRIMARY KEY,
        owner_id BIGINT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NULL,
        status TEXT NOT NULL DEFAULT 'processing',
        original_filename TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        file_type TEXT NOT NULL,
        object_key TEXT NULL,
        row_count BIGINT NOT NULL DEFAULT 0,
        column_count BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
	_, err := r.db.ExecContext(ctx, stmt)
	return err
}

func (r *DatasetRepo) Insert(ctx context.Context, d *models.Dataset) (*models.Dataset, error) {
	q := `INSERT INTO datasets (owner_id, name, description, status, original_filename, file_size, file_type, row_count, column_count)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          RETURNING id, owner_id, name, description, status, original_filename, file_size, file_type, object_key, row_count, column_count, created_at, updated_at`
	var out models.Dataset
	if err := r.db.QueryRowxContext(ctx, q, d.OwnerID, d.Name, d.Description, d.Status, d.OriginalFile, d.FileSize, d.FileType, d.RowCount, d.ColumnCount).StructScan(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *DatasetRepo) UpdateObjectKey(ctx context.Context, id int64, key string, status models.DatasetStatus) error {
	q := `UPDATE datasets SET object_key=$1, status=$2, updated_at=NOW() WHERE id=$3`
	_, err := r.db.ExecContext(ctx, q, key, status, id)
	return err
}

func (r *DatasetRepo) ListByOwner(ctx context.Context, owner int64, limit, offset int) ([]models.Dataset, error) {
	q := `SELECT id, owner_id, name, description, status, original_filename, file_size, file_type, object_key, row_count, column_count, created_at, updated_at
          FROM datasets WHERE owner_id=$1 AND status <> 'archived' ORDER BY created_at DESC LIMIT $2 OFFSET $3`
	rows, err := r.db.QueryxContext(ctx, q, owner, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []models.Dataset
	for rows.Next() {
		var d models.Dataset
		if err := rows.StructScan(&d); err != nil {
			return nil, err
		}
		res = append(res, d)
	}
	return res, rows.Err()
}

func (r *DatasetRepo) GetByOwnerID(ctx context.Context, owner, id int64) (*models.Dataset, error) {
	q := `SELECT id, owner_id, name, description, status, original_filename, file_size, file_type, object_key, row_count, column_count, created_at, updated_at
          FROM datasets WHERE owner_id=$1 AND id=$2`
	var d models.Dataset
	if err := r.db.QueryRowxContext(ctx, q, owner, id).StructScan(&d); err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *DatasetRepo) Archive(ctx context.Context, owner, id int64) error {
	q := `UPDATE datasets SET status='archived', updated_at=NOW() WHERE owner_id=$1 AND id=$2`
	_, err := r.db.ExecContext(ctx, q, owner, id)
	return err
}

func (r *DatasetRepo) GetCountByOwner(ctx context.Context, owner int64) (int64, error) {
	query := `SELECT COUNT(*) FROM datasets WHERE owner_id = $1 AND status <> 'archived'`
	var count int64
	err := r.db.GetContext(ctx, &count, query, owner)
	return count, err
}
