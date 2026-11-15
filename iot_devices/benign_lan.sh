#!/bin/sh
# Benign traffic for an office / college lab LAN (~10 PCs + a monitor screen),
# SHAPED to match the dataset's benign profile (attack_simulation/testcases/
# profiles/benign.json): sparse, small, SEQUENTIAL request/response flows on common
# ports. No high-rate concurrent bursts - those produced many high-packets/sec short
# TCP flows that the model misread as "dos". One small request at a time keeps every
# flow in the benign region while still generating steady per-minute volume.
PEER="${PEER:-172.20.0.60}"
rnd() { awk "BEGIN{srand();print int(rand()*$1)+1}"; }

PAGES="index.html about.html news.html mail.html portal.html status"
NAMES="www.google.com portal.lab.edu moodle.lab.edu mail.lab.edu updates.microsoft.com"

# Workstation browsing: one small request at a time, jittered 2-8s gaps, mixing
# http/https. Sequential (no "&") so flows stay clean request/response, not bursts.
( while true; do
    page=$(echo "$PAGES" | tr ' ' '\n' | sed -n "$(rnd 6)p")
    if [ $(( $(rnd 2) % 2 )) -eq 0 ]; then
        curl -s  --max-time 10 "http://$PEER/$page"  >/dev/null 2>&1
    else
        curl -sk --max-time 10 "https://$PEER/$page" >/dev/null 2>&1
    fi
    sleep $((2 + $(rnd 6)))
  done ) &

# Occasional DNS lookups, every ~15-30s.
( while true; do
    name=$(echo "$NAMES" | tr ' ' '\n' | sed -n "$(rnd 5)p")
    dig +short +time=3 +tries=1 @"$PEER" "$name" >/dev/null 2>&1
    sleep $((15 + $(rnd 15)))
  done ) &

# Monitor / display screen: a light status poll every ~10s (single request).
( while true; do
    curl -s --max-time 8 "http://$PEER/status" >/dev/null 2>&1
    sleep $((10 + $(rnd 4)))
  done ) &

wait
