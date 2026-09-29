-- name: ListTripsByUserID :many
SELECT * FROM trips
WHERE user_id = $1
ORDER BY start_date ASC;

-- name: GetTripByID :one
SELECT * FROM trips
WHERE id = $1 LIMIT 1;

-- name: CreateTrip :one
INSERT INTO trips (
    user_id, title, destination, country, latitude, longitude,
    start_date, end_date, status, cover_image_url, travelers_count,
    traveler_names, tag_label
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
)
RETURNING *;

-- name: UpdateTrip :one
UPDATE trips
SET title = $2,
    destination = $3,
    country = $4,
    latitude = $5,
    longitude = $6,
    start_date = $7,
    end_date = $8,
    status = $9,
    cover_image_url = $10,
    travelers_count = $11,
    traveler_names = $12,
    tag_label = $13,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteTrip :exec
DELETE FROM trips
WHERE id = $1;
