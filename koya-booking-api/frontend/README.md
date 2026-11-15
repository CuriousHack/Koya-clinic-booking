# Koya Clinic Frontend

A standalone React, Vite, and Tailwind CSS frontend for the Koya Clinic Booking API. The API server remains in the repository root; this app lives entirely in `frontend/`.

## Run locally

1. Start the API from the repository root with `npm run dev`.
2. In `frontend/`, install dependencies with `npm install`.
3. Start the UI with `npm run dev` and open the local URL printed by Vite.

Copy `.env.example` to `.env` and configure `VITE_API_BASE_URL`. Vite embeds this URL at build time, so production builds must be created with the production API URL. Visitors enter their API key in the connection screen; the client validates it against `GET /health` and holds it only in memory for that page session. Restart Vite after changing the environment variable.

**Security:** Visitor-entered keys are not written to local storage, cookies, or frontend environment variables. They remain in page memory and are cleared when the page is closed or reloaded. The key still passes through the visitor's browser to the API; for production access control, use individual user authentication or a server-side proxy rather than sharing a single API key.

## Features

- Lists and filters available slots from `GET /slots`.
- Books with `POST /bookings`, including an `Idempotency-Key`.
- Looks up bookings by email using `GET /bookings?email=...&limit=50`.
- Cancels confirmed bookings using `DELETE /bookings/:id`.
- Requires a valid API key before the booking interface is accessible.

The UI is built with React components and Tailwind CSS v4 through its Vite plugin. The API must allow browser requests from the frontend origin through CORS.
