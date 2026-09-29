package handlers

import (
	"database/sql"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/v-urit/travel/internal/auth"
	"github.com/v-urit/travel/internal/config"
	"github.com/v-urit/travel/internal/db"
	"github.com/v-urit/travel/internal/middleware"
)

type AuthHandler struct {
	queries *db.Queries
	cfg     *config.Config
}

func NewAuthHandler(queries *db.Queries, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		queries: queries,
		cfg:     cfg,
	}
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	Currency string `json:"currency"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type AuthResponse struct {
	User         db.User `json:"user"`
	AccessToken  string  `json:"access_token"`
	RefreshToken string  `json:"refresh_token"`
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Email, password, and name are required"})
	}

	existingUser, err := h.queries.GetUserByEmail(c.Context(), req.Email)
	if err == nil && existingUser.ID != uuid.Nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "User with this email already exists"})
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	currency := "USD"
	if req.Currency != "" {
		currency = req.Currency
	}

	user, err := h.queries.CreateUser(c.Context(), db.CreateUserParams{
		Email:        req.Email,
		PasswordHash: hash,
		Name:         req.Name,
		AvatarUrl:    sql.NullString{String: "/images/avatar-alex.png", Valid: true},
		Currency:     sql.NullString{String: currency, Valid: true},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user"})
	}

	accessToken, err := auth.GenerateAccessToken(user.ID, user.Email, user.Name, h.cfg.JWTSecret, h.cfg.JWTAccessExpiry)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate access token"})
	}

	rawRefresh, hashRefresh, err := auth.GenerateRefreshToken()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate refresh token"})
	}

	_, err = h.queries.CreateRefreshToken(c.Context(), db.CreateRefreshTokenParams{
		UserID:    user.ID,
		TokenHash: hashRefresh,
		ExpiresAt: time.Now().Add(h.cfg.JWTRefreshExpiry),
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to store refresh token"})
	}

	return c.Status(fiber.StatusCreated).JSON(AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: rawRefresh,
	})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	user, err := h.queries.GetUserByEmail(c.Context(), req.Email)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	accessToken, err := auth.GenerateAccessToken(user.ID, user.Email, user.Name, h.cfg.JWTSecret, h.cfg.JWTAccessExpiry)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate access token"})
	}

	rawRefresh, hashRefresh, err := auth.GenerateRefreshToken()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate refresh token"})
	}

	_, err = h.queries.CreateRefreshToken(c.Context(), db.CreateRefreshTokenParams{
		UserID:    user.ID,
		TokenHash: hashRefresh,
		ExpiresAt: time.Now().Add(h.cfg.JWTRefreshExpiry),
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to store refresh token"})
	}

	return c.JSON(AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: rawRefresh,
	})
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	var req RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if req.RefreshToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Refresh token is required"})
	}

	hash := auth.HashRefreshToken(req.RefreshToken)
	storedToken, err := h.queries.GetRefreshToken(c.Context(), hash)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid or expired refresh token"})
	}

	// Revoke the old token (rotation)
	_ = h.queries.RevokeRefreshToken(c.Context(), hash)

	user, err := h.queries.GetUserByID(c.Context(), storedToken.UserID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User not found"})
	}

	newAccessToken, err := auth.GenerateAccessToken(user.ID, user.Email, user.Name, h.cfg.JWTSecret, h.cfg.JWTAccessExpiry)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate access token"})
	}

	newRawRefresh, newHashRefresh, err := auth.GenerateRefreshToken()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate new refresh token"})
	}

	_, err = h.queries.CreateRefreshToken(c.Context(), db.CreateRefreshTokenParams{
		UserID:    user.ID,
		TokenHash: newHashRefresh,
		ExpiresAt: time.Now().Add(h.cfg.JWTRefreshExpiry),
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to store new refresh token"})
	}

	return c.JSON(fiber.Map{
		"access_token":  newAccessToken,
		"refresh_token": newRawRefresh,
		"user":          user,
	})
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID, err := middleware.GetCurrentUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	user, err := h.queries.GetUserByID(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	return c.JSON(user)
}
