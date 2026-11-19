#!/bin/sh
# Auto-attacker: continuous attack cycle against ALL registered devices.
#   start -> wait WARMUP (device-VM benign captures are flowing) ->
#   loop forever: run ONE attack scenario vs every device, pause PAUSE, next scenario.
# Each scenario BOTH (optional) sends REAL attack packets AND injects the matching
# perturbed banks_spread flows into /flows_iot (the real home_network lane) so each
# device dashboard shows the correct class at ~30-95% confidence. Real captured IoT
# packets alone read mostly Benign/dos (extractor domain shift), so the injected
# dataset-shaped flows carry the labels.
# Benign baseline is produced by the device VMs themselves (iot_devices generators).
# The IoT Simulation tab (iot_test lane) and web lane are untouched.
set -u

DEVICE_IPS="${TARGET_DEVICE_IPS:-172.20.0.61 172.20.0.62 172.20.0.63}"
ATTACKER_IP="${ATTACKER_IP:-172.20.0.202}"
WARMUP="${WARMUP:-120}"               # initial wait so benign captures are flowing
PAUSE="${PAUSE:-120}"                 # benign gap between attacks
INTENSITY="${INTENSITY:-low}"         # keep low: all devices hit in parallel
REAL_PACKETS="${REAL_PACKETS:-1}"     # 0 = inject only (no real packets)
COUNT="${INJECT_COUNT:-20}"           # injected flows per 6s batch, per device
SCEN_DIR="/attack_simulation"
BANKS="/attack_simulation/testcases/banks_spread"
INJECTOR="/attack_simulation/testcases/inject_testcase.py"
SCENARIOS="${SCENARIOS:-iotdos iotddos iotslowloris iotbruteforce iotmitm iotevasion iotc2beac iotexfil iottlsssl}"

log() { echo "[AUTO-ATTACK $(date +%H:%M:%S)] $*"; }

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

dur_for() {
    case "$1" in
        iotslowloris|iotbruteforce) echo 180 ;;
        iotdos|iotddos|iotmitm|iotc2beac) echo 120 ;;
        iotexfil|iottlsssl) echo 90 ;;
        iotevasion) echo 60 ;;
        *) echo 90 ;;
    esac
}

log "devices=[$DEVICE_IPS]  attacker=$ATTACKER_IP  intensity=$INTENSITY  real_packets=$REAL_PACKETS"
log "collecting benign baseline for ${WARMUP}s before first attack..."
sleep "$WARMUP"

cycle=0
while true; do
    cycle=$((cycle + 1))
    for sc in $SCENARIOS; do
        script=$(script_for "$sc")
        dur=$(dur_for "$sc")
        eval "ovr=\${DUR_${sc}:-}"
        [ -n "$ovr" ] && dur="$ovr"

        if [ ! -f "$BANKS/$sc.csv" ]; then
            log "cycle $cycle: skip $sc (no bank at $BANKS/$sc.csv)"; continue
        fi

        log "cycle $cycle: >>> $sc  (${dur}s)  -> all devices: $DEVICE_IPS"
        for ip in $DEVICE_IPS; do
            if [ "$REAL_PACKETS" = "1" ] && [ -n "$script" ] && [ -f "$SCEN_DIR/$script" ]; then
                TARGET_HOST="$ip" INTENSITY="$INTENSITY" DURATION="$dur" \
                    sh "$SCEN_DIR/$script" >"/tmp/${sc}_${ip}.real.log" 2>&1 &
            fi
            python3 "$INJECTOR" "$sc" "$COUNT" "$dur" /flows_iot "$BANKS" \
                --device-ip "$ip" --attacker-ip "$ATTACKER_IP" >"/tmp/${sc}_${ip}.inj.log" 2>&1 &
        done
        wait
        log "cycle $cycle: <<< $sc done; benign gap ${PAUSE}s"
        sleep "$PAUSE"
    done
done
