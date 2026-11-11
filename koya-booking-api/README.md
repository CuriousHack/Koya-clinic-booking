# Koya Clinic Booking API

A modular monolith RESTful booking API built with Node.js, Express, and MongoDB.

## Architecture

This project follows a **modular monolith** architecture with clean separation of concerns:
- **Global Authentication Middleware (`apiKeyAuth.js`)**: Validates the `X-API-Key` header on every request against `.env`.
- **Rate Limiting Middleware (`rateLimiter.js`)**: Enforces at most 5 attempts per email per minute (Level 5).
- **Idempotency Service (`idempotency.service.js`)**: Manages `Idempotency-Key` deduplication and payload validation (Level 4).
- **Routes Layer (`routes.js`)**: Centralizes route declarations and links to controllers.
- **Controller Layer**: Handles HTTP request parsing, input extraction, and standard JSON response formatting.
- **Service Layer**: Encapsulates business logic, database queries, and atomic state transitions.
- **Model / Data Access Layer**: Mongoose schemas and data persistence.

```
koya-booking-api/
├── .env                                # Environment variables (contains X-API-Key reference)
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── routes.js                           # Root alias linking to src/routes.js
├── src/
│   ├── app.js                          # Express app configuration & global middleware
│   ├── routes.js                       # Centralized REST routing table
│   ├── server.js                       # Server startup & graceful shutdown
│   ├── config/
│   │   ├── db.js                       # Mongoose connection & lifecycle
│   │   └── env.js                      # Environment configuration & X-API-Key cross-reference
│   ├── modules/
│   │   ├── reset/                      # Reset module
│   │   │   ├── reset.service.js        # Wipe DB & insert batch slots
│   │   │   └── reset.controller.js     # Reset request handler
│   │   ├── slots/                      # Slots domain module
│   │   │   ├── slot.model.js           # Slot schema (status, available, provider, start, end)
│   │   │   ├── slot.service.js         # Slot query & lifecycle methods
│   │   │   └── slot.controller.js      # Slot HTTP handlers
│   │   ├── bookings/                   # Bookings domain module
│   │   │   ├── booking.model.js        # Booking schema (slot_id, name, email, status)
│   │   │   ├── booking.service.js      # Booking business logic (concurrency, cancellation)
│   │   │   └── booking.controller.js   # Booking HTTP handlers (Level 1-4 validations)
│   │   └── idempotency/                # Idempotency domain module (Level 4)
│   │       ├── idempotency.model.js    # Idempotency record schema & TTL
│   │       └── idempotency.service.js  # Deduplication and body hash checks
│   └── middleware/
│       ├── apiKeyAuth.js               # Global X-API-Key authentication middleware
│       ├── rateLimiter.js              # Level 5 per-email rate limiter
│       ├── errorHandler.js             # Standard error formatter {"error": "<message>"}
│       └── notFound.js                 # 404 handler
└── test/
    ├── level1.test.js                  # Integration tests for basic slot/booking & auth
    ├── levels_1_to_5.test.js           # Full specification tests for Levels 1, 2, 3, 4, 5
    └── reset.test.js                   # Tests for /reset & X-API-Key authorization
```

---

## Levels Overview & Rules

### Level 1: Booking Confirmation & Slot State Transition
- Returns `201 Created` with the booking object, `status: "confirmed"`.
- Updates the slot: `status: "booked"`, `available: false`.

### Level 2: Strict Input Validation & Timing Rules
- **400 Bad Request:** If `slot_id`, `name`, or `email` is missing or empty.
- **400 Bad Request:** If the `email` format is invalid.
- **400 Bad Request:** If the slot has already started (`startTime <= Date.now()`).
- **404 Not Found:** If the slot does not exist.
- Trims whitespace from `name` and `email`, and stores `email` in lowercase.

### Level 3: Concurrency Control & Cancellation
- **409 Conflict:** If a slot already has a confirmed booking.
- **Concurrency Guarantee:** Atomic conditional update (`findOneAndUpdate` matching `{ status: 'available', available: true }`) ensures that if multiple requests arrive simultaneously for the same slot, exactly ONE succeeds (201) and all others receive 409.
- **Cancellation:** `DELETE /bookings/:id` or `POST /bookings/:id/cancel` sets booking `status: "cancelled"` and restores slot `status: "available"`, `available: true`.

### Level 4: Idempotency Key Handling
- Supports optional `Idempotency-Key` header.
- **Same Key + Same Body:** Returns the exact same response (same status code, same booking ID) without creating duplicate bookings.
- **Same Key + Different Body:** Returns **`422 Unprocessable Entity`**.

### Level 5: Per-Email Rate Limiting
- Enforces **at most 5 attempts per email per minute** (failed attempts included).
- On the 6th attempt within the minute: returns **`429 Too Many Requests`** with a **`Retry-After: <seconds>`** header in whole seconds.
- Isolated per email; other emails are unaffected.

---

## API Endpoints

| Method | Endpoint | Headers | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/reset` | `X-API-Key` | Wipes existing data, resets rate limiter/idempotency, inserts payload slots |
| `GET` | `/slots` | `X-API-Key` | List available slots (or `?status=all`) |
| `GET` | `/slots/:id` | `X-API-Key` | Look up a slot by ID |
| `POST` | `/slots` | `X-API-Key` | Create an appointment slot |
| `POST` | `/bookings` | `X-API-Key`, `[Idempotency-Key]` | Book an appointment slot |
| `GET` | `/bookings/:id` | `X-API-Key` | Look up a booking by ID |
| `GET` | `/bookings` | `X-API-Key` | List bookings (supports `?email=...`) |
| `DELETE` | `/bookings/:id` | `X-API-Key` | Cancel a booking and re-open the slot |
| `POST` | `/bookings/:id/cancel` | `X-API-Key` | Cancel a booking and re-open the slot |
| `GET` | `/health` | `X-API-Key` | Service health check |
