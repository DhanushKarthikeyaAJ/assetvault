# 🔐 AssetVault — IT Asset Tracker

A modern, team-shared web app for tracking IT assets — domains, SSL certificates, licenses, subscriptions, API keys, and more. Built with React + Supabase. No login required — just share the URL with your team.

![Stack](https://img.shields.io/badge/React-18-blue?style=flat-square) ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square) ![Vite](https://img.shields.io/badge/Vite-5-purple?style=flat-square) ![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square)

---

## ✨ Features

- **Dashboard** — stats overview, bar/pie charts, upcoming expirations panel
- **Asset Management** — add, edit, delete assets with full details
- **Card & Table views** — sortable, filterable, searchable
- **Calendar view** — see all expiration dates on a monthly calendar
- **Color-coded status** — 🟢 Active · 🟡 Expiring Soon · 🔴 Expired
- **Expiry progress bars** — visual time-elapsed indicator per asset
- **Alerts panel** — bell icon shows all assets expiring within your chosen threshold (7 / 15 / 30 / 60 days)
- **Live real-time sync** — teammates see changes instantly, no refresh needed
- **CSV export** — download all assets as a spreadsheet
- **Dark / Light mode** toggle
- **Fully responsive** — works on desktop and mobile

---

## 🗂️ Asset Fields

| Field | Required | Description |
|---|---|---|
| Name | ✅ | e.g. `acmecorp.com` or `Wildcard SSL` |
| Category | ✅ | Domain, SSL Certificate, License, Subscription, SaaS, API Key, Other |
| Expiration Date | ✅ | Used for all status calculations |
| Purchase Date | — | Used to calculate % time elapsed |
| Vendor / Provider | — | e.g. Namecheap, DigiCert, Adobe |
| Cost (USD/year) | — | Shown in dashboard total |
| Notes | — | Free-text notes |

---

## 🏗️ Project Structure

```
assetvault/
├── index.html
├── package.json
├── vite.config.js
├── .env                  ← your Supabase keys (never commit this)
├── .gitignore
└── src/
    ├── main.jsx          ← React entry point
    ├── supabase.js       ← Supabase client setup
    └── App.jsx           ← entire application (from it-asset-tracker-supabase.jsx)
```

---

## 🚀 Deployment Guide (15 minutes)

### Prerequisites
- A computer with [Node.js](https://nodejs.org) installed (v18+)
- A free [GitHub](https://github.com) account
- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) account

---

### Step 1 — Set Up the Database on Supabase

1. Go to [supabase.com](https://supabase.com) → **Start for free** → sign up
2. Click **New Project** → name it `assetvault` → set a DB password → pick the region closest to you (India → `ap-south-1`) → click **Create Project**
3. Wait about 1 minute for it to provision
4. In the left sidebar, go to **SQL Editor** → click **New query**
5. Paste the following SQL and click **Run ▶**:

```sql
create table assets (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  purchase_date date,
  expiration_date date not null,
  vendor text,
  cost numeric(10,2) default 0,
  notes text,
  created_at timestamptz default now()
);

-- Allow full public access (no login required — team shared app)
alter table assets enable row level security;
create policy "Public access" on assets for all using (true) with check (true);
```

6. Go to **Project Settings → API** in the left sidebar
7. Note down these two values — you'll need them in Step 3:
   - **Project URL** — looks like `https://abcdefghij.supabase.co`
   - **anon public key** — a long string under "Project API keys"

---

### Step 2 — Set Up the Project Files

On your computer, create a folder called `assetvault` and create the following files inside it:

#### `package.json`
```json
{
  "name": "assetvault",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

#### `vite.config.js`
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })
```

#### `index.html`
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AssetVault</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

#### `.gitignore`
```
node_modules
.env
dist
```

#### `.env`
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```
> ⚠️ Replace the values with the ones you copied from Supabase in Step 1. Never commit this file to GitHub — it's in `.gitignore` already.

#### `src/main.jsx`
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

#### `src/supabase.js`
```js
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseKey)
```

#### `src/App.jsx`
Copy the full contents of `it-asset-tracker-supabase.jsx` into this file.

---

### Step 3 — Push to GitHub

```bash
# Run these commands inside your assetvault folder
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/assetvault.git
git push -u origin main
```

> Create the `assetvault` repo on GitHub first at [github.com/new](https://github.com/new) — set it to **Public**, don't initialize with a README.

---

### Step 4 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → sign in with GitHub
2. Click **Add New → Project** → find and select your `assetvault` repo → click **Import**
3. Expand **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |

4. Click **Deploy** — takes about 1 minute
5. Vercel gives you a live URL like `https://assetvault-xyz.vercel.app`
6. **Share this URL with your team** — that's it!

---

## 💻 Running Locally

To run the app on your own machine for testing:

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

> Make sure your `.env` file has the correct Supabase keys before running locally.

---

## 👥 Team Usage

Once deployed:
- Share the Vercel URL with everyone on your team
- Anyone with the link can open the app and add/edit/delete assets
- Changes made by one person appear for everyone in real-time (no page refresh needed)
- Works on desktop and mobile browsers
- Bookmark it for easy access

---

## 🎨 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Pure CSS with CSS variables (no framework needed) |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime subscriptions |
| Hosting | Vercel (free tier) |
| Fonts | JetBrains Mono + Syne (Google Fonts) |

---

## 🔧 Customisation

**Add more categories** — in `App.jsx`, find the `CATEGORIES` array and add your own:
```js
const CATEGORIES = ["Domain", "SSL Certificate", "License", "Subscription", "SaaS", "API Key", "Other", "Your Category"];
```

**Change the warning threshold default** — find `useState(30)` for `warnDays` and change `30` to `7`, `15`, or `60`.

**Change the app name** — search for `AssetVault` in `App.jsx` and `index.html` and replace with your preferred name.

---

## 🛠️ Troubleshooting

**"Failed to fetch" or blank screen**
→ Check your `.env` file has the correct Supabase URL and key. On Vercel, make sure you added both environment variables before deploying.

**Data not saving**
→ Go to your Supabase project → SQL Editor → run the SQL from Step 1 again to make sure the table and policy exist.

**Changes not appearing in real-time**
→ Check that your Supabase project has Realtime enabled. Go to **Database → Replication** in Supabase and make sure the `assets` table is toggled on.

**Vercel deploy failing**
→ Make sure your `package.json` has the correct `build` script (`"build": "vite build"`) and that all files are committed to GitHub.

---

## 📄 License

MIT — free to use, modify, and share.

---
