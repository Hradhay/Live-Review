# AI Usage Log

I used three AI tools on this project, in this order.

## 1. ChatGPT: understanding the requirements

I used ChatGPT first to understand the assignment requirements: what the app has to do, the Must Have and Nice to Have parts, and how the frontend, backend and WebSocket pieces fit together.

## 2. Gemini: project setup and file structure

I used Gemini to set up the project instead of creating everything by hand. I gave it the full folder and file structure I wanted and asked it for terminal-friendly, multi-line commands so I could create the folders, files and initial setup quickly.

## 3. ChatGPT and Claude: building the project

I used ChatGPT to generate a set of prompts, and then used those prompts with Claude (Anthropic) to build the project properly.

### What I built with Claude

- **Backend connection:** I built the backend (Express server, MongoDB/Mongoose connection, REST API, validation, error handling and Socket.IO events) with Claude's help.
- **Frontend (mandatory part):** Claude helped write the React pages, table, form, routing, fetch service and socket handling.
- **Nice-to-have section:** I completed it with Claude's help: color highlighting, delete snackbar with Undo (including a backend restore endpoint), sorting and search.
- **Unit testing:** I set up and wrote the backend and frontend unit tests with Claude's help.

## How the AI work was checked

- Backend tests (`npm test` in `backend/`) and frontend tests (`npm test` in `frontend/`) pass.
- Frontend lint and build pass.
- Claude tested without a real MongoDB or browser, so I ran the app myself against local MongoDB and checked these in two browser tabs: create, edit, delete, live updates, Undo, search and sorting.