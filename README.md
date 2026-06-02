# EstimatorPro

AI-powered construction estimating for licensed contractors.

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ANTHROPIC_API_KEY=
```

- **VITE_SUPABASE_URL** — your Supabase project URL (Settings → API)
- **VITE_SUPABASE_ANON_KEY** — your Supabase `anon` public key (Settings → API)
- **VITE_ANTHROPIC_API_KEY** — your Anthropic API key (console.anthropic.com)

## Database Setup

Run `src/lib/migrations.sql` in the Supabase SQL Editor to create the `profiles`, `projects`, and `estimates` tables with RLS policies.

## Development

```
npm install
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo in Vercel
3. Add the three environment variables above in Vercel → Settings → Environment Variables
4. Deploy
