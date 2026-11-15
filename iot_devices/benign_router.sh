#!/bin/sh
# Benign traffic for a PTCL 10 Mbps home Wi-Fi router (the gateway's OWN traffic).
# Real behaviour mimicked: frequent DNS forwarding, small management/TR-069 (CWMP)
# keepalives to the ISP ACS, periodic firmware/config checks, and the occasional
# throughput sample capped to the ~10 Mbps package rate.
PEER="${PEER:-172.20.0.60}"
rnd() { awk "BEGIN{srand();print int(rand()*$1)+1}"; }

# DNS forwarding — frequent lookups every ~15-30s.
( while true; do
    for name in ntp.ptcl.com.pk acs.ptcl.com.pk www.ptcl.net.pk update.router.local; do
        dig +short +time=3 +tries=1 @"$PEER" "$name" >/dev/null 2>&1
    done
    sleep $((15 + $(rnd 15)))
  done ) &

# Management / TR-069 keepalive — small HTTPS every ~30-60s.
( while true; do
    curl -sk --max-time 10 "https://$PEER/status" >/dev/null 2>&1
    sleep $((30 + $(rnd 30)))
  done ) &

# TR-069 periodic inform — small HTTPS POST every ~60-120s.
( while true; do
    sleep $((60 + $(rnd 60)))
    curl -sk --max-time 10 -X POST \
        --data "cwmp=inform&oui=PTCL&ts=$(date +%s)" \
        "https://$PEER/status" >/dev/null 2>&1
  done ) &

# Firmware / config check — HTTP GET every ~120-240s.
( while true; do
    sleep $((120 + $(rnd 120)))
    curl -s --max-time 15 "http://$PEER/index.html" >/dev/null 2>&1
  done ) &

# Throughput sample — download capped to ~10 Mbps (1250 kB/s), every ~180-360s.
( while true; do
    sleep $((180 + $(rnd 180)))
    curl -s --max-time 60 --limit-rate 1250k "http://$PEER/fw.bin" >/dev/null 2>&1
  done ) &

wait
