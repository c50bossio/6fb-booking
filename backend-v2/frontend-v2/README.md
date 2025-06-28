# Frontend v2 - Minimal Setup

A minimal Next.js 14 frontend with TypeScript and Tailwind CSS.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your backend URL (default: http://localhost:8000)

4. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Structure

- `/app` - Next.js 14 app directory
  - `layout.tsx` - Minimal root layout
  - `page.tsx` - Simple landing page
  - `login/page.tsx` - Basic login form
  - `dashboard/page.tsx` - Protected dashboard
- `/lib/api.ts` - Simple fetch wrapper for API calls
- No complex state management - just React state
- No provider hell - clean and simple