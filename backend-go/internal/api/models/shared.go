package models

type Pagination struct {
	Page       int16 `json:"page"`
	PageSize   int16 `json:"page_size"`
	TotalCount int32 `json:"total_count"`
	TotalPages int32 `json:"total_pages"`
}

type PaginationQuery struct {
	Page     int16  `query:"page"`
	PageSize int16  `query:"page_size"`
	Status   string `query:"status"`
	SortBy   string `query:"sort_by"`
}
