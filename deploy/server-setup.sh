#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu server (24.04) for the shop. Run it on the server, as the normal user:
#
#   curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/dev/deploy/server-setup.sh | bash
#   (or copy the file to the server and run: bash server-setup.sh)
#
# It installs Docker, adds 2 GiB of swap (a 4 GiB machine is tight with Elasticsearch), makes /opt/haisan for the
# files of the shop, and turns on automatic security updates. It is safe to run twice.
set -euo pipefail

if [ "$(id -u)" -eq 0 ]; then
  echo "Run this as a normal user (it uses sudo where needed), not as root." >&2
  exit 1
fi

echo "==> Updating the package list"
sudo apt-get update -y

echo "==> Installing Docker (the official repository)"
if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get install -y ca-certificates curl
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
sudo usermod -aG docker "$USER"

echo "==> Swap (2 GiB)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi
# Prefer RAM, use swap only under pressure.
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-haisan.conf >/dev/null
# Elasticsearch needs this.
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.d/99-haisan.conf >/dev/null
sudo sysctl --system >/dev/null

echo "==> Automatic security updates"
sudo apt-get install -y unattended-upgrades

echo "==> Folder for the shop"
sudo mkdir -p /opt/haisan
sudo chown "$USER":"$USER" /opt/haisan

cat <<'DONE'

Done. Log out and in again (so the docker group applies), then check:

  docker --version && docker compose version && free -h

Next: copy .env to /opt/haisan/.env (see deploy/prod.env.example) and run the first deploy.
DONE
