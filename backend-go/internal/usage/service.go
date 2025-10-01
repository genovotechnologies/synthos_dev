package usage

import (
	"context"
	"time"

	"github.com/genovotechnologies/synthos_dev/backend-go/internal/pricing"
	"github.com/genovotechnologies/synthos_dev/backend-go/internal/repo"
)

type UsageService struct {
	userRepo        *repo.UserRepo
	genRepo         *repo.GenerationRepo
	dsRepo          *repo.DatasetRepo
	customModelRepo *repo.CustomModelRepo
}

func NewUsageService(userRepo *repo.UserRepo, genRepo *repo.GenerationRepo, dsRepo *repo.DatasetRepo, customModelRepo *repo.CustomModelRepo) *UsageService {
	return &UsageService{
		userRepo:        userRepo,
		genRepo:         genRepo,
		dsRepo:          dsRepo,
		customModelRepo: customModelRepo,
	}
}

type UsageStats struct {
	MonthlyRowsGenerated int64      `json:"monthly_rows_generated"`
	TotalDatasets        int64      `json:"total_datasets"`
	TotalCustomModels    int64      `json:"total_custom_models"`
	PlanLimits           PlanLimits `json:"plan_limits"`
}

type PlanLimits struct {
	MonthlyRowLimit int64 `json:"monthly_row_limit"`
	MaxDatasets     int64 `json:"max_datasets"`
	MaxCustomModels int64 `json:"max_custom_models"`
	APIRateLimit    int64 `json:"api_rate_limit"`
}

func (s *UsageService) GetUsageStats(ctx context.Context, userID int64) (*UsageStats, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Get current month's generation stats
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	monthlyRows, err := s.genRepo.GetMonthlyRowsGenerated(ctx, userID, startOfMonth)
	if err != nil {
		return nil, err
	}

	// Get dataset count
	datasetCount, err := s.dsRepo.GetCountByOwner(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Get custom models count
	customModelCount, err := s.customModelRepo.GetCountByOwner(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Get plan limits
	plans := pricing.SubscriptionPlans()
	var planLimits PlanLimits
	for _, plan := range plans {
		if plan.ID == string(user.SubscriptionTier) {
			planLimits = PlanLimits{
				MonthlyRowLimit: int64(plan.MonthlyLimit),
				MaxDatasets:     int64(plan.MaxDatasets),
				MaxCustomModels: int64(plan.MaxCustomModels),
				APIRateLimit:    int64(plan.APIRateLimit),
			}
			break
		}
	}

	return &UsageStats{
		MonthlyRowsGenerated: monthlyRows,
		TotalDatasets:        datasetCount,
		TotalCustomModels:    customModelCount,
		PlanLimits:           planLimits,
	}, nil
}

func (s *UsageService) CanGenerateRows(ctx context.Context, userID int64, requestedRows int64) (bool, string, error) {
	stats, err := s.GetUsageStats(ctx, userID)
	if err != nil {
		return false, "", err
	}

	// Check monthly row limit
	if stats.PlanLimits.MonthlyRowLimit > 0 &&
		stats.MonthlyRowsGenerated+requestedRows > stats.PlanLimits.MonthlyRowLimit {
		return false, "monthly_limit_exceeded", nil
	}

	return true, "", nil
}

func (s *UsageService) CanCreateDataset(ctx context.Context, userID int64) (bool, string, error) {
	stats, err := s.GetUsageStats(ctx, userID)
	if err != nil {
		return false, "", err
	}

	// Check dataset limit
	if stats.PlanLimits.MaxDatasets > 0 &&
		stats.TotalDatasets >= stats.PlanLimits.MaxDatasets {
		return false, "dataset_limit_exceeded", nil
	}

	return true, "", nil
}

func (s *UsageService) CanCreateCustomModel(ctx context.Context, userID int64) (bool, string, error) {
	stats, err := s.GetUsageStats(ctx, userID)
	if err != nil {
		return false, "", err
	}

	// Check custom model limit
	if stats.PlanLimits.MaxCustomModels > 0 &&
		stats.TotalCustomModels >= stats.PlanLimits.MaxCustomModels {
		return false, "custom_model_limit_exceeded", nil
	}

	return true, "", nil
}
