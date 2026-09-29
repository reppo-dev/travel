package config

import (
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port             string
	DatabaseURL      string
	JWTSecret        string
	JWTAccessExpiry  time.Duration
	JWTRefreshExpiry time.Duration
	CORSOrigin       string
}

func Load() *Config {
	_ = godotenv.Load()

	port := getEnv("PORT", "8080")
	dbURL := getEnv("DATABASE_URL", "postgres://postgres:13802002@localhost:5432/travel?sslmode=disable")
	jwtSecret := getEnv("JWT_SECRET", "super_secret_wanderly_jwt_key_2027_production_grade")
	corsOrigin := getEnv("CORS_ORIGIN", "http://localhost:3000")

	accessExpiryStr := getEnv("JWT_ACCESS_EXPIRY", "15m")
	accessExpiry, err := time.ParseDuration(accessExpiryStr)
	if err != nil {
		accessExpiry = 15 * time.Minute
	}

	refreshExpiryStr := getEnv("JWT_REFRESH_EXPIRY", "168h")
	refreshExpiry, err := time.ParseDuration(refreshExpiryStr)
	if err != nil {
		refreshExpiry = 7 * 24 * time.Hour
	}

	log.Printf("[Config] Loaded configuration: Port=%s, CORSOrigin=%s", port, corsOrigin)

	return &Config{
		Port:             port,
		DatabaseURL:      dbURL,
		JWTSecret:        jwtSecret,
		JWTAccessExpiry:  accessExpiry,
		JWTRefreshExpiry: refreshExpiry,
		CORSOrigin:       corsOrigin,
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
