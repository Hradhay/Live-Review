# Live Review

A real-time reviews app. Create, edit, delete, search and sort reviews, and every open tab updates instantly through WebSockets.

**Frontend:** React, Vite, React Router, Socket.IO client, native CSS
**Backend:** Node.js, Express, MongoDB, Mongoose, Socket.IO

## Project structure

```
Live-Review/
├── backend/
│   ├── middleware/          errorHandler.js, validateObjectId.js
│   ├── models/              Review.js
│   ├── routes/              reviewRoutes.js
│   ├── tests/               backend unit tests
│   ├── .env.example
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/      ReviewTable, ReviewForm, Snackbar (+ tests)
│   │   ├── context/         ReviewsProvider (socket events, highlights, undo)
│   │   ├── hooks/           useReviews.js
│   │   ├── pages/           ReviewsPage, NewReviewPage, EditReviewPage
│   │   ├── services/        api.js (fetch), socket.js
│   │   ├── utils/           reviewList.js (search and sort)
│   │   ├── App.jsx
│   │   └── index.css
│   └── .env.example
├── AI_USAGE_LOG.md
└── README.md
```

## Features

- Reviews table with create, edit and delete, updated live across tabs
- Row highlighting for 3 seconds: new = green, edited = blue, deleted = red
- Delete snackbar (5 seconds) with Undo, which restores the review in MongoDB
- Sort by title or date-time, ascending or descending
- Search by title or content
- Unit tests for the backend and frontend

## Prerequisites

- Node.js 20 or newer
- MongoDB running locally on port 27017

## Clone

```bash
git clone https://github.com/Hradhay/Live-Review.git
cd Live-Review
```

## Run the backend

Runs at **http://localhost:5000**

```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

You should see `MongoDB connected` and `Server running on http://localhost:5000`.
Quick check: open http://localhost:5000/api/health

`backend/.env`

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | API port |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/live_reviews` | Database connection |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed frontend origin (CORS and Socket.IO) |

### API

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/reviews` | All reviews, latest first |
| GET | `/api/reviews/:id` | One review |
| POST | `/api/reviews` | Create |
| PUT | `/api/reviews/:id` | Update |
| DELETE | `/api/reviews/:id` | Delete |
| POST | `/api/reviews/restore` | Undo a delete (keeps original id and date-time) |

Socket events: `review:created`, `review:updated`, `review:deleted`.

### If the database is not connecting

- **`Failed to start server` or `ECONNREFUSED`:** MongoDB is not running. Start the MongoDB service, or open MongoDB Compass and connect to `mongodb://127.0.0.1:27017`.
- **Using MongoDB Atlas or a different port:** set `MONGO_URI` in `backend/.env` and restart.
- **`.env` missing:** run `cp .env.example .env` inside `backend/`.
- **Port 5000 already in use:** change `PORT` in `backend/.env` and set the same port in `frontend/.env`.

## Run the frontend

Runs at **http://localhost:5173** (talks to the backend on port 5000)

Open a second terminal:

```bash
cd frontend
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

`frontend/.env`

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:5000` | Backend URL |

Restart `npm run dev` after changing `.env`.

### Routes

| Path | Page |
| --- | --- |
| `/` | Reviews table |
| `/new` | New review form |
| `/:id` | Edit review |

## Run the tests

```bash
cd backend && npm test      # Node test runner, no database needed
cd frontend && npm test     # Vitest + Testing Library
```