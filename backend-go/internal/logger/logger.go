package logger

import (
	"go.uber.org/zap"
)

func New(environment string) (*zap.Logger, error) {
	if environment == "production" {
		return zap.NewProduction()
	}
	return zap.NewDevelopment()
}


