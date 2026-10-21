# RideNow

RideNow is a full-stack ride-booking application built with React, Vite, Express, and MongoDB. It includes distinct passenger and driver experiences, authenticated REST APIs, ride lifecycle tracking, and an interactive OpenStreetMap picker.

> **Prototype note:** RideNow is a portfolio/demo application, not a production ride-dispatch service. Address search returns approximate OpenStreetMap-based results, while fare and distance are straight-line estimates rather than road routes. Driver accounts are self-registered without verification. The browser stores its bearer JWT in `localStorage`; this is vulnerable to token theft if a cross-site scripting bug is introduced. For production, consider secure, HttpOnly, SameSite cookies with CSRF protections, and add driver verification, real route pricing, payments, notifications, and operational safeguards before handling real rides.

## Features

- Passenger and driver sign-up, sign-in, and sign-out with role-guarded API routes.
- Password hashing with bcrypt, signed seven-day JWT sessions, request validation, security headers, and rate-limited authentication endpoints.
- Debounced pickup and drop-off address suggestions powered by Photon/OpenStreetMap; selecting an address fills its map coordinates. Map clicks and optional browser geolocation remain available as alternatives.
- Up-front fare estimate calculated from straight-line distance with a 30% route allowance.
- Passenger booking and ride history; drivers can view requests, accept available rides, and advance them through pickup, in-progress, and completed states.
- Ride status refreshes automatically while the dashboard is open.
- Responsive dashboard layouts, form feedback, loading states, and helpful empty states.
- Mongoose models, REST controllers/routes, role middleware, and centralized API error handling.

## Requirements

- Node.js 20 or later and npm.
- MongoDB running locally, or a MongoDB Atlas connection string.

## Local setup

1. Install dependencies from the project root:

   ```bash
   npm install
   ```

2. Create the server environment file:

   ```powershell
   Copy-Item server\.env.example server\.env
   ```

   Set `MONGODB_URI` and replace `JWT_SECRET` with a private random string of at least 32 characters. For example, generate a value locally with:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

