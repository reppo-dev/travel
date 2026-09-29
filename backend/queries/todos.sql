-- name: ListTodosByTripID :many
SELECT * FROM trip_todos
WHERE trip_id = $1
ORDER BY due_date ASC NULLS LAST, created_at ASC;

-- name: CreateTodo :one
INSERT INTO trip_todos (
    trip_id, title, due_date, category, is_completed, priority, notes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: UpdateTodo :one
UPDATE trip_todos
SET title = $2,
    due_date = $3,
    category = $4,
    is_completed = $5,
    priority = $6,
    notes = $7,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ToggleTodo :one
UPDATE trip_todos
SET is_completed = NOT is_completed,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteTodo :exec
DELETE FROM trip_todos
WHERE id = $1;
