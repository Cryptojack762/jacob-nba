#!/bin/bash
# Run once on the Atlas server: hosts Atlas + Phoenix from GitHub (auto-updates every 5 min) and upgrades the relay.
set -e
apt-get install -y git >/dev/null
grep -o "/r/[0-9a-f]*" /opt/relay/relay.js | head -1 | cut -d/ -f3 > /opt/relay/prefix.new || true
[ -s /opt/relay/prefix ] || mv /opt/relay/prefix.new /opt/relay/prefix; rm -f /opt/relay/prefix.new; chmod 600 /opt/relay/prefix
mkdir -p /opt/www /var/www/acme && cd /opt/www
[ -d atlas ] || git clone -q -b claude-bot --depth 1 https://github.com/Cryptojack762/jacob-nba.git atlas
[ -d phoenix ] || git clone -q -b main --depth 1 https://github.com/Cryptojack762/jacob-nba.git phoenix
cp /opt/relay/relay.js /opt/relay/relay.v1.js
cp /opt/www/atlas/claude-bot/vps/relay.js /opt/relay/relay.js
cat > /etc/cron.d/atlas-pull <<'CRON'
*/5 * * * * root cd /opt/www/atlas && git pull -q; cd /opt/www/phoenix && git pull -q
CRON
D=$(ls /etc/letsencrypt/live | grep sslip | head -1)
sed -i 's/^authenticator = .*/authenticator = webroot/' /etc/letsencrypt/renewal/$D.conf
grep -q webroot_path /etc/letsencrypt/renewal/$D.conf || printf "webroot_path = /var/www/acme,\n[[webroot_map]]\n$D = /var/www/acme\n" >> /etc/letsencrypt/renewal/$D.conf
systemctl restart atlas-relay && sleep 1
curl -s https://$D/health; echo
curl -s -o /dev/null -w "atlas %{http_code}\n" https://$D/atlas/
curl -s -o /dev/null -w "phoenix %{http_code}\n" https://$D/phoenix/
echo SETUP-DONE
