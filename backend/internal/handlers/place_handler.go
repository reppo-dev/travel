package handlers

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/v-urit/travel/internal/db"
)

type PlaceHandler struct {
	queries *db.Queries
}

func NewPlaceHandler(queries *db.Queries) *PlaceHandler {
	return &PlaceHandler{queries: queries}
}

type CreatePlaceRequest struct {
	Title        string  `json:"title"`
	Category     string  `json:"category"`
	Address      string  `json:"address"`
	Neighborhood string  `json:"neighborhood"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	Rating       string  `json:"rating"`
	Notes        string  `json:"notes"`
	ImageUrl     string  `json:"image_url"`
	IsVisited    bool    `json:"is_visited"`
}

func (h *PlaceHandler) ListPlaces(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	places, err := h.queries.ListSavedPlacesByTripID(c.Context(), tripID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch places"})
	}

	return c.JSON(places)
}

func (h *PlaceHandler) CreatePlace(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	var req CreatePlaceRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if req.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Title is required"})
	}

	rating := "4.5"
	if req.Rating != "" {
		rating = req.Rating
	}

	category := "spot"
	if req.Category != "" {
		category = req.Category
	}

	place, err := h.queries.CreateSavedPlace(c.Context(), db.CreateSavedPlaceParams{
		TripID:       tripID,
		Title:        req.Title,
		Category:     category,
		Address:      sql.NullString{String: req.Address, Valid: req.Address != ""},
		Neighborhood: sql.NullString{String: req.Neighborhood, Valid: req.Neighborhood != ""},
		Latitude:     sql.NullFloat64{Float64: req.Latitude, Valid: true},
		Longitude:    sql.NullFloat64{Float64: req.Longitude, Valid: true},
		Rating:       sql.NullString{String: rating, Valid: true},
		Notes:        sql.NullString{String: req.Notes, Valid: req.Notes != ""},
		ImageUrl:     sql.NullString{String: req.ImageUrl, Valid: req.ImageUrl != ""},
		IsVisited:    req.IsVisited,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create place"})
	}

	return c.Status(fiber.StatusCreated).JSON(place)
}

func (h *PlaceHandler) ToggleVisited(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	placeIDParam := c.Params("placeId")
	placeID, err := uuid.Parse(placeIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid place ID"})
	}

	updated, err := h.queries.ToggleSavedPlaceVisited(c.Context(), placeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to toggle place visited status"})
	}

	return c.JSON(updated)
}

func (h *PlaceHandler) DeletePlace(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	placeIDParam := c.Params("placeId")
	placeID, err := uuid.Parse(placeIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid place ID"})
	}

	if err := h.queries.DeleteSavedPlace(c.Context(), placeID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete place"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
