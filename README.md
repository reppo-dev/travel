<div align="center">

# 🌍 Wanderly — Editorial Travel Workspace

### *An editorial, high-precision travel planning workspace with live meteorological intelligence, interactive spatial maps, digital credential vaults, and automated expense splitting.*

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Go](https://img.shields.io/badge/Go-1.24+-00ADD8?style=for-the-badge&logo=go)](https://golang.org/)
[![Fiber](https://img.shields.io/badge/Fiber-v2-00ACD7?style=for-the-badge&logo=gofiber)](https://gofiber.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Turbopack](https://img.shields.io/badge/Turbopack-Fast_Build-blueviolet?style=for-the-badge)](https://turbo.build/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](#license)

[Features](#-key-features) • [Screenshots](#-visual-walkthrough) • [Architecture](#-system-architecture) • [Getting Started](#-getting-started) • [API Reference](#-api-endpoints) • [Shortcuts](#-power-user-shortcuts)

<br/>

<img src="./screenshots/02_dashboard.png" alt="Wanderly Executive Dashboard" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);"/>

</div>

---

## 📖 Overview

**Wanderly** is a state-of-the-art editorial travel workspace designed for conscious travelers, expedition leaders, and digital nomads. Rather than generic todo lists, Wanderly provides:

- **Executive Travel Intelligence**: Realtime JMA & Open-Meteo precipitation tracking, departure countdowns, and readiness metrics.
- **Dynamic Chronology & Weather Swap**: 1-click itinerary adjustment to substitute outdoor temple walks with indoor cultural museums during rain advisories.
- **Shared Expense Treasury**: 50/50 balance settlement (Settle with Maya), currency conversion, and Computer Vision **Receipt OCR**.
- **Encrypted Document Vault**: Zero-knowledge credential storage with Apple/Google Wallet boarding passes, QR verification, and full offline caching.
- **Smart Luggage Engineering**: Cabin vs checked baggage weight calculators and weather-triggered packing rules.

---

## 📸 Visual Walkthrough

### 1. Executive Dashboard & Telemetry
Central command center displaying active expedition cards, weather radar widgets, pre-trip critical readiness ratios, and instant quick-logging modals.

<div align="center">
  <img src="./screenshots/02_dashboard.png" alt="Executive Dashboard" width="95%" style="border-radius: 10px; border: 1px solid #e8dfd8;"/>
</div>

---

### 2. Multi-Day Expedition Workspace & Split Map
Timeline, Map, and Kanban views with interactive day carousels, time-slot scheduling (Morning, Afternoon, Evening), and Leaflet satellite cartography.

<div align="center">
  <img src="./screenshots/03_trip_workspace.png" alt="Trip Workspace" width="95%" style="border-radius: 10px; border: 1px solid #e8dfd8;"/>
</div>

---

### 3. Chronology Calendar & 1-Click Weather Swap
Multi-trip synchronized calendar supporting Month, Week, Agenda, and Timeline views. Detects rain alerts and enables 1-click swapping of outdoor activities with indoor exhibitions.

<div align="center">
  <img src="./screenshots/04_calendar_timeline.png" alt="Travel Calendar" width="95%" style="border-radius: 10px; border: 1px solid #e8dfd8;"/>
</div>

---

### 4. Financial Treasury, Split & Receipt OCR
Track spending across categories, download CSV spreadsheets, settle shared partner balances (Maya Lin $412.50), and scan Japanese receipts with instant data extraction.

<div align="center">
  <img src="./screenshots/05_expenses_treasury.png" alt="Expenses & Split" width="95%" style="border-radius: 10px; border: 1px solid #e8dfd8;"/>
</div>

---

### 5. Encrypted Travel Credentials & Pass Vault
Secure storage for flight e-tickets, hotel confirmations, transit passes, and visas with high-contrast boarding barcodes, scannable QR passes, and offline airplane mode support.

<div align="center">
  <img src="./screenshots/06_documents_vault.png" alt="Document Vault" width="95%" style="border-radius: 10px; border: 1px solid #e8dfd8;"/>
</div>

---

### 6. Smart Packing & Luggage Weight Estimator
Weather-synchronized packing checklists with automated gear suggestions (rain shells, power adapters), airline weight allowances, and print luggage tag generation.

<div align="center">
  <img src="./screenshots/07_smart_packing.png" alt="Smart Packing" width="95%" style="border-radius: 10px; border: 1px solid #e8dfd8;"/>
</div>

---

### 7. Curated Places & Spatial Map Discovery
Curated establishments categorized by Coffee, Dining, Architecture, and Culture with custom field notes, star bookmarks, and 1-click Google Maps navigation.

<div align="center">
  <img src="./screenshots/08_places_curation.png" alt="Saved Places" width="95%" style="border-radius: 10px; border: 1px solid #e8dfd8;"/>
</div>

---

## 🏛️ System Architecture

```mermaid
graph TD
    Client["Next.js 16 Frontend (React 19 + Turbopack)"]
    API["Go Fiber REST Backend (:8080)"]
    DB[(PostgreSQL Database)]
    Weather["Open-Meteo Global Weather API"]
    LocalCache["Browser LocalStorage (Offline Vault & PWA)"]

    Client -->|Axios + JWT Mutex| API
    Client -->|Direct Weather & Geocoding| Weather
    Client <-->|Offline Fallback Sync| LocalCache
    API -->|sqlc Generated Types| DB
```

### Tech Stack Breakdown

| Layer | Technologies | Highlights |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 | Turbopack compilation, custom Warm Editorial design system (`#9d3d26`, `#2a2421`, `#fdfaf7`), PWA manifest, offline hooks |
| **Backend** | Go 1.24+, Fiber v2, sqlc | Idiomatic clean architecture, sub-millisecond route latency, JWT authentication with mutex refresh |
| **Database** | PostgreSQL 16 | Relational schema with foreign keys, cascading deletes, indexed trip days & activities |
| **Cartography & Weather** | Leaflet, Open-Meteo, CartoDB | Live satellite tiles, geocoding search, and precipitation radar data without proprietary API keys |

---

## ⚡ Getting Started

### Prerequisites
- **Node.js** (v18.17+ or v20+) and **pnpm** (`npm install -g pnpm`)
- **Go** (v1.22+ or v1.24+)
- **PostgreSQL** (v14+) running locally on port `5432`

---

### 1. Database Setup

Create the PostgreSQL database and run the migrations:

```bash
# In PostgreSQL CLI or psql
CREATE DATABASE travel;
```

Apply migrations (located in `backend/migrations`):
```bash
# Using migrate tool or psql
psql -U postgres -d travel -f backend/migrations/000001_init_schema.up.sql
```

---

### 2. Run the Backend API

```bash
cd backend

# Copy or verify environment settings
# .env contains: PORT=8080, DATABASE_URL=postgres://postgres:13802002@localhost:5432/travel?sslmode=disable

# Start the Fiber server
go run ./cmd/server
```

*Server starts on `http://localhost:8080`. Demo user (`alex.chen@craft.co` / `13802002`) and Tokyo 2027 expedition are automatically seeded on first launch.*

---

### 3. Run the Frontend Workspace

```bash
cd frontend

# Install dependencies
pnpm install

# Start Turbopack development server
pnpm dev
```

*Open **[http://localhost:3000](http://localhost:3000)** in your browser.*

---

## ⌨️ Power-User Shortcuts

Wanderly is engineered with desktop keyboard shortcuts for maximum speed:

| Shortcut | Description | Location |
| :---: | :--- | :--- |
| <kbd>⌘</kbd> + <kbd>K</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> | Global Command Palette & Fuzzy Search | Anywhere |
| <kbd>E</kbd> | Open Instant Log Expense Modal | `/expenses` |
| <kbd>N</kbd> | Open New Itinerary Activity Modal | `/trips/[id]` & `/itinerary` |
| <kbd>C</kbd> | Open New Event Modal | `/calendar` |
| <kbd>⌘</kbd> + <kbd>P</kbd> / <kbd>Ctrl</kbd> + <kbd>P</kbd> | Open Add Packing Gear Modal | `/packing` |
| <kbd>⌘</kbd> + <kbd>N</kbd> / <kbd>Ctrl</kbd> + <kbd>N</kbd> | Open Add Saved Place Modal | `/places` |
| <kbd>⌘</kbd> + <kbd>U</kbd> / <kbd>Ctrl</kbd> + <kbd>U</kbd> | Open Upload Document Vault Modal | `/documents` |
| <kbd>⌘</kbd> + <kbd>S</kbd> / <kbd>Ctrl</kbd> + <kbd>S</kbd> | Save Preferences & Telemetry | `/settings` |
| <kbd>Esc</kbd> | Dismiss any open modal or search drawer | Anywhere |

---

## 🔌 API Endpoints

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <jwt_token>`.

### Authentication
- `POST /api/auth/register` — Register new traveler
- `POST /api/auth/login` — Authenticate and receive Access + Refresh tokens
- `POST /api/auth/refresh` — Single-flight token rotation
- `GET /api/auth/me` — Retrieve active traveler profile

### Expeditions & Itineraries
- `GET /api/trips` — List traveler expeditions
- `POST /api/trips` — Create new expedition
- `GET /api/trips/:id` — Get full expedition details
- `PUT /api/trips/:id` — Update expedition metadata
- `DELETE /api/trips/:id` — Delete expedition
- `GET /api/trips/:id/itinerary` — List days & scheduled activities
- `POST /api/trips/:id/activities` — Add activity to a specific day
- `DELETE /api/trips/:id/activities/:activityId` — Remove activity

### Checklists, Packing, Treasury & Vault
- `GET /api/trips/:id/todos` / `POST` / `PUT .../toggle` — Date-specific checklist tasks
- `GET /api/trips/:id/packing` / `POST` / `PUT .../toggle` — Luggage gear items
- `GET /api/trips/:id/expenses` / `POST` / `DELETE` — Transaction ledger & category breakdowns
- `GET /api/trips/:id/places` / `POST` / `PUT .../toggle` — Curated spots
- `GET /api/trips/:id/documents` / `POST` / `DELETE` — Vault credentials & e-tickets

### Realtime Weather & Geospatial
- `GET /api/weather?lat=35.6762&lon=139.6503` — Live Open-Meteo weather & 7-day forecast
- `GET /api/locations/search?q=Tokyo` — Open-Meteo geocoding search
- `POST /api/routes` — Coordinate distance and transit time calculations

---

## 📂 Repository Structure

```
travel/
├── backend/
│   ├── cmd/server/            # Go Fiber entry point & demo seeding
│   ├── internal/
│   │   ├── auth/              # JWT token generation & Argon2 hashing
│   │   ├── config/            # Environment variable loading
│   │   ├── db/                # sqlc generated PostgreSQL queries & models
│   │   ├── handlers/          # REST API route controllers
│   │   └── middleware/        # JWT auth protection middleware
│   ├── migrations/            # SQL migration up/down scripts
│   └── queries/               # Raw SQL queries compiled by sqlc
├── frontend/
│   ├── app/                   # Next.js 16 App Router pages
│   │   ├── calendar/          # Synchronized calendar & weather swap
│   │   ├── dashboard/         # Executive overview & telemetry
│   │   ├── documents/         # Encrypted credential vault
│   │   ├── expenses/          # Treasury, Settle with Maya & OCR
│   │   ├── itinerary/         # Trip day-by-day scheduler
│   │   ├── packing/           # Smart luggage checklists & weights
│   │   ├── places/            # Curated spots & spatial maps
│   │   ├── settings/          # Profiles, base currency & sessions
│   │   └── trips/             # Expeditions index & [id] workspace
│   ├── components/            # Reusable UI cards, pickers, modals & maps
│   ├── context/               # AuthContext & session state
│   ├── hooks/                 # useOnlineStatus and responsive hooks
│   └── lib/                   # API client, JWT mutex, and type definitions
├── screenshots/               # High-resolution Retina README screenshots
└── README.md                  # Global documentation
```

---

## 🧪 Testing

```bash
# Run backend test suite
cd backend
go test ./...

# Run frontend Jest unit & component tests
cd frontend
pnpm test

# Verify production Next.js build
pnpm build
```

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
  <sub>Crafted with precision for mindful exploration. © 2026 Wanderly.</sub>
</div>
