# Quickstart: Climate Agent UI/UX Redesign & N8N

## Prerequisites

1. Node.js (v20+)
2. Supabase CLI & Local Instance
3. N8N Local Instance (or Desktop app)
4. Environment variables: `N8N_WEBHOOK_SECRET`

## Setup Steps

### 1. Database Migrations
We need to generate and apply the migrations defined in `data-model.md`.
```bash
npx supabase migration new add_redesign_schema_and_n8n_tables
# Copy SQL into the new migration file
npx supabase db push
```

### 2. Next.js App
Install the new dependencies and run the local development server.
```bash
npm install @supabase/ssr recharts
npm run dev
```

### 3. Testing Local N8N Webhooks
Since N8N will send REST calls to `http://localhost:3000/api/n8n/webhook`, ensure your local N8N instance can reach your Next.js server. If N8N is running in Docker, you might need to use `host.docker.internal` instead of `localhost`.

To test the endpoint manually:
```bash
curl -X POST http://localhost:3000/api/n8n/webhook \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"event":"recommendations_generated", "summary": {"total_classes": 1}}'
```

### 4. Seeding Data for Testing
For the new gamified student views to work, we need `n >= 3` responses. Ensure you seed your local database with at least 3 mock inputs per class. 
```bash
npx supabase db execute --file supabase/seed.sql
```
