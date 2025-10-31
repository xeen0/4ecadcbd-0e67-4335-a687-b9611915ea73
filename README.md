# Carbon & Diesel Savings Dashboard

- **Purpose** Build an interactive dashboard that visualizes diesel and carbon savings per device using historical CSV data served by a lightweight API.
- **Repo Layout**
  - `backend/` Express server that exposes device metadata and savings metrics.
  - `ui/` Vue 3 + Vite frontend with Tailwind styling and ECharts visualizations.
  - `README.md` This guide.

## Prerequisites
- Node.js 18+ (recommended) and npm.
- Terminal windows for running the backend and frontend concurrently.

## Backend Setup (`backend/`)
- `npm install` install dependencies.
- `npm start` launch the API at `http://localhost:3000`.
- Endpoints:
  - `GET /api/devices` returns device id, name, timezone.
  - `GET /api/savings?device_id=x&start_date=ISO&end_date=ISO` returns carbon/diesel savings snapshots.

## Frontend Setup (`ui/`)
- `npm install` install dependencies.
- Configure environment variables (see below).
- `npm run dev` start the Vite dev server (defaults to `http://localhost:5173`).
- The dashboard lets users pick devices, adjust time windows, and export chart data as PNG or CSV.

## Development Workflow
- Start the backend server first to ensure the frontend can fetch data.
- Run `npm run dev` in `ui/` with the device picker to load device metadata and savings.
- Use browser devtools/network tab to verify API calls if data looks incorrect.

