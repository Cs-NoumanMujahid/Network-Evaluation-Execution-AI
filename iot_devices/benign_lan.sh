#!/bin/sh
# Benign traffic for an office / college lab LAN of ~10 PCs + a monitor screen.
# Real behaviour mimicked: many short web requests from several "workstations"
# browsing in parallel, interleaved DNS lookups, a steady low-rate monitor/display
# poll, and the occasional larger software-update download. All sourced from this
# single container IP (one registered LAN device).
PEER="${PEER:-172.20.0.60}"
rnd() { awk "BEGIN{srand();print int(rand()*$1)+1}"; }

PAGES="index.html about.html news.html mail.html portal.html status"
NAMES="www.google.com portal.lab.edu moodle.lab.edu mail.lab.edu updates.microsoft.com"

# ~10 workstations browsing: fan out a handful of short concurrent requests,
# then pause briefly. Scheme alternates http/https like a real mixed workload.
( while true; do
    n=$((6 + $(rnd 6)))              # 7-12 concurrent "PCs" this round
    i=0
    while [ "$i" -lt "$n" ]; do
        page=$(echo "$PAGES" | tr ' ' '\n' | sed -n "$(rnd 6)p")
        if [ $(($(rnd 2) % 2)) -eq 0 ]; then
            curl -s  --max-time 10 "http://$PEER/$page"  >/dev/null 2>&1 &
        else
            curl -sk --max-time 10 "https://$PEER/$page" >/dev/null 2>&1 &
        fi
        i=$((i + 1))
    done
    sleep $((5 + $(rnd 10)))
  done ) &

# Interleaved DNS lookups every ~10-20s.
( while true; do
    name=$(echo "$NAMES" | tr ' ' '\n' | sed -n "$(rnd 5)p")
    dig +short +time=3 +tries=1 @"$PEER" "$name" >/dev/null 2>&1
    sleep $((10 + $(rnd 10)))
  done ) &

# Monitor / display screen — steady low-rate status poll every ~5s.
( while true; do
    curl -s --max-time 8 "http://$PEER/status" >/dev/null 2>&1
    sleep 5
  done ) &

# Occasional software-update download every ~180-300s.
( while true; do
    sleep $((180 + $(rnd 120)))
    curl -s --max-time 60 "http://$PEER/fw.bin" >/dev/null 2>&1
  done ) &

wait
