# Hono + Prisma + React Router + Vite + ShadCN UI on Cloudflare Workers

<!-- dash-content-start -->

A modern full-stack template powered by [Cloudflare Workers](https://workers.cloudflare.com/), using [Hono](https://hono.dev/) for backend APIs, [Prisma](https://www.prisma.io/) for type-safe database access, [React Router](https://reactrouter.com/) for frontend routing, and [shadcn/ui](https://ui.shadcn.com/) for beautiful, accessible components styled with [Tailwind CSS](https://tailwindcss.com/).

Built with the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/) for optimized static asset delivery and seamless local development. React is configured in single-page app (SPA) mode via Workers.

A perfect starting point for building interactive, styled, and edge-deployed SPAs with minimal configuration.

## Features

- ⚡ Full-stack app on Cloudflare Workers
- 🔁 Hono for backend API endpoints
- 🧭 React Router for client-side routing
- 🧩 Prisma for type-safe database access
- 🎨 ShadCN UI with Tailwind CSS for components and styling
- 🧱 File-based route separation
- 🚀 Zero-config Vite build for Workers
- 🛠️ Automatically deploys with Wrangler

<!-- dash-content-end -->

## Tech Stack

- **Frontend**: React + React Router + ShadCN UI

  - SPA architecture powered by React Router
  - Includes accessible, themeable UI from ShadCN
  - Styled with utility-first Tailwind CSS
  - Built and optimized with Vite

- **Backend**: Hono on Cloudflare Workers

  - API routes defined and handled via Hono in `/api/*`
  - Supports REST-like endpoints, CORS, and middleware

- **Database**: Prisma ORM

  - Type-safe database access with auto-generated client
  - Supports SQLite, PostgreSQL, MySQL, and more
  - Prisma schema located in `/prisma/schema.prisma`
  - Migrations managed via Prisma CLI

- **Deployment**: Cloudflare Workers via Wrangler
  - Vite plugin auto-bundles frontend and backend together
  - Deployed worldwide on Cloudflare's edge network

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Prisma

1. Install Prisma CLI and client:
   ```bash
   npm install prisma --save-dev
   npm install @prisma/client
   ```
2. Initialize Prisma:
   ```bash
   npx prisma init
   ```
   This creates a `prisma/` directory with `schema.prisma` and a `.env` file.
3. Edit `prisma/schema.prisma` to define your data models.
4. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```

### 3. Develop and Deploy

- Start local dev server:
  ```bash
  npm run dev
  ```
- Deploy to Cloudflare:
  ```bash
  npx wrangler deploy
  ```

## Common Prisma Commands

- `npx prisma studio` — Visual database browser
- `npx prisma migrate dev` — Run migrations in development
- `npx prisma generate` — Generate Prisma client
- `npx prisma db push` — Push schema changes to the database

## Resources

- 🧩 [Hono on Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers)
- 🧩 [Prisma Documentation](https://www.prisma.io/docs)
- 📦 [Vite Plugin for Cloudflare](https://developers.cloudflare.com/workers/vite-plugin/)
- 🛠 [Wrangler CLI reference](https://developers.cloudflare.com/workers/wrangler/)
- 🎨 [shadcn/ui](https://ui.shadcn.com)
- 💨 [Tailwind CSS Documentation](https://tailwindcss.com/)
- 🔀 [React Router Docs](https://reactrouter.com/)
