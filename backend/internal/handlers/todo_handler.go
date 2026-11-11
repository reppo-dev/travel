package handlers

import (
	"log"
	"database/sql"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/v-urit/travel/internal/db"
)

type TodoHandler struct {
	queries *db.Queries
}

func NewTodoHandler(queries *db.Queries) *TodoHandler {
	return &TodoHandler{queries: queries}
}

type CreateTodoRequest struct {
	Title       string `json:"title"`
	DueDate     string `json:"due_date"` // YYYY-MM-DD
	Category    string `json:"category"` // 'booking', 'packing', 'prep', 'documents', 'general'
	Priority    string `json:"priority"` // 'low', 'medium', 'high'
	Notes       string `json:"notes"`
	IsCompleted bool   `json:"is_completed"`
}

func (h *TodoHandler) ListTodos(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	todos, err := h.queries.ListTodosByTripID(c.UserContext(), tripID)
	if err != nil {
		log.Printf("[Handler Error] %v: %v", "Failed to fetch todos", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch todos"})
	}
	if todos == nil {
		todos = []db.TripTodo{}
	}

	return c.JSON(todos)
}

func (h *TodoHandler) CreateTodo(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	var req CreateTodoRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if req.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Title is required"})
	}

	var dueDate sql.NullTime
	if req.DueDate != "" {
		t, err := time.Parse("2006-01-02", req.DueDate)
		if err == nil {
			dueDate = sql.NullTime{Time: t, Valid: true}
		}
	}

	category := "general"
	if req.Category != "" {
		category = req.Category
	}

	priority := "medium"
	if req.Priority != "" {
		priority = req.Priority
	}

	todo, err := h.queries.CreateTodo(c.UserContext(), db.CreateTodoParams{
		TripID:      tripID,
		Title:       req.Title,
		DueDate:     dueDate,
		Category:    category,
		IsCompleted: req.IsCompleted,
		Priority:    priority,
		Notes:       sql.NullString{String: req.Notes, Valid: req.Notes != ""},
	})
	if err != nil {
		log.Printf("[Handler Error] %v: %v", "Failed to create todo", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create todo"})
	}

	return c.Status(fiber.StatusCreated).JSON(todo)
}

func (h *TodoHandler) ToggleTodo(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	todoIDParam := c.Params("todoId")
	todoID, err := uuid.Parse(todoIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid todo ID"})
	}

	updated, err := h.queries.ToggleTodo(c.UserContext(), todoID)
	if err != nil {
		log.Printf("[Handler Error] %v: %v", "Failed to toggle todo", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to toggle todo"})
	}

	return c.JSON(updated)
}

func (h *TodoHandler) DeleteTodo(c *fiber.Ctx) error {
	tripIDParam := c.Params("id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid trip ID"})
	}

	if _, err := verifyTripOwnership(c, h.queries, tripID); err != nil {
		return err
	}

	todoIDParam := c.Params("todoId")
	todoID, err := uuid.Parse(todoIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid todo ID"})
	}

	if err := h.queries.DeleteTodo(c.UserContext(), todoID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete todo"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
