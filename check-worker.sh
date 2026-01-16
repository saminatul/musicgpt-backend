#!/bin/bash

echo "🔍 Worker Log Checker"
echo "===================="
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    echo "Starting in local mode..."
    echo ""
    echo "To check worker logs locally:"
    echo "  1. Make sure worker is running: npm run worker"
    echo "  2. Check the terminal where worker is running"
    exit 1
fi

# Check if worker container exists
if ! docker-compose ps worker > /dev/null 2>&1; then
    echo "⚠️  Worker container not found"
    echo ""
    echo "Available options:"
    echo "  1. Start worker: docker-compose up -d worker"
    echo "  2. View all containers: docker-compose ps"
    exit 1
fi

echo "📊 Worker Container Status:"
docker-compose ps worker
echo ""

echo "📝 Recent Worker Logs (last 20 lines):"
echo "--------------------------------------"
docker-compose logs --tail=20 worker
echo ""

echo "💡 Useful Commands:"
echo "  - Follow logs: docker-compose logs -f worker"
echo "  - View errors: docker-compose logs worker | grep -i error"
echo "  - View last 100: docker-compose logs --tail=100 worker"
