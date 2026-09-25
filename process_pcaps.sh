#!/bin/sh

PCAP_DIR="/pcaps"
FLOW_DIR="/flows"

SCAN_INTERVAL=10          # seconds between scans
FLOW_TIMEOUT=300          # max seconds allowed per PCAP (5 min)

while true; do
  echo "Scanning for PCAP files in $PCAP_DIR ..."
  ls -la "$PCAP_DIR" 2>/dev/null || echo "No pcaps directory or empty"

  for f in "$PCAP_DIR"/*.pcap; do
    [ -f "$f" ] || continue

    base=$(basename "$f" .pcap)
    final_csv="$FLOW_DIR/${base}.csv"
    tmp_csv="$FLOW_DIR/${base}.csv.tmp"

    # Skip already completed files
    if [ -f "$final_csv" ]; then
      echo "Skipping $f (already processed)"
      continue
    fi

    # Skip if temp file exists but still being processed
    if [ -f "$tmp_csv" ]; then
      echo "Skipping $f (processing in progress)"
      continue
    fi

    echo "=== Processing: $f ==="
    echo "Temp output: $tmp_csv"

    # Run CICFlowMeter with timeout protection
    timeout "$FLOW_TIMEOUT" java -Djava.library.path=/app/lib/native \
      -cp "/app/CICFlowMeter-4.0.jar:/app/libs/*:/app/lib/native/jnetpcap.jar" \
      cic.cs.unb.ca.ifm.Cmd "$f" "$FLOW_DIR"

    status=$?

    if [ "$status" -eq 0 ]; then
      # CICFlowMeter generates ${base}.pcap_Flow.csv or ${base}_Flow.csv
      generated_csv=$(ls "$FLOW_DIR"/${base}*.csv 2>/dev/null | grep -v "\.tmp$" | head -n 1)
      if [ -n "$generated_csv" ] && [ -f "$generated_csv" ]; then
        mv "$generated_csv" "$final_csv"
        echo "SUCCESS: Completed $final_csv"
      else
        echo "ERROR: Expected output missing for $f"
      fi
    elif [ "$status" -eq 124 ]; then
      echo "TIMEOUT: CICFlowMeter hung on $f — skipping"
      rm -f "$tmp_csv"
    else
      echo "ERROR: Failed processing $f"
      rm -f "$tmp_csv"
    fi

  done

  echo "Waiting $SCAN_INTERVAL seconds before next scan..."
  sleep "$SCAN_INTERVAL"
done
