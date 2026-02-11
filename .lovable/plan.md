

# Deploying Your App to a VPS

Your app has two parts that need consideration:

## 1. Frontend (Your React App)

This is a static site built with Vite. On your VPS you will:

1. **Clone your repository** from GitHub (connect your project to GitHub first via Settings > Connectors > GitHub if you haven't already)
2. **Install Node.js** (v18+) and npm on your VPS
3. **Install dependencies and build**:
   ```text
   npm install
   npm run build
   ```
   This creates a `dist/` folder with static HTML/CSS/JS files.

4. **Serve with Nginx** (recommended):
   - Install Nginx on your VPS
   - Point it to the `dist/` folder
   - Add a fallback rule so all routes serve `index.html` (required for client-side routing)

   Example Nginx config:
   ```text
   server {
       listen 80;
       server_name yourdomain.com;
       root /var/www/your-app/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

5. **Set environment variables** before building. Create a `.env` file with:
   ```text
   VITE_SUPABASE_URL=https://zovakngafdwzbqhwvssf.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
   ```
   These get baked into the build at compile time.

6. **Add SSL** with Let's Encrypt / Certbot for HTTPS.

## 2. Backend (Lovable Cloud)

Your backend (database, authentication, edge functions, file storage) runs on Lovable Cloud. This will **continue to work as-is** -- your VPS-hosted frontend will connect to the same backend using the environment variables above. You do not need to move the backend to your VPS.

If you want to fully self-host the backend too, that would require setting up your own Supabase instance, migrating the database, storage buckets, edge functions, and auth configuration -- which is a much larger undertaking.

## Recommended Approach

| Component | Where it runs |
|-----------|--------------|
| Frontend (React) | Your VPS via Nginx |
| Backend (DB, Auth, Storage, Edge Functions) | Lovable Cloud (no change needed) |

## Steps Summary

1. Push code to GitHub (Settings > Connectors > GitHub)
2. SSH into your VPS
3. Clone the repo
4. Create `.env` with your backend URLs
5. Run `npm install && npm run build`
6. Configure Nginx to serve the `dist/` folder
7. Set up SSL with Certbot
8. Optionally set up a CI/CD pipeline to auto-deploy on push

