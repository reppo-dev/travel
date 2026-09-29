-- name: ListSavedPlacesByTripID :many
SELECT * FROM saved_places
WHERE trip_id = $1
ORDER BY is_visited ASC, rating DESC;

-- name: CreateSavedPlace :one
INSERT INTO saved_places (
    trip_id, title, category, address, neighborhood, latitude, longitude,
    rating, notes, image_url, is_visited
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
)
RETURNING *;

-- name: ToggleSavedPlaceVisited :one
UPDATE saved_places
SET is_visited = NOT is_visited
WHERE id = $1
RETURNING *;

-- name: DeleteSavedPlace :exec
DELETE FROM saved_places
WHERE id = $1;
