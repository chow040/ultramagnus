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
    - `ALLOWED_ORIGINS`: The URL of your frontend (e.g., `https://ultramagnus-frontend.vercel.app`). You can add localhost for dev: `https://ultramagnus-frontend.vercel.app,http://localhost:5173`.
    - `GOOGLE_CLIENT_ID`: Google OAuth Client ID.
    - `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret.
    - `GOOGLE_REDIRECT_URI`: `https://<your-backend-url>/api/auth/google/callback`.
    - `FRONTEND_URL`: `https://<your-frontend-url>`.
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

    - `VITE_API_BASE_URL`: The URL of your deployed backend (e.g., `https://ultramagnus-backend.vercel.app`). **No trailing slash.**
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
    - Add the backend callback URL (`https://<your-backend-url>/api/auth/google/callback`) to "Authorized redirect URIs".
    - Add the frontend URL to "Authorized JavaScript origins" if needed.

## Local Development

To run locally with the new structure:

- **Backend:** `cd moonshot_be && npm run dev` (Runs on port 4000).
- **Frontend:** `cd moonshot_fe && npm run dev` (Runs on port 5173).
