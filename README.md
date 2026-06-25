# FitTrack — Solo Leveling Fitness Tracker

A fitness tracking app with a Solo Leveling-inspired gamification system. Train, level up your hunter stats, complete daily quests, and compete against benchmarks.

Built with [Next.js 16](https://nextjs.org), [Prisma](https://prisma.io), [Radix UI](https://radix-ui.com), and [Tailwind CSS v4](https://tailwindcss.com).

---

## Features

### 🎮 Gamified Stats System
- **8 hunter stats**: Strength (STR), Endurance (END), Agility (AGI), Speed (SPD), Power (PWR), Flexibility (FLX), Vitality (VIT), Discipline (DSC)
- Each stat ranges 0–100, visible on a radar chart
- Hunter Level + Rank (E through S) calculated from average stat value
- Stat history tracks every gain and loss over time

### ⚔ Daily Quests
- AI-generated daily quests target your weakest stats
- Accept quests before midnight or they fail
- Complete quests to earn stat gains; failure applies penalties (3:1 gain/penalty ratio)
- Custom quest creation with manual stat reward assignment
- Quest failure sweep runs automatically on dashboard load and via a cron endpoint

### 🤖 AI Weekly Planning (Groq)
- Generates a 7-day training plan based on recent sessions, goals, and stat weaknesses
- Extracts 1–3 daily quests from the plan
- Powered by Groq's Llama 3.3 70B model

### 📊 Session Tracking
- Log training sessions with date, activity type, duration, RPE (1–10), and notes
- Link sessions to goals and exercises
- Optional stat boosts applied when logging a session
- Training consistency bar chart on the Stats page

### 🎯 Goals
- Create active goals with PRIMARY/SECONDARY priority and target dates
- Countdown display on the dashboard
- Archive completed goals; delete unwanted ones

### 📈 Benchmarks & Fitness Standards
- Track physical benchmarks (push-ups, sprint times, run times, etc.)
- Compare against built-in fitness standards (Beginner → Excellent)
- Benchmark progress chart with standard reference lines

### 📱 Responsive Design
- Desktop nav bar with backdrop blur
- Mobile bottom tab bar with 5-tab navigation
- Page transition animations powered by the View Transitions API
- Loading skeletons with shimmer animation on all pages

### 🎨 Dark Navy Theme
- Full dark mode with a navy-blue color palette
- Subtle radial gradient background
- Custom scrollbar and selection styling
- Reduced motion support

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL + [Prisma ORM](https://prisma.io) |
| **Auth** | [NextAuth v5](https://next-auth.js.org) (Credentials provider, JWT sessions) |
| **UI Library** | [Radix UI](https://radix-ui.com) + [shadcn/ui](https://ui.shadcn.com) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) |
| **Animations** | [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) |
| **Charts** | [Recharts](https://recharts.org) |
| **AI** | [Groq SDK](https://groq.com) (Llama 3.3 70B) |
| **Validation** | [Zod](https://zod.dev) |
| **Testing** | [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) |
| **Icons** | [Lucide React](https://lucide.dev) |

---

## Getting Started

### Prerequisites

- Node.js 20+ (required for Next.js 16)
- PostgreSQL database
- [Groq API key](https://console.groq.com) (for AI features)

### Installation

```bash
# Clone and install
cd fittrack
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and API keys

# Initialize the database
npx prisma migrate dev

# Seed demo data
npm run prisma:seed

# Start the development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). Login with the seeded demo account:

- **Email:** `xavior@example.com`
- **Password:** `password123`

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/fittrack"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# AI (Groq)
GROQ_API_KEY="gsk_your-groq-api-key"

# Cron
CRON_SECRET="your-cron-secret"
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Generate Prisma client + build Next.js |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest tests |
| `npm run prisma:studio` | Open Prisma Studio (DB GUI) |
| `npm run prisma:seed` | Seed demo data |
| `npm run prisma:migrate` | Run database migrations |

---

## Project Structure

```
app/
├── (dashboard)/         # Dashboard layout & pages (authenticated)
│   ├── layout.tsx       # Nav bar, mobile tabs, page transitions
│   ├── page.tsx         # Dashboard (radar, quests, goals, etc.)
│   ├── loading.tsx      # Skeleton loading state
│   ├── goals/
│   ├── quests/
│   ├── sessions/
│   │   └── new/
│   └── stats/
├── api/                 # REST API routes
│   ├── auth/            # Signup + NextAuth handler
│   ├── sessions/        # CRUD sessions
│   ├── quests/          # Generate, accept, complete, log
│   ├── goals/           # CRUD + archive goals
│   ├── benchmarks/      # Track benchmarks
│   ├── stats/           # Stat history
│   ├── ai/              # AI weekly plan generation
│   ├── onboarding/      # Initial stat calibration
│   └── cron/            # Quest failure sweep
├── login/
├── signup/
├── onboarding/
├── layout.tsx           # Root layout (dark mode, fonts)
└── globals.css          # Theme, view transitions, shimmer

components/
├── ui/                  # shadcn/ui primitives
│   ├── button.tsx, card.tsx, badge.tsx
│   ├── input.tsx, textarea.tsx, select.tsx, label.tsx
│   └── skeleton.tsx     # Shimmer loading placeholder
├── dashboard/           # Dashboard widgets
│   ├── radar-chart.tsx, weekly-progress.tsx
│   ├── daily-quests.tsx, ai-suggestion.tsx
│   ├── goal-countdown.tsx, benchmark-chart.tsx
│   ├── consistency-chart.tsx, stat-history-chart.tsx
│   └── activity-mix.tsx
├── sessions/
├── quests/
└── goals/

lib/                     # Business logic
├── auth.ts              # NextAuth config + getCurrentUser
├── prisma.ts            # Singleton Prisma client
├── quest.ts             # AI quest generation
├── quest-sweep.ts       # Auto-fail expired quests
├── onboarding.ts        # Onboarding questions & stat mapping
├── validation.ts        # Zod schemas
└── utils.ts             # cn(), daysUntil()

prisma/
├── schema.prisma        # Database schema
├── seed.ts              # Demo seed data
└── migrations/          # Migration history

test/                    # Test suite
├── setup.ts
├── lib/                 # Unit tests for lib/*
├── api/                 # API route tests
└── components/          # Component tests
```

---

## API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Create account |
| `/api/auth/[...nextauth]` | * | NextAuth handler |
| `/api/sessions` | GET, POST | List / create sessions |
| `/api/sessions/[id]` | PATCH, DELETE | Update / delete session |
| `/api/quests` | POST | Create custom quest |
| `/api/quests/today` | GET | Get today's quests (auto-generates if empty) |
| `/api/quests/generate` | POST | Force-regenerate today's quests |
| `/api/quests/[id]/accept` | POST | Accept a quest |
| `/api/quests/[id]/complete` | POST | Complete a quest (applies stat gains) |
| `/api/quests/log` | GET | Quest history |
| `/api/goals` | GET, POST | List / create goals |
| `/api/goals/[id]` | DELETE | Delete a goal |
| `/api/goals/[id]/archive` | POST | Archive a goal |
| `/api/benchmarks` | GET, POST | Track / list benchmarks |
| `/api/stats/history` | GET | Stat change history |
| `/api/ai/suggest` | POST | Generate weekly plan + quests |
| `/api/onboarding` | POST | Submit onboarding responses |
| `/api/cron/quest-sweep` | GET | Auto-fail expired quests (protected) |

---

## Deployment

This app is optimized for [Vercel](https://vercel.com). The `vercel.json` is pre-configured.

```bash
# Deploy to Vercel
vercel --prod
```

Set the required environment variables in your Vercel project dashboard.

For the cron quest sweep, configure a Vercel Cron Job pointing to `/api/cron/quest-sweep` with the `CRON_SECRET` as a Bearer token.

---

## License

Private — internal use.
