# Deployment Plan for Vercel

This project consists of a frontend (`moonshot_fe`) and a backend (`moonshot_be`). Both can be deployed to Vercel.

## Prerequisites

- A Vercel account.
- The project pushed to a GitHub repository.

## 1. Backend Deployment (`moonshot_be`)

The backend is an Express application adapted for Vercel Serverless Functions.

### Steps:

1.  **Import Project in Vercel:**
    - Go to Vercel Dashboard -> Add New -> Project.
    - Select your GitHub repository.
    - **Important:** In "Root Directory", click "Edit" and select `moonshot_be`.
    - Project Name: e.g., `ultramagnus-backend`.

2.  **Configure Build Settings:**
    - Framework Preset: `Other` (or leave default).
    - Build Command: `npm run build` (optional, Vercel handles `api` automatically, but this ensures type checking).
    - Output Directory: `dist` (optional).
    - **Note:** Vercel will automatically detect the `api/index.ts` file and `vercel.json` configuration to serve the API.

3.  **Environment Variables:**
    Add the following environment variables in Vercel Project Settings:

    - `DATABASE_URL`: Your PostgreSQL connection string (e.g., from Supabase or Neon).
    - `SESSION_SECRET`: A long random string.
    - `ALLOWED_ORIGINS`: `https://alphaflux.app,https://www.alphaflux.app`.
    - `GOOGLE_CLIENT_ID`: Google OAuth Client ID.
    - `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret.
    - `GOOGLE_REDIRECT_URI`: `https://api.alphaflux.app/api/auth/google/callback`.
    - `FRONTEND_URL`: `https://alphaflux.app`.
    - `COOKIE_DOMAIN`: `.alphaflux.app` (Important: Note the leading dot).
    - `RESEND_API_KEY`: API key for Resend (email).
    - `MAIL_FROM`: Sender email address.
    - `FINNHUB_API_KEY`: API key for Finnhub.
    - `GEMINI_ANALYZE_MODEL`: e.g., `gemini-2.5-flash`.
    - `GEMINI_CHAT_MODEL`: e.g., `gemini-2.5-flash`.
    - `GOOGLE_API_KEY`: API key for Google GenAI.
    - `LOG_LEVEL`: `info`.

4.  **Deploy:**
    - Click "Deploy".

## 2. Frontend Deployment (`moonshot_fe`)

The frontend is a Vite + React application.

### Steps:

1.  **Import Project in Vercel:**
    - Go to Vercel Dashboard -> Add New -> Project.
    - Select the **same** GitHub repository.
    - **Important:** In "Root Directory", click "Edit" and select `moonshot_fe`.
    - Project Name: e.g., `ultramagnus-frontend`.

2.  **Configure Build Settings:**
    - Framework Preset: `Vite`.
    - Build Command: `npm run build` (default).
    - Output Directory: `dist` (default).

3.  **Environment Variables:**
    Add the following environment variables:

    - `VITE_API_BASE_URL`: `https://api.alphaflux.app`. **No trailing slash.**
    - `VITE_SUPABASE_URL`: Your Supabase Project URL.
    - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.

4.  **Deploy:**
    - Click "Deploy".

## 3. Post-Deployment Configuration

1.  **Update Backend `ALLOWED_ORIGINS`:**
    - Once the frontend is deployed, copy its URL.
    - Go to the Backend Project Settings -> Environment Variables.
    - Update `ALLOWED_ORIGINS` and `FRONTEND_URL` with the actual frontend URL.
    - Redeploy the backend (Deployment -> Redeploy) for changes to take effect.

2.  **Update Google OAuth:**
    - Go to Google Cloud Console.
    - Add the backend callback URL (`https://api.alphaflux.app/api/auth/google/callback`) to "Authorized redirect URIs".
    - Add the frontend URL to "Authorized JavaScript origins" if needed.

## 4. Domain Configuration (Crucial for Cookies)

To ensure login works correctly, you must configure your custom domain in Vercel:

1.  **Frontend Project:**
    - Go to Settings -> Domains.
    - Add `alphaflux.app` (and `www.alphaflux.app`).

2.  **Backend Project:**
    - Go to Settings -> Domains.
    - Add `api.alphaflux.app`.

This setup ensures both sites share the root domain `alphaflux.app`, allowing cookies to be shared securely.

## Troubleshooting

### Google Sign-In Error: "redirect_uri_mismatch"
This means the URI sent by your backend does not match what is in Google Cloud Console.
1.  **Check Vercel Backend Env Var:** Ensure `GOOGLE_REDIRECT_URI` is exactly `https://api.alphaflux.app/api/auth/google/callback`.
2.  **Check Google Cloud Console:** Ensure the **exact same URL** is added to "Authorized redirect URIs".
3.  **Redeploy Backend:** If you changed the Env Var, you MUST redeploy the backend for it to take effect.

### API Error: 404 or 405 on Frontend
This means the frontend is not pointing to the backend correctly.
1.  **Check Vercel Frontend Env Var:** Ensure `VITE_API_BASE_URL` is `https://api.alphaflux.app` (no trailing slash).
2.  **Redeploy Frontend:** Vite bakes env vars at build time. You MUST redeploy the frontend after changing this variable.

## Local Development

To run locally with the new structure:

- **Backend:** `cd moonshot_be && npm run dev` (Runs on port 4000).
- **Frontend:** `cd moonshot_fe && npm run dev` (Runs on port 5173).
