#!/usr/bin/env bash
# UMBRIX Installation Script for Linux/macOS
set -e

echo "=========================================================="
echo "    UMBRIX Command Center - Interactive Installer       "
echo "=========================================================="
echo ""

# 1. Check Dependencies
if ! command -v docker &> /dev/null; then
    echo "[!] Docker is not installed. Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Compatibility for docker-compose vs 'docker compose'
DOCKER_COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "[!] Docker Compose is not installed. Please install it first."
    exit 1
fi

echo "[✓] Docker and Docker Compose detected."

# 2. Setup Environment Variables
ENV_FILE=".env.prod"
if [ ! -f "$ENV_FILE" ]; then
    echo "[*] Generating secure environment variables..."
    
    if [ ! -f ".env.prod.example" ]; then
        echo "[!] .env.prod.example not found in current directory. Are you in the UMBRIX root folder?"
        exit 1
    fi
    
    cp .env.prod.example "$ENV_FILE"
    
    # Generate random securely
    JWT_SECRET=$(openssl rand -hex 32)
    PG_PASS=$(openssl rand -base64 15 | tr -dc 'a-zA-Z0-9' | head -c 16)
    REDIS_PASS=$(openssl rand -base64 15 | tr -dc 'a-zA-Z0-9' | head -c 16)
    CH_PASS=$(openssl rand -base64 15 | tr -dc 'a-zA-Z0-9' | head -c 16)
    GF_PASS=$(openssl rand -base64 15 | tr -dc 'a-zA-Z0-9' | head -c 16)
    
    # Replace in file (works on both macOS and Linux sed)
    sed -i.bak "s/CHANGE_ME_STRONG_RANDOM_HEX_64_CHARS/${JWT_SECRET}/g" "$ENV_FILE"
    sed -i.bak "s/CHANGE_ME_STRONG_POSTGRES_PASSWORD/${PG_PASS}/g" "$ENV_FILE"
    sed -i.bak "s/CHANGE_ME_REDIS_PASSWORD/${REDIS_PASS}/g" "$ENV_FILE"
    sed -i.bak "s/CHANGE_ME_CLICKHOUSE_PASSWORD/${CH_PASS}/g" "$ENV_FILE"
    sed -i.bak "s/CHANGE_ME_GRAFANA_ADMIN_PASSWORD/${GF_PASS}/g" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
    
    echo "[✓] Secure .env.prod generated."
    echo ""
    echo "    IMPORTANT: Your generated Administrator Grafana Password is: $GF_PASS"
    echo "    Save this somewhere safe! You can also find it in the .env.prod file."
    echo ""
else
    echo "[✓] Existing $ENV_FILE found. Skipping credentials generation."
fi

# 3. Booting up
echo "[*] Booting UMBRIX infrastructure..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file $ENV_FILE up -d --build

echo "=========================================================="
echo "    Installation Complete!                                "
echo "=========================================================="
echo "    Frontend:   http://localhost:3000                     "
echo "    FastAPI:    http://localhost:8000/docs                "
echo "    Grafana:    http://localhost:3001                     "
echo "=========================================================="
