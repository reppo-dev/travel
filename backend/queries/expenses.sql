-- name: ListExpensesByTripID :many
SELECT * FROM expenses
WHERE trip_id = $1
ORDER BY expense_date DESC, created_at DESC;

-- name: CreateExpense :one
INSERT INTO expenses (
    trip_id, title, category, amount, currency, expense_date, payer_name, notes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: DeleteExpense :exec
DELETE FROM expenses
WHERE id = $1;

-- name: GetExpenseSummaryByTripID :many
SELECT category, COUNT(*) as count, SUM(amount)::numeric(12,2) as total
FROM expenses
WHERE trip_id = $1
GROUP BY category;
