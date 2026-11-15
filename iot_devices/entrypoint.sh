#!/bin/sh
# NEXA simulated IoT victim device. Exposes device-like services (so attacks get
# a real two-sided target), runs a device-specific benign traffic generator
# against the cloud peer, and self-captures its OWN eth0 into the SHARED
# ./pcaps_iot folder. The backend later attributes each flow to this device by IP.
set -e

DEVICE_NAME="${DEVICE_NAME:-device}"
BENIGN_PROFILE="${BENIGN_PROFILE:-lan}"
PEER="${PEER:-172.20.0.60}"
CAP_DIR="/pcaps_iot"
mkdir -p "$CAP_DIR"

echo "[$DEVICE_NAME] starting services (profile=$BENIGN_PROFILE peer=$PEER)..."

# HTTP (busybox httpd) on :80
httpd -h /www -p 0.0.0.0:80 || echo "[$DEVICE_NAME] httpd failed to start"

# Telnet (busybox telnetd) on :23 — login service to scan/brute
telnetd -l /bin/sh -p 23 || echo "[$DEVICE_NAME] telnetd failed to start"

# SSH (dropbear) on :22 — generate host keys on first boot
mkdir -p /etc/dropbear
dropbear -R -p 22 || echo "[$DEVICE_NAME] dropbear failed to start"

# HTTPS/TLS (openssl s_server) on :443 — real TLS endpoint for benign heartbeats
# and the TLS/SSL attack scenario. Self-signed cert generated once on first boot.
if [ ! -f /etc/iot_tls/cert.pem ]; then
    mkdir -p /etc/iot_tls
    openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
        -subj "/CN=$DEVICE_NAME" \
        -keyout /etc/iot_tls/key.pem -out /etc/iot_tls/cert.pem 2>/dev/null \
        || echo "[$DEVICE_NAME] TLS cert generation failed"
fi
openssl s_server -www -quiet -accept 443 \
    -cert /etc/iot_tls/cert.pem -key /etc/iot_tls/key.pem >/dev/null 2>&1 &
echo "[$DEVICE_NAME] TLS listener started on :443"

# Device-specific benign traffic generator (talks ONLY to the cloud peer).
BENIGN_SCRIPT="/benign_${BENIGN_PROFILE}.sh"
if [ -x "$BENIGN_SCRIPT" ]; then
    echo "[$DEVICE_NAME] launching benign generator: $BENIGN_SCRIPT"
    PEER="$PEER" DEVICE_NAME="$DEVICE_NAME" "$BENIGN_SCRIPT" &
else
    echo "[$DEVICE_NAME] WARNING: no benign script at $BENIGN_SCRIPT"
fi

# Self-capture on eth0 (Ethernet link-layer). NOTE: do NOT use `-i any` here — it
# yields Linux "cooked"/SLL captures that CICFlowMeter cannot parse into flows.
# Device-prefixed filename avoids collisions between the 3 victims in pcaps_iot.
# Rotate every 60s (60s capture window); exclude Kafka/management ports.
echo "[$DEVICE_NAME] starting tcpdump capture on eth0 -> $CAP_DIR/${DEVICE_NAME}_*"
exec tcpdump -i eth0 \
    'not port 29092 and not port 9092 and not port 9093 and not port 8000 and not port 3000 and not port 3306' \
    -w "$CAP_DIR/${DEVICE_NAME}_%Y%m%d_%H%M%S.pcap" -G 60
