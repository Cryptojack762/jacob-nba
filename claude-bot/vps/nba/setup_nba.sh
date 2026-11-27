#!/bin/bash
# NBA set builder on the server. Usage: bash setup_nba.sh   (needs /opt/rb/config.json from the server-browser install)
set -e
mkdir -p /opt/nba
curl -fsSL https://raw.githubusercontent.com/Cryptojack762/jacob-nba/claude-bot/claude-bot/vps/nba/blend.js -o /opt/nba/blend.js
NODE=$(command -v node)
cat > /etc/systemd/system/nba-blend.service <<U
[Unit]
Description=NBA set builder (Kalshi prices -> Jacob's rules -> Order_Desk, unticked)
[Service]
Type=oneshot
ExecStartPre=/usr/bin/curl -fsSL https://raw.githubusercontent.com/Cryptojack762/jacob-nba/claude-bot/claude-bot/vps/nba/blend.js -o /opt/nba/blend.js
ExecStart=$NODE /opt/nba/blend.js
U
cat > /etc/systemd/system/nba-blend.timer <<U
[Unit]
Description=NBA set builder: 9 AM (morning prices), 11:05 AM, 4:35 PM, 5:30 PM Central
[Timer]
OnCalendar=*-*-* 09:00:00 America/Chicago
OnCalendar=*-*-* 11:05:00 America/Chicago
OnCalendar=*-*-* 16:35:00 America/Chicago
OnCalendar=*-*-* 17:30:00 America/Chicago
Persistent=false
[Install]
WantedBy=timers.target
U
systemctl daemon-reload
systemctl enable --now nba-blend.timer
systemctl start nba-blend.service || true
journalctl -u nba-blend.service -n 5 --no-pager
