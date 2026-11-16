#!/bin/sh
# NEXA IoT "cloud" peer: HTTP (:80), DNS (:53), HTTPS (:443). Unregistered host.
# The 3 victim devices send their benign traffic here; the victims self-capture
# it, so these flows reach pcaps_iot and are attributed to each victim by IP.
set -e

SELF_IP="${SELF_IP:-172.20.0.60}"

echo "[iot-cloud] starting services (self=$SELF_IP)..."

# DNS: resolve EVERY name to ourselves so victim DNS lookups get a real answer
# (clean two-sided flow) and any follow-up connection lands back on this peer.
dnsmasq --address="/#/$SELF_IP" --no-resolv --no-hosts \
    || echo "[iot-cloud] dnsmasq failed to start"

# HTTP file server on :80 (serves /www: status, pages, clip.bin, fw.bin).
httpd -h /www -p 0.0.0.0:80 || echo "[iot-cloud] httpd failed to start"

# HTTPS/TLS on :443 — self-signed cert generated once on first boot.
if [ ! -f /etc/cloud_tls/cert.pem ]; then
    mkdir -p /etc/cloud_tls
    openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
        -subj "/CN=iot-cloud" \
        -keyout /etc/cloud_tls/key.pem -out /etc/cloud_tls/cert.pem 2>/dev/null \
        || echo "[iot-cloud] TLS cert generation failed"
fi

echo "[iot-cloud] services up; TLS listener in foreground on :443"
exec openssl s_server -www -quiet -accept 443 \
    -cert /etc/cloud_tls/cert.pem -key /etc/cloud_tls/key.pem
