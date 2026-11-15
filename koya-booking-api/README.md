# Koya Clinic Booking

A clinic appointment booking application with a REST API and a separate web frontend. The API is built with Node.js, Express, and MongoDB. The frontend uses React, Vite, and Tailwind CSS.

## Project structure

```text
koya-booking-api/
├── src/                  # Express API
│   ├── config/            # Environment and MongoDB configuration
│   ├── middleware/        # API key authentication and booking rate limit
│   └── modules/           # Slots, bookings, reset, idempotency
├── frontend/              # React/Vite/Tailwind client
├── test/                  # API integration tests
├── .env.example           # Backend environment template
└── package.json           # Backend scripts and dependencies
```

## Requirements

- Node.js and npm
- MongoDB, running locally or available through a MongoDB connection URI

## Run locally

### 1. Configure and start the API

From the repository root, copy `.env.example` to `.env` and set the values for your environment. In PowerShell:

```powershell
Copy-Item .env.example .env
```

The template uses a local MongoDB database and a development API key. Set `API_KEY` in production. The backend also accepts `X_API_KEY` and `X-API-Key` for compatibility, but values must agree if you define more than one alias. Platform environment variables take precedence over the project `.env` file. The server logs which variable supplied the key without logging the key itself.

Install backend dependencies and start the server:

```sh
npm install
npm run dev
```

The API listens on port `5000` by default. On first startup, it creates sample appointment slots if the slots collection is empty. Set `PORT` in `.env` to use another port.

### 2. Configure and start the frontend

Open a second terminal and run:

```sh
cd frontend
npm install
```

Copy `frontend/.env.example` to `frontend/.env` and set the API URL. The default is `http://localhost:5000/api`.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Start the client:

```sh
npm run dev
```

Open the local URL printed by Vite. The API supports both `/api/...` and root-level routes, and its CORS middleware permits browser requests from the Vite development server.

## Frontend behavior

- Visitors enter an API key before the booking interface becomes accessible. The client checks the key with `GET /health`.
- The key stays in browser memory for that page session. It is not saved in frontend environment variables, local storage, or cookies. Reloading the page asks for the key again.
- After successful connection, the client shows a short welcome transition and locks the connection setting for the rest of the page session.
- The frontend lists and filters available appointment slots, books appointments, looks up a patient's bookings by email, and supports cancellation.
- A booking retry with unchanged details reuses its idempotency key. Editing the slot or patient details starts a new booking attempt with a new key.
- `VITE_API_BASE_URL` configures the API address. Do not put a private API key in a `VITE_*` variable; Vite bundles those values into browser code.

The visitor-provided API key is sent by the browser with API requests. This connection screen is not a substitute for user accounts or a server-side proxy when protecting production data. The backend currently uses one shared API key for all clients.

## API authentication and limits

All routes require the `X-API-Key` header, including `/health`:

```http
X-API-Key: YOUR_API_KEY
```

There are two separate limits:

- **API key attempts:** five missing or invalid keys per client IP in a rolling 15-minute window. The next failed attempt returns `429 Too Many Requests` and a `Retry-After` header. A valid key clears the IP's failed-attempt count. This in-memory counter resets when the API process restarts.
- **Booking attempts:** at most five booking attempts per email in one minute. Failed booking attempts count too. The sixth attempt returns `429` with `Retry-After`.

The API uses Express `req.ip` to identify the client. If deployed behind a reverse proxy, configure Express `trust proxy` for the known proxy so rate limits use visitor IPs. Avoid trusting arbitrary forwarded headers.

## API routes

Routes are available with or without the `/api` prefix. For example, `GET /slots` and `GET /api/slots` are equivalent.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | API health and uptime |
| `GET` | `/slots` | List available slots by default; supports `?status=all` and `?provider=...` |
| `GET` | `/slots/:id` | Look up a slot |
| `POST` | `/slots` | Create a slot |
| `POST` | `/bookings` | Book an available slot; optional `Idempotency-Key` header |
| `GET` | `/bookings?email=...` | List bookings for an email; supports `limit` (1–50) and `cursor` |
| `GET` | `/bookings/:id` | Look up a booking |
| `DELETE` | `/bookings/:id` | Cancel a booking and reopen its slot |
| `POST` | `/bookings/:id/cancel` | Alternative cancellation route |
| `POST` | `/reset` | Delete all bookings and slots, then insert supplied slots |

### Book an appointment

Send the slot ID, patient name, and email. Slot start and end values are ISO 8601 date-time strings when creating slots.

```sh
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Idempotency-Key: a-unique-request-id" \
  -d '{"slot_id":"SLOT_ID","name":"Jane Doe","email":"jane@example.com"}'
```

A successful booking returns `201 Created` with a confirmed booking. The slot is then marked unavailable. Only one confirmed booking can hold a slot at a time; a competing request receives `409 Conflict`. Repeating the same request with the same idempotency key returns the original response. Reusing that key with a different body returns `422`.

### List bookings

Email is required. The response contains a `bookings` array and a `next_cursor` value for pagination. Each booking includes its scheduled slot start, end, and provider when the slot is available in the database.

```sh
curl "http://localhost:5000/api/bookings?email=jane%40example.com&limit=10" \
  -H "X-API-Key: YOUR_API_KEY"
```

### Create a slot

```sh
curl -X POST http://localhost:5000/api/slots \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"provider":"Dr. Sarah Connor","start":"2030-05-10T09:00:00.000Z","end":"2030-05-10T09:45:00.000Z"}'
```

### Reset data

`POST /reset` is destructive: it deletes every booking and slot before inserting the provided `slots` array. Use it only when resetting a development database.

```json
{
  "slots": [
    {
      "provider": "Dr. Sarah Connor",
      "start": "2030-05-10T09:00:00.000Z",
      "end": "2030-05-10T09:45:00.000Z"
    }
  ]
}
```

## Tests

Run the backend integration tests with:

```sh
npm test
```

## Troubleshooting

- **401 from the API:** check the backend key in `.env` and enter the same value in the frontend connection screen.
- **429 while entering a key:** wait for the number of seconds in `Retry-After` before trying again.
- **No available slots:** `GET /slots` returns only available slots by default. Check that future slots exist, or use `GET /slots?status=all` to inspect all slot states.
- **Frontend cannot reach the API:** check `VITE_API_BASE_URL`, restart Vite after changing `.env`, and make sure the backend is running.
