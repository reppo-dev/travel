package handlers

import (
	"database/sql"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/v-urit/travel/internal/db"
)

type ExpenseHandler struct {
	queries *db.Queries
}

func NewExpenseHandler(queries *db.Queries) *ExpenseHandler {
	return &ExpenseHandler{queries: queries}
}

type CreateExpenseRequest struct {
	Title       string `json:"title"`
	Category    string `json:"category"`
	Amount      string `json:"amount"` // e.g. "45.50"
	Currency    string `json:"currency"`
	ExpenseDate string `json:"expense_date"` // YYYY-MM-DD
	PayerName   string `json:"payer_name"`
	Notes       string `json:"notes"`
}

func (h *ExpenseHandler) ListExpenses(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	expenses, err := h.queries.ListExpensesByTripID(c.Context(), tripID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch expenses"})
	}

	return c.JSON(expenses)
}

func (h *ExpenseHandler) GetExpenseSummary(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	summary, err := h.queries.GetExpenseSummaryByTripID(c.Context(), tripID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch expense summary"})
	}

	return c.JSON(summary)
}

func (h *ExpenseHandler) CreateExpense(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	var req CreateExpenseRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if req.Title == "" || req.Amount == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Title and amount are required"})
	}

	expDate := time.Now()
	if req.ExpenseDate != "" {
		if t, err := time.Parse("2006-01-02", req.ExpenseDate); err == nil {
			expDate = t
		}
	}

	category := "other"
	if req.Category != "" {
		category = req.Category
	}

	currency := "USD"
	if req.Currency != "" {
		currency = req.Currency
	}

	expense, err := h.queries.CreateExpense(c.Context(), db.CreateExpenseParams{
		TripID:      tripID,
		Title:       req.Title,
		Category:    category,
		Amount:      req.Amount,
		Currency:    currency,
		ExpenseDate: expDate,
		PayerName:   sql.NullString{String: req.PayerName, Valid: req.PayerName != ""},
		Notes:       sql.NullString{String: req.Notes, Valid: req.Notes != ""},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create expense"})
	}

	return c.Status(fiber.StatusCreated).JSON(expense)
}

func (h *ExpenseHandler) DeleteExpense(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	expenseIDParam := c.Params("expenseId")
	expenseID, err := uuid.Parse(expenseIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid expense ID"})
	}

	if err := h.queries.DeleteExpense(c.Context(), expenseID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete expense"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