3. Start MongoDB (see [MongoDB setup on Windows](#mongodb-setup-on-windows)), then launch the API and web application:

   ```bash
   npm run dev
   ```

   The Vite app runs at <http://localhost:5173> and proxies `/api` requests to the API at <http://localhost:5000>. The API health check is <http://localhost:5000/api/health>.

4. Create a passenger account and a separate driver account in the app to try both workflows.

### MongoDB setup on Windows

**Local Community Server**

1. Download the MongoDB Community Server Windows installer from the [official MongoDB download page](https://www.mongodb.com/try/download/community). In the MSI setup wizard, choose **Complete** and enable **Install MongoD as a Service**. Installing MongoDB Compass is optional.
2. In PowerShell, confirm the service is running:

   ```powershell
   Get-Service MongoDB
   ```

   If it is stopped, start PowerShell as Administrator and run `Start-Service MongoDB`.
3. If you installed MongoDB Shell (`mongosh`), verify the local connection:

   ```powershell
   mongosh "mongodb://127.0.0.1:27017/ridenow" --eval "db.runCommand({ ping: 1 })"
   ```

   A successful response includes `ok: 1`. The local URI in `server/.env.example` uses this default address and database name.

**MongoDB Atlas instead**

1. Create an Atlas cluster and a database user with a strong password.
2. In Atlas **Network Access**, allow only your current development IP address. Do not use a world-open IP rule for a deployed environment.
3. Choose **Connect → Drivers**, copy the Node.js connection URI, replace its password placeholder with the database user's password (URL-encode special characters), and set it as `MONGODB_URI` in `server/.env`.
4. Keep the Atlas URI private. Never place it in a `VITE_` variable or commit it.

Once MongoDB is reachable and `server/.env` is configured, restart `npm run dev`. The API only starts listening after its MongoDB connection succeeds.

## Environment variables

Copy `server/.env.example` to `server/.env`. Do not commit `.env` or use real credentials in the example files.

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | API port; defaults to `5000`. |
| `MONGODB_URI` | Yes | Local MongoDB or Atlas connection string. |
| `JWT_SECRET` | Yes | Private JWT signing secret, at least 32 characters. |
| `CLIENT_ORIGIN` | No | Allowed browser origin(s), comma-separated; defaults to `http://localhost:5173`. |

For a separately hosted frontend, set `VITE_API_URL` at frontend build time to the API base URL ending in `/api` (for example, `https://api.example.com/api`) and set the API's `CLIENT_ORIGIN` to the frontend origin. Never put MongoDB credentials or the JWT secret in a `VITE_` variable.

## Maps and location

The map uses Leaflet with OpenStreetMap's standard tile service. Address suggestions use the public Photon geocoding API and OpenStreetMap data; no API key is needed. Type at least three characters, wait for suggestions, then select a result to fill its matching map coordinates. Map clicks and browser geolocation (with permission, on localhost or HTTPS) are also supported. Search results can be incomplete or approximate and are not road routing.

RideNow estimates distance using the Haversine formula and adds a 30% route allowance, then applies a demo base fare and per-kilometre rate. This is not road routing or a guaranteed price. Photon and OpenStreetMap data are community services: abide by [Photon's usage guidance](https://photon.komoot.io/), provide attribution, and avoid excessive autocomplete traffic. For production traffic, use a hosted geocoder and map tile provider with suitable service guarantees. OpenStreetMap tile usage is subject to its [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). No credentials are currently required by this demo.

Address searches go through the backend endpoint `GET /api/locations/search?q=...`; the server validates the query and proxies Photon so the browser does not need direct cross-origin access to the provider. Search is limited to 120 requests per IP in 15 minutes.

## Commands

Run these from the project root:

| Command | Description |
| --- | --- |
| `npm run dev` | Run the API and Vite development server together. |
| `npm run build` | Create the production frontend bundle in `client/dist`. |
| `npm test` | Run client geocoding tests and backend API/fare tests. |
| `npm start` | Start the API (requires server environment variables and MongoDB). |

## REST API overview

All endpoints are under `/api`.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | API health check. |
| `POST` | `/auth/signup` | Public | Create a passenger or driver account. |
| `POST` | `/auth/login` | Public | Authenticate and issue a JWT. |
| `GET` | `/auth/me` | Signed-in | Return the current account. |
| `POST` | `/rides/estimate` | Public | Estimate fare from two coordinate pairs. |
| `GET` | `/locations/search?q=...` | Public, rate-limited | Search for address suggestions through Photon/OpenStreetMap. |
| `POST` | `/rides` | Passenger | Request a ride. |
| `GET` | `/rides/mine` | Signed-in | List the account's own rides. |
| `GET` | `/rides/driver` | Driver | List open requests and the driver's active rides. |
| `POST` | `/rides/:id/accept` | Driver | Atomically accept an open request. |
| `PATCH` | `/rides/:id/status` | Assigned driver | Advance an accepted ride through its valid statuses. |
| `POST` | `/rides/:id/cancel` | Passenger | Cancel a ride that has not yet been accepted. |

Authenticated requests use `Authorization: Bearer <token>`. API errors return a JSON object with a user-facing `message`.

## Deployment

The root `render.yaml` configures a single Render Node web service. It builds the Vite client and serves `client/dist` from the Express app in production, so the frontend and API share one origin and no production `VITE_API_URL` or cross-origin setup is needed.

1. Push the project to a **private** GitHub/GitLab repository. Do not add `server/.env`, `.env`, or any real credentials; `server/.env` is git-ignored.
2. In Render, choose **New → Blueprint**, connect your repository, and select its branch. Render reads the root `render.yaml` and asks you to provide `MONGODB_URI`. The `JWT_SECRET` is generated by Render and stays in its environment settings.
3. Before creating the service, make sure MongoDB Atlas Network Access allows the Render service's outbound IP addresses. Find the current outbound IP ranges on the Render web service's details page and add the required ranges to the Atlas IP access list. Do not open Atlas to `0.0.0.0/0` for convenience.
4. Apply the Blueprint and wait for the deployment and `/api/health` health check to pass. Open the Render service URL to use the app. Free web services may spin down when idle.
5. Enable HTTPS (Render provides HTTPS for its `onrender.com` domain). Browser geolocation requires a secure context.
6. Configure a production-grade geocoder/map tile provider and real road routing/pricing before presenting estimates as actionable fares. Add driver verification and appropriate privacy, payment, and incident-response controls before real-world operation.

The Vite proxy is for local development only. In production, Express serves the built client and the REST API from the same Render service.
