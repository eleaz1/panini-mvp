#!/bin/bash
# Run once on a fresh Ubuntu 22.04 DigitalOcean Droplet as root.
set -euo pipefail

# --- Docker ---
apt-get update -y
apt-get install -y ca-certificates curl gnupg ufw

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker

# --- Firewall ---
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "Setup complete. Next steps:"
echo "  1. Clone the repo:  git clone https://github.com/eleaz1/panini-mvp /app && cd /app"
echo "  2. Copy env file:   cp deploy/backend.env.production.example backend/.env && nano backend/.env"
echo "  3. Start services:  docker compose up -d --build"
echo "  4. Check logs:      docker compose logs -f"
