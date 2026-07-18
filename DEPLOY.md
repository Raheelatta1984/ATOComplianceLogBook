# 🚀 Deployment Guide

## Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub

```bash
# Initialize git
git init
git add .
git commit -m "initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/triplog.git
git branch -M main
git push -u origin main
```

### Step 2: Get Free Database (Neon)

1. Go to [neon.tech](https://neon.tech) → Sign up free
2. Click "Create Project"
3. Choose region (AWS us-east-1 recommended)
4. Copy the connection string

### Step 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click "Add New Project"
3. Import your `triplog` repository
4. Add Environment Variable:
   - Name: `DATABASE_URL`
   - Value: (your Neon connection string)
5. Click "Deploy"

### Step 4: Initialize Database

After first deploy, run schema push:

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Pull env variables
vercel env pull .env.local

# Push schema
npx drizzle-kit push
```

### Step 5: Seed Demo Data (Optional)

```bash
npx tsx src/db/seed.ts
```

### Done! 🎉

Your app is live at `https://your-project.vercel.app`

---

## Other Deployment Options

### Railway
1. Connect GitHub repo at [railway.app](https://railway.app)
2. Add PostgreSQL service
3. Set `DATABASE_URL` variable
4. Deploy

### Render
1. Create Web Service at [render.com](https://render.com)
2. Connect repo
3. Set build command: `npm install && npm run build`
4. Add PostgreSQL database
5. Set `DATABASE_URL`

### DigitalOcean App Platform
1. Create app at [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Connect GitHub repo
3. Add managed PostgreSQL
4. Set environment variables

---

## Custom Domain (Vercel)

1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as shown
4. SSL is automatic

---

## Database Migrations

After schema changes:

```bash
# Push changes directly (development)
npx drizzle-kit push

# Or generate migration files (production)
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## Troubleshooting

### "Module not found" errors
```bash
rm -rf node_modules .next
npm install
npm run build
```

### Database connection errors
- Check `DATABASE_URL` is correct
- Ensure database is running
- Check IP whitelist (Neon requires it)

### Build fails
```bash
npm run typecheck  # Check for type errors
npm run lint       # Check for lint errors
```
