# Fine Boy Foods — Retail CRM

An Abuja retail prospecting and CRM platform for Fine Boy Foods. Find, qualify, track, and supply Abuja-based retailers with FBF plantain chips and snack products.

---

## What This Is

Fine Boy Foods is an Abuja-based snack brand producing premium plantain chips. This app is the internal sales tool the team uses to:

- Discover new retailer leads across Abuja using an AI agent
- Score, qualify, and manage those leads through a sales pipeline
- Generate outreach scripts for WhatsApp, phone, email, and in-person visits
- Track every contact, note, and follow-up against each retailer

---

## Stack

- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS** + **@tailwindcss/forms**
- **Supabase** (Postgres + Edge Functions + RLS)
- **Dexie** (IndexedDB for offline-first support)
- **React Router v6**
- **@heroicons/react**

---

## Features

### Retailer Pipeline (`/retailers`)
- Dashboard with live stats — total leads, hot leads, active pipeline, supplied
- Search by name, filter by Abuja area, category, status, and minimum lead score
- Toggle between card view and table view
- Inline status updates directly from the table

### AI Retailer Finder Agent (`/retailers/find`)
- Select an Abuja area, retailer type, product focus, minimum score, and lead count
- Agent returns structured leads with score, pitch, and recommended next step
- Preview results, select which to keep, and save to CRM in one click
- Duplicate detection prevents the same retailer being saved twice
- Uses real-business discovery via Google Places + website signals and optional Claude cross-referencing through the Supabase Edge Function

### Retailer Profile (`/retailers/:id`)
- Full contact details — phone, email, website, WhatsApp link
- Lead score bar with Hot / Good / Maybe / Weak tier label
- Visual pipeline stepper showing progress from Not Contacted → Supplied
- Suggested pitch and recommended next step from the AI agent
- Add and view notes with timestamps
- Outreach history log
- One-click outreach script modal

### Outreach Script Generator
Five ready-to-copy scripts generated per retailer:
- WhatsApp message
- SMS
- Phone call script
- Formal email (with subject line)
- In-person pitch

Tone: professional, Nigerian business-friendly, concise. Brand context is baked in.

### Manual Import (`/retailers/import`)
Add retailers manually with a full form — business name, category, Abuja area, address, contact details, lead score, pitch notes, and source. Duplicate detection runs before saving.

### Lead Scoring
Every retailer is scored 0–100:

| Score | Tier |
|---|---|
| 80–100 | 🔴 Hot Lead |
| 60–79 | 🟢 Good Lead |
| 40–59 | 🟡 Maybe |
| 0–39 | ⚪ Weak Lead |

Score factors: Abuja location, category fit, contact visibility, area footfall, shelf space likelihood, multi-branch presence, and snack/grocery alignment.

### Retailer Categories
Supermarket · Mini-Mart · Provision Store · Pharmacy · Fuel Station Mart · School Store · Campus Store · Hotel · Gym · Café · Restaurant · Distributor · Wholesaler · Other

### Pipeline Statuses
Not Contacted · Contacted · Interested · Sample Delivered · Negotiating · Supplied · Rejected · Do Not Contact

---

## Seed Data

12 sample Abuja retailer leads are pre-loaded so the app is useful immediately:

- Next Cash and Carry (Jahi)
- H-Medix Superstore (Wuse 2)
- Sahad Stores (CBD)
- Ebeano Supermarket (Gwarinpa)
- Jabi Lake Mall Foodcourt
- Kubwa Express Minimart
- Total Energies Mart (Wuse 2)
- Transcorp Hilton Hotel Gift Shop (Maitama)
- University of Abuja Campus Store
- Bodyline Gym (Garki)
- Garki Market Provision Row
- Life Camp Superstore

---

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd Fine-Boy-Foods
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

If you leave the placeholder values, the app runs entirely in-memory using the seed data. No Supabase account needed to explore the UI.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Supabase Setup

### Database

Run the schema in your Supabase project SQL editor:

```bash
# Paste contents of supabase/schema.sql into the Supabase SQL editor and run
```

This creates five tables:

| Table | Purpose |
|---|---|
| `retailers` | Main retailer records |
| `retailer_contacts` | Named contacts per retailer |
| `retailer_notes` | Free-text notes with timestamps |
| `retailer_outreach_logs` | Log of every outreach attempt |
| `retailer_followups` | Scheduled follow-up dates |

