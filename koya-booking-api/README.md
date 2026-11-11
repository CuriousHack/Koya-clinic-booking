# Koya Clinic Booking API

A modular monolith RESTful booking API built with Node.js, Express, and MongoDB.

## Architecture

This project follows a **modular monolith** architecture with clean separation of concerns:
- **Global Authentication Middleware (`apiKeyAuth.js`)**: Validates the `X-API-Key` header on every request against `.env`.
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
│   │   │   ├── slot.model.js           # Slot schema (supports id, provider, start, end)
│   │   │   ├── slot.service.js         # Slot query & lifecycle methods
│   │   │   └── slot.controller.js      # Slot HTTP handlers
│   │   └── bookings/                   # Bookings domain module
│   │       ├── booking.model.js        # Booking schema
│   │       ├── booking.service.js      # Booking business logic
│   │       └── booking.controller.js   # Booking HTTP handlers
│   └── middleware/
│       ├── apiKeyAuth.js               # Global X-API-Key authentication middleware
│       ├── errorHandler.js             # Standard error formatter {"error": "<message>"}
│       └── notFound.js                 # 404 handler
└── test/
    ├── level1.test.js                  # Integration tests for Level 1 + Global Auth
    └── reset.test.js                   # Tests for /reset & X-API-Key authorization
```

---

## Global Authentication (`X-API-Key`)

Every request across all endpoints must provide the `X-API-Key` header.

### Configuration in `.env`:
```env
X-API-Key=koya-api-key
```

### Authorization Behavior:
- **Missing Header:** Responds with `401 Unauthorized` and `{"error": "Missing X-API-Key header"}`.
- **Invalid Header:** Responds with `401 Unauthorized` and `{"error": "Invalid X-API-Key header"}`.
- **Valid Header:** Request proceeds to the target route handler.

---

## Endpoints

| Method | Endpoint | Required Header | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/reset` | `X-API-Key` | Wipes existing bookings/slots and inserts payload slots |
| `GET` | `/slots` | `X-API-Key` | List available appointment slots (or `?status=all`) |
| `GET` | `/slots/:id` | `X-API-Key` | Look up a slot by ID |
| `POST` | `/slots` | `X-API-Key` | Create a slot |
| `POST` | `/bookings` | `X-API-Key` | Book an appointment slot |
| `GET` | `/bookings/:id` | `X-API-Key` | Look up a booking by ID |
| `GET` | `/bookings` | `X-API-Key` | List bookings (supports `?patientEmail=...`) |
| `GET` | `/health` | `X-API-Key` | Service health check |
