# Saloo — Premium Barber Booking Platform v1

Saloo is a full-stack marketplace for barbers and customers, featuring a Next.js web application, an Expo mobile app, and a robust Supabase backend with Edge Functions.

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** >= 20
- **pnpm** >= 9.x (`npm install -g pnpm`)
- **Supabase CLI** (`npm install -g supabase`)

### 2. Installation
Clone the repository and install dependencies from the root:
```bash
git clone <your-repo-url>
cd Saloo
pnpm install
```

### 3. Environment Setup
Copy the example environment file and fill in your Supabase credentials:
```bash
cp .env.example .env
```
Ensure you have the following keys in your `.env`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Database Setup
1. Start Supabase locally or link to your project:
   ```bash
   npx supabase link --project-ref your-project-ref
   ```
2. Apply migrations:
   ```bash
   npx supabase db push
   ```

### 5. Running the Apps
From the project root, you can run the applications using Turbo:

- **Web App**: `cd apps && pnpm dev` (Runs at http://localhost:3000)
- **All Services**: `pnpm dev`

---

## 🛠 Developer Tools

### Authentication Bypass (Testing Only)
If you want to test the UI/UX without logging in or being redirected by role-based access control, you can use the **Developer Bypass**.

1. Open http://localhost:3000 in your browser.
2. Open the Developer Console (F12) and run:
   ```javascript
   document.cookie = "saloo-dev-bypass=true; path=/";
   location.reload();
   ```
3. To disable the bypass and restore normal auth:
   ```javascript
   document.cookie = "saloo-dev-bypass=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
   location.reload();
   ```

> [!TIP]
> **Check your port**: If your terminal says `Port 3000 is in use, trying 3001 instead`, make sure you are setting the cookie on the correct URL (e.g., http://localhost:3001).

> [!IMPORTANT]
> When the bypass is active, you can access protected routes like `/home`, `/owner/dashboard`, and `/admin/dashboard`. However, database data protected by RLS will be empty since there is no authenticated session.

---

## 📂 Project Structure
- `apps/`: Next.js 14 (App Router) fully responsive web application.
- `packages/types`: Shared TypeScript definitions.
- `packages/lib`: Shared utilities and logic.
- `supabase/`: Database schema, migrations, and edge functions.

## 📄 Documentation
For more detailed information, see:
- [Database Schema](supabase/schema.sql)
- [Project Setup (Legacy)](START.md)
