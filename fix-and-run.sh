#!/bin/bash
echo "🔧 Fixing Prisma and TypeScript issues..."

# Step 1: Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Step 2: Check if generation was successful
if [ -d "node_modules/.prisma/client" ]; then
    echo "✅ Prisma Client generated successfully!"
else
    echo "❌ Prisma Client generation failed"
    exit 1
fi

# Step 3: Start the server
echo "🚀 Starting development server..."
npm run start:dev
