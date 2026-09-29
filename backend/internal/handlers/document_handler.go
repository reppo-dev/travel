package handlers

import (
	"database/sql"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/v-urit/travel/internal/db"
)

type DocumentHandler struct {
	queries *db.Queries
}

func NewDocumentHandler(queries *db.Queries) *DocumentHandler {
	return &DocumentHandler{queries: queries}
}

type CreateDocumentRequest struct {
	Title            string `json:"title"`
	DocType          string `json:"doc_type"`
	FileUrl          string `json:"file_url"`
	ConfirmationCode string `json:"confirmation_code"`
	Provider         string `json:"provider"`
	ValidDate        string `json:"valid_date"` // YYYY-MM-DD
	Notes            string `json:"notes"`
}

func (h *DocumentHandler) ListDocuments(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	docs, err := h.queries.ListDocumentsByTripID(c.Context(), tripID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch documents"})
	}

	return c.JSON(docs)
}

func (h *DocumentHandler) CreateDocument(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	var req CreateDocumentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if req.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Title is required"})
	}

	var validDate sql.NullTime
	if req.ValidDate != "" {
		if t, err := time.Parse("2006-01-02", req.ValidDate); err == nil {
			validDate = sql.NullTime{Time: t, Valid: true}
		}
	}

	docType := "other"
	if req.DocType != "" {
		docType = req.DocType
	}

	doc, err := h.queries.CreateDocument(c.Context(), db.CreateDocumentParams{
		TripID:           tripID,
		Title:            req.Title,
		DocType:          docType,
		FileUrl:          sql.NullString{String: req.FileUrl, Valid: req.FileUrl != ""},
		ConfirmationCode: sql.NullString{String: req.ConfirmationCode, Valid: req.ConfirmationCode != ""},
		Provider:         sql.NullString{String: req.Provider, Valid: req.Provider != ""},
		ValidDate:        validDate,
		Notes:            sql.NullString{String: req.Notes, Valid: req.Notes != ""},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create document"})
	}

	return c.Status(fiber.StatusCreated).JSON(doc)
}

func (h *DocumentHandler) DeleteDocument(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	docIDParam := c.Params("docId")
	docID, err := uuid.Parse(docIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid document ID"})
	}

	if err := h.queries.DeleteDocument(c.Context(), docID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete document"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
