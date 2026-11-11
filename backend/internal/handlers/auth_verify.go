package handlers

import (
	"log"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/v-urit/travel/internal/db"
	"github.com/v-urit/travel/internal/middleware"
)

type ownershipCacheItem struct {
	userID    uuid.UUID
	expiresAt time.Time
	trip      db.Trip
}

var (
	ownershipCache   = make(map[uuid.UUID]ownershipCacheItem)
	ownershipCacheMu sync.RWMutex
)

// InvalidateTripOwnershipCache removes a trip from cache when it's updated or deleted
func InvalidateTripOwnershipCache(tripID uuid.UUID) {
	ownershipCacheMu.Lock()
	delete(ownershipCache, tripID)
	ownershipCacheMu.Unlock()
}

// verifyTripOwnership ensures the authenticated user owns the specified trip.
// It caches ownership lookups for 60 seconds to eliminate redundant database roundtrips.
func verifyTripOwnership(c *fiber.Ctx, q *db.Queries, tripID uuid.UUID) (*db.Trip, error) {
	userID, err := middleware.GetCurrentUserID(c)
	if err != nil {
		_ = c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		return nil, fiber.ErrUnauthorized
	}

	ownershipCacheMu.RLock()
	cached, found := ownershipCache[tripID]
	ownershipCacheMu.RUnlock()

	if found && time.Now().Before(cached.expiresAt) {
		if cached.userID != userID {
			_ = c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Trip not found or unauthorized"})
			return nil, fiber.ErrNotFound
		}
		return &cached.trip, nil
	}

	trip, err := q.GetTripByID(c.UserContext(), tripID)
	if err != nil {
		log.Printf("[verifyTripOwnership] GetTripByID error for trip %s: %v", tripID, err)
		_ = c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Trip not found"})
		return nil, fiber.ErrNotFound
	}

	if trip.UserID != userID {
		log.Printf("[verifyTripOwnership] Unauthorized: user %s does not own trip %s (owned by %s)", userID, tripID, trip.UserID)
		_ = c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Trip not found or unauthorized"})
		return nil, fiber.ErrNotFound
	}

	ownershipCacheMu.Lock()
	ownershipCache[tripID] = ownershipCacheItem{
		userID:    userID,
		expiresAt: time.Now().Add(60 * time.Second),
		trip:      trip,
	}
	ownershipCacheMu.Unlock()

	return &trip, nil
}
