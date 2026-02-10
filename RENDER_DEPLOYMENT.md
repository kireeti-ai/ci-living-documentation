# Render Deployment Guide

This project is configured for automatic deployment to Render using the `render.yaml` Blueprint.

## 🚀 Initial Setup

### 1. Push to GitHub
Ensure your code is pushed to GitHub:
```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### 2. Create Render Account
- Go to [render.com](https://render.com)
- Sign up with your GitHub account

### 3. Deploy Using Blueprint

#### Option A: One-Click Deploy (Recommended)
1. Go to your Render Dashboard
2. Click **New** → **Blueprint**
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Click **Apply** to deploy both services

#### Option B: Manual Service Creation
If you prefer to create services manually:

**Backend Service:**
1. New → Web Service
2. Connect your GitHub repo
3. Settings:
   - **Name**: `ci-living-docs-backend`
   - **Root Directory**: Leave empty
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && node dist/app.js`
   - **Plan**: Free

**Frontend Service:**
1. New → Static Site
2. Connect your GitHub repo
3. Settings:
   - **Name**: `ci-living-docs-frontend`
   - **Root Directory**: Leave empty
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `./frontend/dist`
   - **Plan**: Free

### 4. Configure Environment Variables

Go to your **backend service** → **Environment** tab and add these variables:

**Required Variables:**
```
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d
PORT=8000
NODE_ENV=production

# Email Configuration
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com

# Cloudflare R2 Storage
R2_ACCOUNT_ID=your_r2_account_id
R2_BUCKET_NAME=ci-living-docs
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_REGION=auto
R2_ENDPOINT=your_r2_endpoint

# GitHub Webhook
GITHUB_WEBHOOK_SECRET=your_webhook_secret
BACKEND_URL=https://your-backend.onrender.com
```

**Database Setup:**
- Render offers free PostgreSQL databases
- Go to **New** → **PostgreSQL**
- After creation, copy the **Internal Database URL**
- Use this for `DATABASE_URL`

**Frontend Configuration:**
The frontend automatically gets `VITE_API_URL` from the backend service URL (configured in render.yaml).
No manual environment variable setup needed!

## 📊 Database Migration

After first deployment, run migrations:
1. Go to your backend service
2. Click **Shell** tab
3. Run:
```bash
npm run db:migrate
```

Or connect via SSH and run the migration command.

## 🔄 Auto-Deploy

Once connected, Render automatically deploys when you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
# ✨ Render automatically builds and deploys!
```

## 🔗 Update GitHub Webhook

After deployment:
1. Go to your GitHub repository
2. Settings → Webhooks → Add webhook
3. **Payload URL**: `https://your-backend.onrender.com/webhooks/github`
4. **Content type**: `application/json`
5. **Secret**: Use the same value as `GITHUB_WEBHOOK_SECRET`
6. Select events: Pushes, Pull requests, Releases
7. Save

## 🌐 Your Deployed URLs

After deployment, you'll have:
- **Backend API**: `https://ci-living-docs-backend.onrender.com`
- **Frontend**: `https://ci-living-docs-frontend.onrender.com`

(URLs may vary based on availability)

## ⚠️ Important Notes

### Free Tier Limitations:
- Services spin down after 15 minutes of inactivity
- First request after inactivity takes ~30-60 seconds (cold start)
- 750 hours/month of runtime

### Upgrade Considerations:
- **Starter Plan ($7/month)**: Always on, faster builds, no cold starts
- **Custom domains**: Available on paid plans
- **More resources**: Faster performance

## 🐛 Troubleshooting

### Build Fails:
- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify build commands are correct

### Database Connection Issues:
- Verify `DATABASE_URL` is set correctly
- Use Internal Database URL (not External) for better performance
- Run migrations after first deploy

### Frontend Can't Connect to Backend:
- Verify `VITE_API_URL` is set (should be automatic with blueprint)
- Check CORS settings in backend allow your frontend domain
- Update CORS in `backend/src/app.ts` to include your Render frontend URL

### Webhook Not Working:
- Verify `BACKEND_URL` matches your actual backend URL
- Update GitHub webhook URL
- Check webhook secret matches
- Monitor webhook delivery status on GitHub

## 📝 Local Development

For local development, use:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

The frontend will automatically use `http://localhost:8000` for local development.

## 🔧 Manual Redeployment

If you need to manually trigger a deployment:
1. Go to your service in Render dashboard
2. Click **Manual Deploy** → **Deploy latest commit**

---

**Questions?** Check Render docs: https://render.com/docs
