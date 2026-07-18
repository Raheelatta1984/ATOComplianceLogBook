#!/bin/bash
echo "🌱 Seeding production database..."

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set"
    exit 1
fi

# Push schema first
echo "📦 Pushing schema..."
npx drizzle-kit push

# Seed data
echo "🌱 Seeding demo data..."
npx tsx src/db/seed.ts

echo "✅ Done!"
