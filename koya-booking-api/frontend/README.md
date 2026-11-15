# Koya Clinic Frontend

A standalone React, Vite, and Tailwind CSS frontend for the Koya Clinic Booking API. The API server remains in the repository root; this app lives entirely in `frontend/`.

## Run locally

1. Start the API from the repository root with `npm run dev`.
2. In `frontend/`, install dependencies with `npm install`.
3. Start the UI with `npm run dev` and open the local URL printed by Vite.

The UI defaults to `http://localhost:5000/api` and the development API key `koya-api-key` from `.env.example`. Use **Connect API** in the header to change either value. The API uses `X-API-Key` on every request.

## Features

- Lists and filters available slots from `GET /slots`.
- Books with `POST /bookings`, including an `Idempotency-Key`.
- Looks up bookings by email using `GET /bookings?email=...&limit=50`.
- Cancels confirmed bookings using `DELETE /bookings/:id`.
- Stores API connection settings in browser local storage.

The UI is built with React components and Tailwind CSS v4 through its Vite plugin. The API must allow browser requests from the frontend origin through CORS.