RLS is enabled on all tables. Authenticated users get full access by default — tighten policies per team member as needed.

### Live AI Search (Edge Function)

The Retailer Finder Agent is real-data only and requires a deployed Edge Function. It can optionally use Claude for scoring and pitch generation:

**1. Install Supabase CLI**

```bash
npm install -g supabase
supabase login
```

**2. Link your project**

```bash
supabase link --project-ref your-project-ref
```

**3. Set required Google Places key (required)**

```bash
supabase secrets set GOOGLE_MAPS_API_KEY=your-google-maps-key-here
```

**4. Set Anthropic API key (optional but recommended)**

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**5. Deploy the function**

```bash
supabase functions deploy find-retailers
```

Once deployed, the app routes AI search through the Edge Function and returns only real businesses from Google Places (+ website contact signals).

---

## Project Structure

```
src/
├── types/
│   └── retailer.ts          # All TypeScript types, enums, label maps
├── lib/
│   ├── supabase.ts          # Supabase client (graceful no-op if unconfigured)
│   └── db.ts                # Dexie IndexedDB schema for offline support
├── data/
│   └── seedRetailers.ts     # 12 pre-loaded Abuja retailer leads
├── services/
│   └── retailerService.ts   # All CRUD + AI search + duplicate detection
├── utils/
│   └── retailerOutreach.ts  # Outreach script generators (5 channels)
├── components/
│   ├── Layout.tsx            # App shell with responsive sidebar
│   ├── Navigation.tsx        # Sidebar + mobile drawer navigation
│   └── retailers/
│       ├── RetailerCard.tsx  # Card for grid view
│       ├── StatusBadge.tsx   # Coloured status pill
│       ├── ScoreBadge.tsx    # Score pill + score bar
│       └── OutreachModal.tsx # Tabbed outreach script modal
└── pages/
    ├── DashboardPage.tsx
    └── retailers/
        ├── RetailersPage.tsx       # Pipeline list/dashboard
        ├── RetailerFinderPage.tsx  # AI search form + results
        ├── RetailerDetailPage.tsx  # Full retailer profile
        └── RetailerImportPage.tsx  # Manual entry form

supabase/
├── schema.sql                     # Full Postgres schema with RLS
└── functions/
    └── find-retailers/
        └── index.ts               # Deno Edge Function calling Claude API
```

---

## Data Flow

```
User submits search form
        ↓
RetailerFinderPage calls findRetailersWithAI()
        ↓
  ┌─────────────────────────────────┐
  │  Supabase configured?           │
  │  Yes → call Edge Function       │
  │  No  → throw configuration error│
  └─────────────────────────────────┘
        ↓
Results previewed in UI
        ↓
User selects leads to keep
        ↓
saveAgentResults() checks for duplicates
        ↓
New retailers written to Supabase (or in-memory fallback)
        ↓
Sales team updates status, adds notes, logs outreach
```

---

## Offline Support

The app uses Dexie (IndexedDB) as a local cache. When Supabase is configured:

- Reads try Supabase first, fall back to Dexie
- Writes go to Supabase; Dexie is updated in parallel

When Supabase is not configured, everything runs in-memory for the session.

---

## Brand Context

**Fine Boy Foods** is a premium Nigerian snack brand based in Abuja.

- **Products**: Plantain chips
- **Initial flavours**: Sweet Original, Spicy Suya
- **Positioning**: Clean, natural, proudly Nigerian, youth-friendly, retail-ready
- **Target channels**: Supermarkets, minimarts, provision stores, pharmacies, fuel station marts, school and campus stores, hotel gift counters, gyms, cafés, distributors

Target Abuja areas: Wuse 2, Wuse Market, Garki, Gwarinpa, Maitama, Asokoro, Jabi, Utako, Kubwa, Lugbe, Apo, Lokogoma, Katampe, Gudu, Area 11, CBD, Jahi, Life Camp, Dawaki, Galadimawa, Kado, Durumi.

---

## Planned Additions

- [ ] Google Places API integration for live Abuja business search
- [ ] Follow-up reminder calendar view
- [ ] CSV export of retailer pipeline
- [ ] WhatsApp Business API integration for direct sending
- [ ] Multi-user auth with role-based access (admin, sales rep)
- [ ] Google Sheets sync for leadership reporting
- [ ] Retailer contact book (multiple contacts per outlet)

---

## License

Private — Fine Boy Foods internal tool.
