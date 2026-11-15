#!/bin/sh
# Benign traffic for the EZVIZ CS-DB1-A0-1B3WPFR video doorbell.
# Real behaviour mimicked: a persistent TLS link to the Ezviz cloud with periodic
# small heartbeats, DNS lookups for cloud domains, occasional small motion-event
# uploads, and a modest clip / live-view pull (download-dominant). Uploads are
# kept small on purpose so benign flows don't look like a bulk-upload attack.
PEER="${PEER:-172.20.0.60}"
rnd() { awk "BEGIN{srand();print int(rand()*$1)+1}"; }

# Cloud heartbeat / keepalive — small TLS poll every ~25-40s.
( while true; do
    curl -sk --max-time 10 "https://$PEER/status" >/dev/null 2>&1
    sleep $((25 + $(rnd 15)))
  done ) &

# DNS lookups for cloud domains every ~45-75s.
( while true; do
    for name in cloud.ezvizlife.com ap/update.ezvizlife.com stun.ezvizlife.com; do
        dig +short +time=3 +tries=1 @"$PEER" "$name" >/dev/null 2>&1
    done
    sleep $((45 + $(rnd 30)))
  done ) &

# Motion-event upload — SMALL POST every ~90-150s.
( while true; do
    sleep $((90 + $(rnd 60)))
    curl -sk --max-time 10 -X POST \
        --data "evt=motion&dev=doorbell&ts=$(date +%s)" \
        "https://$PEER/status" >/dev/null 2>&1
  done ) &

# Clip / live-view pull — download-dominant, every ~120-240s.
( while true; do
    sleep $((120 + $(rnd 120)))
    curl -sk --max-time 20 "https://$PEER/clip.bin" >/dev/null 2>&1
  done ) &

wait
