package v1

import (
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

type AnalyticsDeps struct{}

var (
	analyticsMu    sync.Mutex
	performanceLog = make([][4]float64, 0)
	promptCache    = make(map[string]string)
	feedbackStore  = make(map[string][]float64)
)

func (d AnalyticsDeps) Performance(c *fiber.Ctx) error {
	analyticsMu.Lock()
	defer analyticsMu.Unlock()
	entries := make([]fiber.Map, 0, len(performanceLog))
	for _, e := range performanceLog {
		entries = append(entries, fiber.Map{"timestamp": e[0], "response_time": e[1], "quality": e[2], "cost": e[3]})
	}
	return c.JSON(fiber.Map{"performance_log": entries, "quality_degradation_events": []float64{}})
}

func (d AnalyticsDeps) PromptCache(c *fiber.Ctx) error {
	analyticsMu.Lock()
	defer analyticsMu.Unlock()
	return c.JSON(fiber.Map{"prompt_cache": promptCache})
}

type FeedbackRequest struct {
	GenerationID string  `json:"generation_id"`
	QualityScore float64 `json:"quality_score"`
}

func (d AnalyticsDeps) SubmitFeedback(c *fiber.Ctx) error {
	var body FeedbackRequest
	if err := c.BodyParser(&body); err != nil || body.GenerationID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_body"})
	}
	analyticsMu.Lock()
	feedbackStore[body.GenerationID] = append(feedbackStore[body.GenerationID], body.QualityScore)
	// append a performance sample as well
	performanceLog = append(performanceLog, [4]float64{float64(time.Now().Unix()), 0.0, body.QualityScore, 0.0})
	analyticsMu.Unlock()
	return c.JSON(fiber.Map{"status": "success"})
}

func (d AnalyticsDeps) GetFeedback(c *fiber.Ctx) error {
	id := c.Params("id")
	analyticsMu.Lock()
	scores := feedbackStore[id]
	analyticsMu.Unlock()
	if len(scores) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not_found"})
	}
	sum := 0.0
	for _, s := range scores {
		sum += s
	}
	avg := sum / float64(len(scores))
	return c.JSON(fiber.Map{"average_score": avg, "all_scores": scores})
}
