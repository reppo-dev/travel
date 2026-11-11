package handlers

import (
	"log"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/v-urit/travel/internal/db"
)

type PackingHandler struct {
	queries *db.Queries
}

func NewPackingHandler(queries *db.Queries) *PackingHandler {
	return &PackingHandler{queries: queries}
}

type CreatePackingRequest struct {
	Title    string `json:"title"`
	Category string `json:"category"`
	Quantity int32  `json:"quantity"`
	IsPacked bool   `json:"is_packed"`
}

func (h *PackingHandler) ListPacking(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	items, err := h.queries.ListPackingItemsByTripID(c.UserContext(), tripID)
	if err != nil {
		log.Printf("[Handler Error] %v: %v", "Failed to fetch packing items", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch packing items"})
	}
	if items == nil {
		items = []db.PackingItem{}
	}

	return c.JSON(items)
}

func (h *PackingHandler) CreatePackingItem(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	var req CreatePackingRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if req.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Title is required"})
	}

	category := "essentials"
	if req.Category != "" {
		category = req.Category
	}

	qty := int32(1)
	if req.Quantity > 0 {
		qty = req.Quantity
	}

	item, err := h.queries.CreatePackingItem(c.UserContext(), db.CreatePackingItemParams{
		TripID:   tripID,
		Title:    req.Title,
		Category: category,
		Quantity: qty,
		IsPacked: req.IsPacked,
	})
	if err != nil {
		log.Printf("[Handler Error] %v: %v", "Failed to create packing item", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create packing item"})
	}

	return c.Status(fiber.StatusCreated).JSON(item)
}

func (h *PackingHandler) TogglePackingItem(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	itemIDParam := c.Params("itemId")
	itemID, err := uuid.Parse(itemIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid packing item ID"})
	}

	updated, err := h.queries.TogglePackingItem(c.UserContext(), itemID)
	if err != nil {
		log.Printf("[Handler Error] %v: %v", "Failed to toggle packing item", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to toggle packing item"})
	}

	return c.JSON(updated)
}

func (h *PackingHandler) DeletePackingItem(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	itemIDParam := c.Params("itemId")
	itemID, err := uuid.Parse(itemIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid packing item ID"})
	}

	if err := h.queries.DeletePackingItem(c.UserContext(), itemID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete packing item"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
