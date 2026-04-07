#!/bin/bash
set -e

echo "========================================="
echo "  Sign Language Interpreter - Deploy"
echo "========================================="
echo ""

# Configuration
DOCKER_REGISTRY=${DOCKER_REGISTRY:-""}
TAG=${TAG:-"latest"}

info() { echo -e "\033[0;32m[INFO]\033[0m $1"; }
error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

# Check Docker
if ! command -v docker &> /dev/null; then
    error "Docker is required for deployment"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    error "Docker Compose is required for deployment"
    exit 1
fi

# Build and deploy
info "Building Docker images..."
cd docker

COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker compose"
fi

$COMPOSE_CMD build

info "Starting services..."
$COMPOSE_CMD up -d

echo ""
info "Waiting for services to start..."
sleep 10

# Health checks
echo ""
info "Running health checks..."

check_health() {
    local name=$1
    local url=$2
    if curl -sf "$url" > /dev/null 2>&1; then
        echo "  [OK] $name"
    else
        echo "  [FAIL] $name ($url)"
    fi
}

check_health "Frontend"        "http://localhost:3000"
check_health "Node API"        "http://localhost:3001/api/health"
check_health "Speech-to-Text"  "http://localhost:8001/health"
check_health "NLP Processor"   "http://localhost:8002/health"
check_health "Text-to-Sign"    "http://localhost:8003/health"
check_health "Nginx"           "http://localhost:80/health"

echo ""
info "Deployment complete!"
echo ""
echo "  Application: http://localhost"
echo "  API:         http://localhost/api/health"
echo ""
echo "  To view logs:    cd docker && $COMPOSE_CMD logs -f"
echo "  To stop:         cd docker && $COMPOSE_CMD down"
echo ""
