# 🚗 TripLog — ATO Compliant Travel Logbook for Rideshare Drivers

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql" />
  <img src="https://img.shields.io/badge/Tailwind-4-blue?logo=tailwindcss" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel" />
</p>

> **One-tap trip recording for Australian rideshare drivers.** Start → Drive → Stop. Everything else is automatic. ATO compliant.

---

## 🎯 Features

### Trip Recording (Zero Input While Driving)
| Feature | How It Works |
|---------|-------------|
| **One-Tap Start** | Tap green START → GPS captures location, reverse geocodes to address |
| **One-Tap Stop** | Tap red STOP → GPS captures dropoff, suggests end odometer |
| **Auto Location** | Real-time GPS tracking via OpenStreetMap Nominatim |
| **Live Map** | Leaflet map shows your position, track line, speed |
| **Speed Monitor** | Live speedometer with 50 km/h urban limit alerts |
| **Auto-Stop** | When vehicle stops 3+ seconds, suggests ending trip |

### Odometer Management
- **Never starts at 0** — auto-fills from last trip's end reading
- **Decimal precision** — `45,250.30 km` with +0.1/+0.5/+1/+5/+10 buttons
- **Day continuity** — each trip continues from previous end reading
- **Highest wins** — system always uses the highest recorded reading

### Data Management
- **Manual Entry** — full form for entering trips after the fact
- **Import** — Google Maps Timeline & Waze JSON import
- **Export** — CSV for ATO submission with financial year filtering
- **History** — grouped by date, filterable, with trip details

### ATO Compliance
- 12-week continuous logbook support
- Odometer readings at start/end
- Pickup & dropoff addresses with GPS coordinates
- Business vs personal trip classification
- GPS track as supporting evidence
- Financial year summaries
- CSV export with all required fields

### Community
- Live chat between drivers
- WhatsApp community link
- Location sharing

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 4 |
| **Database** | PostgreSQL 16 |
| **ORM** | Drizzle ORM |
| **Maps** | Leaflet + OpenStreetMap |
| **Geolocation** | Browser Geolocation API + Nominatim |
| **Auth** | HMAC-signed session cookies |
| **Deployment** | Vercel (frontend) + Neon/Supabase (database) |

---

## 🚀 Quick Start

### Option 1: Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/triplog)

1. Click the deploy button
2. Connect your GitHub repo
3. Add environment variables (see below)
4. Deploy — done!

### Option 2: Run Locally

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/triplog.git
cd triplog

# Install dependencies
npm install

# Set up database (using Neon, Supabase, or local PostgreSQL)
cp .env.example .env
# Edit .env with your database URL

# Push schema to database
npx drizzle-kit push

# Seed demo data (optional)
npm run seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔧 Environment Variables

Create a `.env` file:

```env
# Database (required)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Optional
SESSION_SECRET=your-secret-key-here
```

### Getting a Database (Free Options)

| Provider | Free Tier | Link |
|----------|----------|------|
| **Neon** | 0.5 GB | [neon.tech](https://neon.tech) |
| **Supabase** | 500 MB | [supabase.com](https://supabase.com) |
| **Railway** | $5 credit | [railway.app](https://railway.app) |
| **Vercel Postgres** | 0.5 GB | [vercel.com/storage](https://vercel.com/storage) |

---

## 📁 Project Structure

```
triplog/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (authed)/           # Protected pages (require login)
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── trip/           # One-tap trip recording
│   │   │   ├── history/        # Trip history
│   │   │   ├── manual-trip/    # Manual entry form
│   │   │   ├── import/         # Google Maps/Waze import
│   │   │   ├── export/         # ATO export
│   │   │   ├── community/      # Driver community chat
│   │   │   └── settings/       # Account settings
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # Login, register, logout
│   │   │   ├── trips/          # CRUD + import/export
│   │   │   ├── stats/          # Dashboard statistics
│   │   │   ├── daily-odo/      # Daily odometer tracking
│   │   │   ├── last-odo/       # Latest odometer reading
│   │   │   └── community/      # Community messages
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Login/register page
│   │   └── globals.css         # Global styles
│   ├── components/             # Reusable components
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   └── TripMap.tsx         # Leaflet map component
│   ├── lib/                    # Utilities
│   │   ├── auth.ts             # Authentication helpers
│   │   └── format.ts           # Number formatting
│   └── db/                     # Database
│       ├── schema.ts           # Drizzle schema
│       ├── index.ts            # Database connection
│       └── seed.ts             # Demo data seeder
├── public/                     # Static assets
├── README.md                   # This file
├── LICENSE                     # MIT License
├── .env.example                # Environment template
├── drizzle.config.json         # Drizzle config
├── next.config.ts              # Next.js config
├── tailwind.config.ts          # Tailwind config
└── package.json                # Dependencies
```

---

## 📊 Database Schema

### Users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email |
| password_hash | TEXT | Hashed password |
| name | VARCHAR(255) | Full name |
| business_name | VARCHAR(255) | Business name |
| abn | VARCHAR(11) | Australian Business Number |

### Trips
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner reference |
| trip_date | VARCHAR(10) | YYYY-MM-DD |
| start_time | VARCHAR(5) | HH:MM |
| end_time | VARCHAR(5) | HH:MM |
| start_odometer | DECIMAL(10,2) | Start reading (km) |
| end_odometer | DECIMAL(10,2) | End reading (km) |
| distance_km | DECIMAL(10,2) | Calculated distance |
| gps_distance_km | DECIMAL(10,2) | GPS-tracked distance |
| pickup_address | TEXT | Start location |
| pickup_lat/lng | DECIMAL | Start coordinates |
| dropoff_address | TEXT | End location |
| dropoff_lat/lng | DECIMAL | End coordinates |
| is_business_trip | BOOLEAN | ATO flag |
| source | VARCHAR(20) | manual / gps / import |
| gps_track | JSONB | GPS waypoints array |
| max_speed | DECIMAL(6,1) | Max speed (km/h) |
| avg_speed | DECIMAL(6,1) | Avg speed (km/h) |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/me` | Update profile |
| GET | `/api/trips` | List trips (paginated) |
| POST | `/api/trips` | Create trip |
| GET | `/api/trips/[id]` | Get trip details |
| PUT | `/api/trips/[id]` | Update trip |
| DELETE | `/api/trips/[id]` | Delete trip |
| POST | `/api/trips/import` | Import from Maps/Waze |
| GET | `/api/trips/export` | Export CSV/JSON |
| GET | `/api/stats` | Dashboard stats |
| GET | `/api/last-odo` | Latest odometer |
| GET/POST | `/api/daily-odo` | Daily odometer |
| GET/POST | `/api/community` | Community chat |

---

## 🚢 Deployment Guide

### Vercel (Frontend)

1. Push code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repo
4. Add `DATABASE_URL` environment variable
5. Deploy

### Database Setup (Neon — Free)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Add to Vercel environment variables as `DATABASE_URL`
5. Run schema push: `npx drizzle-kit push`

### Production Checklist

- [ ] Set strong `SESSION_SECRET`
- [ ] Enable Vercel Analytics (optional)
- [ ] Set up custom domain (optional)
- [ ] Configure CORS if needed
- [ ] Set up database backups

---

## 🧪 Demo Account

| Field | Value |
|-------|-------|
| Email | `demo@triplogger.com.au` |
| Password | `demo123456` |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 📞 Support

- 📧 Email: support@triplog.app
- 💬 GitHub Issues: [Create an issue](../../issues)
- 📱 WhatsApp: Join via the app's Community page
