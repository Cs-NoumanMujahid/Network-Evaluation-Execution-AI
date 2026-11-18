#!/bin/sh
# Auto-attacker: 2-min benign warm-up, then one sequential pass of all attack
# scenarios against ONE chosen registered device. Each scenario BOTH:
#   (a) sends REAL attack packets (attack_simulation/<x>.sh, genuine tools), and
#   (b) injects the matching perturbed banks_spread flows into /flows_iot so the
#       device's real dashboard shows the correct class at ~30-95% confidence
#       (real captured IoT packets alone read mostly Benign/dos -- extractor
#        domain shift -- so the injected dataset-shaped flows carry the labels).
# Manual `docker exec iot-attacker sh /attack_simulation/<x>.sh` is unaffected.
set -u

IP="${TARGET_DEVICE_IP:-172.20.0.61}"
ATTACKER_IP="${ATTACKER_IP:-172.20.0.202}"
WARMUP="${WARMUP:-120}"
INTENSITY="${INTENSITY:-low}"
COUNT="${INJECT_COUNT:-20}"          # flows per 6s injection batch
GAP="${SCENARIO_GAP:-5}"             # seconds between scenarios
SCEN_DIR="/attack_simulation"
BANKS="/attack_simulation/testcases/banks_spread"
INJECTOR="/attack_simulation/testcases/inject_testcase.py"
SCENARIOS="${SCENARIOS:-iotdos iotddos iotslowloris iotbruteforce iotmitm iotevasion iotc2beac iotexfil iottlsssl}"

log() { echo "[AUTO-ATTACK $(date +%H:%M:%S)] $*"; }

# scenario id -> real attack script filename
script_for() {
    case "$1" in
        iotdos)        echo "dos_attack.sh" ;;
        iotddos)       echo "ddos_attack.sh" ;;
        iotslowloris)  echo "slowloris_attack.sh" ;;
        iotbruteforce) echo "bruteforce_attack.sh" ;;
        iotmitm)       echo "mitm_attack.sh" ;;
        iotevasion)    echo "evasion_attack.sh" ;;
        iotc2beac)     echo "c2beac_attack.sh" ;;
        iotexfil)      echo "exfiltration_attack.sh" ;;
        iottlsssl)     echo "tlsssl_attack.sh" ;;
        *)             echo "" ;;
    esac
}

# scenario id -> realistic run length (seconds); override per id via e.g. DUR_iotdos
dur_for() {
    case "$1" in
        iotslowloris|iotbruteforce) echo 180 ;;
        iotdos|iotddos|iotmitm|iotc2beac) echo 120 ;;
        iotexfil|iottlsssl) echo 90 ;;
        iotevasion) echo 60 ;;
        *) echo 90 ;;
    esac
}

log "target device=$IP  attacker=$ATTACKER_IP  intensity=$INTENSITY  warmup=${WARMUP}s"
log "collecting benign baseline for ${WARMUP}s before first attack..."
sleep "$WARMUP"

for sc in $SCENARIOS; do
    script=$(script_for "$sc")
    dur=$(dur_for "$sc")
    # per-scenario duration override: DUR_iotdos=200 etc.
    eval "ovr=\${DUR_${sc}:-}"
    [ -n "$ovr" ] && dur="$ovr"

    if [ -z "$script" ] || [ ! -f "$SCEN_DIR/$script" ]; then
        log "skip $sc (no attack script)"; continue
    fi
    if [ ! -f "$BANKS/$sc.csv" ]; then
        log "skip $sc (no bank at $BANKS/$sc.csv)"; continue
    fi

    log ">>> $sc : real packets ($script) + injected detections, ${dur}s"
    TARGET_HOST="$IP" INTENSITY="$INTENSITY" DURATION="$dur" \
        sh "$SCEN_DIR/$script" >"/tmp/${sc}.real.log" 2>&1 &
    rpid=$!
    python3 "$INJECTOR" "$sc" "$COUNT" "$dur" /flows_iot "$BANKS" \
        --device-ip "$IP" --attacker-ip "$ATTACKER_IP" >"/tmp/${sc}.inj.log" 2>&1 &
    ipid=$!

    wait "$ipid"
    kill "$rpid" 2>/dev/null
    wait "$rpid" 2>/dev/null
    log "<<< $sc done"
    sleep "$GAP"
done

log "attack pass complete. Idling (re-run: docker compose --profile attacks restart auto-attacker)."
tail -f /dev/null
