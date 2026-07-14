#!/bin/bash

# FLUX Admin Dashboard Startup Script
# This script starts the admin dashboard and verifies it's working

echo "🚀 Starting FLUX Admin Dashboard..."
echo ""

# Check if we're in the right directory
if [ ! -f "admin-dashboard/package.json" ]; then
    echo "❌ Error: Please run this script from the FLUX root directory"
    exit 1
fi

# Navigate to admin dashboard
cd admin-dashboard

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if backend is running
echo "🔍 Checking if backend is running on port 8080..."
if ! curl -s http://localhost:8080/api/health >/dev/null 2>&1; then
    echo "⚠️  WARNING: Backend doesn't appear to be running on port 8080"
    echo "   The dashboard will start but API calls will fail."
    echo "   Please start your backend (FluxApplication.java) first."
    echo ""
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "✅ Starting development server..."
echo "   Dashboard will open at: http://localhost:3001"
echo "   Press Ctrl+C to stop"
echo ""

# Start the dev server
npm run dev
