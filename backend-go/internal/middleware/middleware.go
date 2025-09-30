package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	"github.com/gofiber/fiber/v2/middleware/session"
	redisstore "github.com/gofiber/storage/redis"
)

type Options struct {
	AllowedHosts []string
	ForceHTTPS   bool
	RateLimitRPS int
	SessionKey   string
	RedisURL     string
}

// Register common middlewares; mount before routes
func Register(app *fiber.App, opts Options) error {
	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(logger.New())
	app.Use(helmet.New())
	app.Use(compress.New())

	// HTTPS enforcement
	if opts.ForceHTTPS {
		app.Use(func(c *fiber.Ctx) error {
			if c.Protocol() != "https" {
				return c.Status(fiber.StatusUpgradeRequired).JSON(fiber.Map{
					"error":      "HTTPS Required",
					"upgrade_to": "https://" + c.Hostname() + c.OriginalURL(),
				})
			}
			return c.Next()
		})
	}

	// Trusted hosts
	if len(opts.AllowedHosts) > 0 {
		allowed := make(map[string]struct{}, len(opts.AllowedHosts))
		for _, h := range opts.AllowedHosts {
			allowed[strings.ToLower(h)] = struct{}{}
		}
		app.Use(func(c *fiber.Ctx) error {
			h := strings.ToLower(c.Hostname())
			if _, ok := allowed[h]; !ok {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "host_not_allowed"})
			}
			return c.Next()
		})
	}

	// Simple rate limiter per IP
	if opts.RateLimitRPS > 0 {
		app.Use(limiter.New(limiter.Config{
			Max:          opts.RateLimitRPS,
			Expiration:   time.Second,
			KeyGenerator: func(c *fiber.Ctx) string { return c.IP() },
		}))
	}

	// Sessions backed by Redis
	if opts.RedisURL != "" && opts.SessionKey != "" {
		store := redisstore.New(redisstore.Config{
			URL: opts.RedisURL,
		})
		{
			sess := session.New(session.Config{
				KeyLookup:      "cookie:synthos_session",
				Expiration:     24 * time.Hour,
				CookieSecure:   opts.ForceHTTPS,
				CookieHTTPOnly: true,
				CookieSameSite: "Lax",
				Storage:        store,
			})
			app.Use(func(c *fiber.Ctx) error {
				// attach session to context if needed later
				_, _ = sess.Get(c)
				return c.Next()
			})
		}
	}

	return nil
}
