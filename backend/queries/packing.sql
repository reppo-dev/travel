-- name: ListPackingItemsByTripID :many
SELECT * FROM packing_items
WHERE trip_id = $1
ORDER BY category ASC, created_at ASC;

-- name: CreatePackingItem :one
INSERT INTO packing_items (
    trip_id, title, category, quantity, is_packed
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: TogglePackingItem :one
UPDATE packing_items
SET is_packed = NOT is_packed
WHERE id = $1
RETURNING *;

-- name: DeletePackingItem :exec
DELETE FROM packing_items
WHERE id = $1;
