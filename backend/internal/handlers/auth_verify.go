package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/v-urit/travel/internal/db"
	"github.com/v-urit/travel/internal/middleware"
)

// verifyTripOwnership ensures the authenticated user owns the specified trip.
// It prevents Insecure Direct Object References (IDOR) and cross-tenant data leaks.
func verifyTripOwnership(c *fiber.Ctx, q *db.Queries, tripID uuid.UUID) (*db.Trip, error) {
	userID, err := middleware.GetCurrentUserID(c)
	if err != nil {
		_ = c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		return nil, fiber.ErrUnauthorized
	}

	trip, err := q.GetTripByID(c.Context(), tripID)
	if err != nil {
		_ = c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Trip not found"})
		return nil, fiber.ErrNotFound
	}

	if trip.UserID != userID {
		// Return 404 to avoid leaking existence of other users' trips
		_ = c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Trip not found or unauthorized"})
		return nil, fiber.ErrNotFound
	}

	return &trip, nil
}
