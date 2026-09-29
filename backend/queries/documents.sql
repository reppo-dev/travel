-- name: ListDocumentsByTripID :many
SELECT * FROM documents
WHERE trip_id = $1
ORDER BY valid_date ASC NULLS LAST, created_at ASC;

-- name: CreateDocument :one
INSERT INTO documents (
    trip_id, title, doc_type, file_url, confirmation_code, provider, valid_date, notes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: DeleteDocument :exec
DELETE FROM documents
WHERE id = $1;
