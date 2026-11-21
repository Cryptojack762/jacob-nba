#!/bin/bash
# Atlas server browser install. Usage: bash setup_rb.sh <RB_KEY> <VNC_PASSWORD> <BOT_WEB_APP_URL>
set -e
KEY="$1"; VPW="$2"; URL="$3"; HOST=157-230-148-63.sslip.io
[ -z "$KEY" -o -z "$VPW" -o -z "$URL" ] && { echo "usage: setup_rb.sh KEY VNCPASS URL"; exit 1; }
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y xvfb fluxbox x11vnc novnc websockify fonts-liberation fonts-noto-color-emoji
command -v npm >/dev/null || apt-get install -y nodejs npm
NODE=$(command -v node)
mkdir -p /opt/rb && cd /opt/rb
curl -fsSL https://raw.githubusercontent.com/Cryptojack762/jacob-nba/claude-bot/claude-bot/vps/rb/worker.js -o worker.js
[ -f package.json ] || npm init -y >/dev/null
npm install playwright@1.47.2 >/dev/null
npx playwright install --with-deps chromium
printf '{"url":"%s","key":"%s"}\n' "$URL" "$KEY" > config.json; chmod 600 config.json
x11vnc -storepasswd "$VPW" /opt/rb/vncpass >/dev/null
unit() { cat > /etc/systemd/system/$1.service <<U
[Unit]
Description=$1
After=network-online.target $3
[Service]
Environment=DISPLAY=:99
ExecStart=$2
Restart=always
RestartSec=3
WorkingDirectory=/opt/rb
[Install]
WantedBy=multi-user.target
U
}
unit rb-xvfb "/usr/bin/Xvfb :99 -screen 0 1366x850x24 -nolisten tcp" ""
unit rb-wm "/usr/bin/fluxbox" "rb-xvfb.service"
unit rb-vnc "/usr/bin/x11vnc -display :99 -rfbauth /opt/rb/vncpass -localhost -forever -shared -rfbport 5900 -quiet" "rb-xvfb.service"
unit rb-novnc "/usr/bin/websockify --web /usr/share/novnc --cert /etc/letsencrypt/live/$HOST/fullchain.pem --key /etc/letsencrypt/live/$HOST/privkey.pem 6080 localhost:5900" "rb-vnc.service"
unit rb-worker "$NODE /opt/rb/worker.js" "rb-xvfb.service"
systemctl daemon-reload
for s in rb-xvfb rb-wm rb-vnc rb-novnc rb-worker; do systemctl enable --now $s; done
sleep 4
systemctl is-active rb-xvfb rb-wm rb-vnc rb-novnc rb-worker
free -m | head -2
echo "DONE. Phone link: https://$HOST:6080/vnc.html"
