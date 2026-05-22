# PageSnap — Claude Code Project Guide

## What this is
PageSnap is a URL-to-PDF SaaS. Users paste a URL, get a clean PDF download + a shareable link.
Stack: React 18 + Vite (frontend), Node.js + Express (backend), MySQL 8.0 (database), Playwright (PDF engine).

## Project structure
```
pagesnap/
├── backend/          Node.js Express API
├── frontend/         React 18 + Vite SPA
├── docker-compose.yml
└── CLAUDE.md         (this file)
```

## Commands
- `cd backend && npm run dev`   — start API on :3001 (nodemon)
- `cd frontend && npm run dev`  — start React on :5173 (Vite)
- `docker compose up -d`        — start MySQL + Redis
- `cd backend && npm run migrate` — run DB migrations
- `cd backend && npm run seed`    — seed test data

## Coding conventions
- Backend: async/await everywhere, no callbacks
- Error handling: throw AppError(message, statusCode) — middleware catches it
- All SQL via parameterised queries using mysql2 — never string concatenation
- React: functional components + hooks only, no class components
- Imports: named imports preferred over default where possible

## Key decisions
- Playwright singleton browser (not one browser per request)
- MySQL connection pool (max 10 connections)
- JWT access token 15min TTL, refresh token 7 days in HttpOnly cookie
- PDFs stored locally in backend/storage/ for MVP (swap to R2 before launch)
- Share IDs are 8-char nanoid slugs

## Security non-negotiables
- ALWAYS validate URLs against private IP ranges before passing to Playwright (see urlValidator.js)
- NEVER log full URLs — hash them
- NEVER use string concatenation in SQL queries
