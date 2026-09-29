-- name: ListItineraryDaysByTripID :many
SELECT * FROM itinerary_days
WHERE trip_id = $1
ORDER BY day_number ASC;

-- name: CreateItineraryDay :one
INSERT INTO itinerary_days (
    trip_id, day_number, date, title, notes
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: ListActivitiesByDayID :many
SELECT * FROM itinerary_activities
WHERE day_id = $1
ORDER BY sort_order ASC, start_time ASC;

-- name: CreateActivity :one
INSERT INTO itinerary_activities (
    day_id, time_slot, title, location_name, latitude, longitude,
    start_time, end_time, cost, currency, booking_ref, notes, sort_order
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
)
RETURNING *;

-- name: UpdateActivity :one
UPDATE itinerary_activities
SET time_slot = $2,
    title = $3,
    location_name = $4,
    latitude = $5,
    longitude = $6,
    start_time = $7,
    end_time = $8,
    cost = $9,
    currency = $10,
    booking_ref = $11,
    notes = $12,
    sort_order = $13
WHERE id = $1
RETURNING *;

-- name: DeleteActivity :exec
DELETE FROM itinerary_activities
WHERE id = $1;
