package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
}

func CreateAccessToken(secret, alg string, claims jwt.MapClaims, ttlMinutes int) (string, error) {
	claims["exp"] = time.Now().Add(time.Duration(ttlMinutes) * time.Minute).Unix()
	claims["type"] = "access"
	return sign(secret, alg, claims)
}

func CreateRefreshToken(secret, alg string, claims jwt.MapClaims, ttlDays int) (string, error) {
	claims["exp"] = time.Now().Add(time.Duration(ttlDays) * 24 * time.Hour).Unix()
	claims["type"] = "refresh"
	return sign(secret, alg, claims)
}

func sign(secret, alg string, claims jwt.MapClaims) (string, error) {
	var method jwt.SigningMethod
	switch alg {
	case "HS256":
		method = jwt.SigningMethodHS256
	case "HS512":
		method = jwt.SigningMethodHS512
	default:
		method = jwt.SigningMethodHS256
	}
	return jwt.NewWithClaims(method, claims).SignedString([]byte(secret))
}

func ParseAndValidate(secret, alg, token string) (jwt.MapClaims, error) {
	parsed, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{alg}))
	if err != nil { return nil, err }
	if !parsed.Valid { return nil, jwt.ErrTokenInvalidClaims }
	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok { return nil, jwt.ErrTokenInvalidClaims }
	return claims, nil
}


