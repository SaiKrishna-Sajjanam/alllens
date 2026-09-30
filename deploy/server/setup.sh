#!/usr/bin/env bash
# One-time setup of the Vuaz jobs on an Ubuntu 24.04 server (Oracle Cloud Always Free).
# See docs/SERVER.md. Run as the server's normal user (ubuntu), after cloning the repo to ~/alllens:
#     bash ~/alllens/deploy/server/setup.sh
set -euo pipefail
APP="$HOME/alllens"
ENV_FILE="$HOME/alllens.env"

echo "== System packages"
sudo apt-get update -y
sudo apt-get install -y python3 python3-venv python3-pip git

# A little swap so a short memory peak (loading the grouping model) never stops a run.
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "== Python packages (a few minutes the first time)"
python3 -m venv "$APP/.venv"
"$APP/.venv/bin/pip" install --quiet --upgrade pip
"$APP/.venv/bin/pip" install --quiet -r "$APP/requirements.txt" -r "$APP/requirements-ml.txt"
cat "$APP/requirements.txt" "$APP/requirements-ml.txt" | sha256sum | cut -d' ' -f1 > "$APP/.venv/.requirements.sha"

if [ ! -f "$ENV_FILE" ]; then
  install -m 600 "$APP/deploy/server/alllens.env.example" "$ENV_FILE"
fi

echo "== Schedules (installed, not started yet)"
for f in "$APP"/deploy/server/systemd/*; do
  sed "s#__USER__#$USER#g; s#__HOME__#$HOME#g" "$f" | sudo tee "/etc/systemd/system/$(basename "$f")" >/dev/null
done
sudo systemctl daemon-reload

echo
echo "Setup done. Next (docs/SERVER.md):"
echo "  1. nano $ENV_FILE          put your keys in; save with Ctrl+O, Enter, Ctrl+X"
echo "  2. bash $APP/deploy/server/run.sh collect      a first run, to check"
echo "  3. sudo systemctl enable --now alllens-collect.timer alllens-cleanup.timer"
