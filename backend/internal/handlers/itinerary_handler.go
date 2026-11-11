package handlers

import (
	"log"
	"database/sql"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/v-urit/travel/internal/db"
)

type ItineraryHandler struct {
	queries *db.Queries
}

func NewItineraryHandler(queries *db.Queries) *ItineraryHandler {
	return &ItineraryHandler{queries: queries}
}

type DayWithActivities struct {
	db.ItineraryDay
	Activities []db.ItineraryActivity `json:"activities"`
}

func (h *ItineraryHandler) ListDays(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	days, err := h.queries.ListItineraryDaysByTripID(c.UserContext(), tripID)
	if err != nil {
		log.Printf("[Handler Error] %v: %v", "Failed to fetch itinerary days", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch itinerary days"})
	}

	result := make([]DayWithActivities, len(days))
	for i, day := range days {
		activities, err := h.queries.ListActivitiesByDayID(c.UserContext(), day.ID)
		if err != nil {
			activities = []db.ItineraryActivity{}
		}
		result[i] = DayWithActivities{
			ItineraryDay: day,
			Activities:   activities,
		}
	}

	return c.JSON(result)
}

type CreateActivityRequest struct {
	DayID        string  `json:"day_id"`
	TimeSlot     string  `json:"time_slot"`
	Title        string  `json:"title"`
	LocationName string  `json:"location_name"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	StartTime    string  `json:"start_time"`
	EndTime      string  `json:"end_time"`
	Cost         string  `json:"cost"`
	Currency     string  `json:"currency"`
	BookingRef   string  `json:"booking_ref"`
	Notes        string  `json:"notes"`
	SortOrder    int32   `json:"sort_order"`
}

func (h *ItineraryHandler) CreateActivity(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	var req CreateActivityRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	dayID, err := uuid.Parse(req.DayID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid day ID"})
	}

	timeSlot := "morning"
	if req.TimeSlot != "" {
		timeSlot = req.TimeSlot
	}

	currency := "USD"
	if req.Currency != "" {
		currency = req.Currency
	}

	cost := "0.00"
	if req.Cost != "" {
		cost = req.Cost
	}

	activity, err := h.queries.CreateActivity(c.UserContext(), db.CreateActivityParams{
		DayID:        dayID,
		TimeSlot:     timeSlot,
		Title:        req.Title,
		LocationName: sql.NullString{String: req.LocationName, Valid: req.LocationName != ""},
		Latitude:     sql.NullFloat64{Float64: req.Latitude, Valid: true},
		Longitude:    sql.NullFloat64{Float64: req.Longitude, Valid: true},
		StartTime:    sql.NullString{String: req.StartTime, Valid: req.StartTime != ""},
		EndTime:      sql.NullString{String: req.EndTime, Valid: req.EndTime != ""},
		Cost:         sql.NullString{String: cost, Valid: true},
		Currency:     sql.NullString{String: currency, Valid: true},
		BookingRef:   sql.NullString{String: req.BookingRef, Valid: req.BookingRef != ""},
		Notes:        sql.NullString{String: req.Notes, Valid: req.Notes != ""},
		SortOrder:    req.SortOrder,
	})
	if err != nil {
		log.Printf("[Handler Error] %v: %v", "Failed to create activity", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create activity"})
	}

	return c.Status(fiber.StatusCreated).JSON(activity)
}

func (h *ItineraryHandler) DeleteActivity(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	activityIDParam := c.Params("activityId")
	activityID, err := uuid.Parse(activityIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid activity ID"})
	}

	if err := h.queries.DeleteActivity(c.UserContext(), activityID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete activity"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
