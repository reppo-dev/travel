package handlers

import (
	"log"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/v-urit/travel/internal/db"
	"github.com/v-urit/travel/internal/middleware"
)

type TripHandler struct {
	queries *db.Queries
}

func NewTripHandler(queries *db.Queries) *TripHandler {
	return &TripHandler{queries: queries}
}

// FlexibleString unmarshals either a plain string or an sql.NullString / {String, Valid} JSON object.
type FlexibleString string

func (f *FlexibleString) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err == nil {
		*f = FlexibleString(s)
		return nil
	}
	var obj struct {
		String string `json:"String"`
		Valid  bool   `json:"Valid"`
	}
	if err := json.Unmarshal(b, &obj); err == nil {
		if obj.Valid {
			*f = FlexibleString(obj.String)
		} else {
			*f = ""
		}
		return nil
	}
	return nil
}

func parseDateFlexible(s string) (time.Time, error) {
	formats := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
		"2006-01-02",
		"2006/01/02",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("invalid date format: %s", s)
}

type TripRequest struct {
	Title          string         `json:"title"`
	Destination    string         `json:"destination"`
	Country        string         `json:"country"`
	Latitude       float64        `json:"latitude"`
	Longitude      float64        `json:"longitude"`
	StartDate      string         `json:"start_date"` // "YYYY-MM-DD" or RFC3339
	EndDate        string         `json:"end_date"`   // "YYYY-MM-DD" or RFC3339
	Status         string         `json:"status"`     // "upcoming", "active", "completed", "draft"
	CoverImageUrl  FlexibleString `json:"cover_image_url"`
	TravelersCount int32          `json:"travelers_count"`
	TravelerNames  string         `json:"traveler_names"`
	TagLabel       FlexibleString `json:"tag_label"`
}

func (h *TripHandler) ListTrips(c *fiber.Ctx) error {
	userID, err := middleware.GetCurrentUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	trips, err := h.queries.ListTripsByUserID(c.UserContext(), userID)
	if err != nil {
		log.Printf("[Handler Error] %v: %v", "Failed to fetch trips", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch trips"})
	}

	return c.JSON(trips)
}

func (h *TripHandler) GetTrip(c *fiber.Ctx) error {
	idParam := c.Params("id")
	tripID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	trip, err := verifyTripOwnership(c, h.queries, tripID)
	if err != nil {
		return err
	}

	return c.JSON(trip)
}

func (h *TripHandler) CreateTrip(c *fiber.Ctx) error {
	userID, err := middleware.GetCurrentUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req TripRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if req.Title == "" || req.Destination == "" || req.StartDate == "" || req.EndDate == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Title, destination, start date, and end date are required"})
	}

	startDate, err := parseDateFlexible(req.StartDate)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid start date format, expected YYYY-MM-DD"})
	}

	endDate, err := parseDateFlexible(req.EndDate)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid end date format, expected YYYY-MM-DD"})
	}

	status := "upcoming"
	if req.Status != "" {
		status = req.Status
	}

	coverImage := "/images/tokyo-tower.png"
	if string(req.CoverImageUrl) != "" {
		coverImage = string(req.CoverImageUrl)
	}

	travelersCount := int32(1)
	if req.TravelersCount > 0 {
		travelersCount = req.TravelersCount
	}

	tagLabelStr := string(req.TagLabel)
	trip, err := h.queries.CreateTrip(c.UserContext(), db.CreateTripParams{
		UserID:         userID,
		Title:          req.Title,
		Destination:    req.Destination,
		Country:        req.Country,
		Latitude:       req.Latitude,
		Longitude:      req.Longitude,
		StartDate:      startDate,
		EndDate:        endDate,
		Status:         status,
		CoverImageUrl:  sql.NullString{String: coverImage, Valid: true},
		TravelersCount: travelersCount,
		TravelerNames:  req.TravelerNames,
		TagLabel:       sql.NullString{String: tagLabelStr, Valid: tagLabelStr != ""},
	})
	if err != nil {
		log.Printf("[Handler Error] %v: %v", "Failed to create trip", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create trip"})
	}

	// Auto-generate itinerary days for the trip
	daysCount := int(endDate.Sub(startDate).Hours()/24) + 1
	if daysCount < 1 {
		daysCount = 1
	}
	if daysCount > 30 {
		daysCount = 30 // cap at 30 days
	}

	for i := 1; i <= daysCount; i++ {
		dayDate := startDate.AddDate(0, 0, i-1)
		_, _ = h.queries.CreateItineraryDay(c.UserContext(), db.CreateItineraryDayParams{
			TripID:    trip.ID,
			DayNumber: int32(i),
			Date:      dayDate,
			Title:     fmt.Sprintf("Day %d Exploration", i),
			Notes:     sql.NullString{String: "Explore " + req.Destination, Valid: true},
		})
	}

	return c.Status(fiber.StatusCreated).JSON(trip)
}

func (h *TripHandler) UpdateTrip(c *fiber.Ctx) error {
	idParam := c.Params("id")
	tripID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	var req TripRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	startDate, err := parseDateFlexible(req.StartDate)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid start date format"})
	}

	endDate, err := parseDateFlexible(req.EndDate)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid end date format"})
	}

	status := "upcoming"
	if req.Status != "" {
		status = req.Status
	}

	coverImageStr := string(req.CoverImageUrl)
	tagLabelStr := string(req.TagLabel)
	updated, err := h.queries.UpdateTrip(c.UserContext(), db.UpdateTripParams{
		ID:             tripID,
		Title:          req.Title,
		Destination:    req.Destination,
		Country:        req.Country,
		Latitude:       req.Latitude,
		Longitude:      req.Longitude,
		StartDate:      startDate,
		EndDate:        endDate,
		Status:         status,
		CoverImageUrl:  sql.NullString{String: coverImageStr, Valid: coverImageStr != ""},
		TravelersCount: req.TravelersCount,
		TravelerNames:  req.TravelerNames,
		TagLabel:       sql.NullString{String: tagLabelStr, Valid: tagLabelStr != ""},
	})
	if err != nil {
		log.Printf("[Handler Error] %v: %v", "Failed to update trip", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update trip"})
	}

	return c.JSON(updated)
}

func (h *TripHandler) DeleteTrip(c *fiber.Ctx) error {
	idParam := c.Params("id")
	tripID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	if err := h.queries.DeleteTrip(c.UserContext(), tripID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete trip"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
