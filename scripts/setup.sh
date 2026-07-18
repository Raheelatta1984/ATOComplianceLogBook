#!/bin/bash
echo "🚗 TripLog Setup"
echo "================"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check for .env
if [ ! -f .env ]; then
    echo "📝 Creating .env from template..."
    cp .env.example .env
    echo "⚠️  Edit .env with your DATABASE_URL"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your DATABASE_URL"
echo "2. Run: npx drizzle-kit push"
echo "3. Run: npm run seed (optional)"
echo "4. Run: npm run dev"
echo ""
echo "Or deploy to Vercel: see DEPLOY.md"
