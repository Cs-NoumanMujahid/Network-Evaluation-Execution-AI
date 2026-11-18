"""Inject synthetic test-case flows into the Simulation Lab test lane.

Runs as the process the Simulation Lab "Start" button launches for IoT scenarios
(see ids_backend/api/simulation.py). Stdlib ONLY -- no numpy/sklearn -- so it
runs in whatever Python the Django backend uses. It samples rows from a
pre-built bank (attack_simulation/testcases/banks_spread/<scenario>.csv, or the
older banks/) and drips timestamped CSV files into flows_iot_test for
`duration` seconds, so it behaves like a running attack (the producer picks each
file up; Stop kills this process and purges the lane).

Per-device mode (--device-ip): every row is re-addressed to the selected
registered device, using the services that device really runs (80/22/23/443)
and a realistic direction per attack (inbound attacks hit the device; C2 and
exfiltration flow OUT of the compromised device to the attacker). The backend
attributes iot_test flows to a registered device by IP, so the run is scoped
to that device.

Usage:
  python inject_testcase.py <scenario> <count> <duration> <flows_dir> <bank_dir>
                            [--device-ip IP] [--attacker-ip IP]
"""
import os
import sys
import csv
import time
import random
from datetime import datetime, timezone

INTERVAL = 6  # seconds between dripped batches
DEFAULT_ATTACKER_IP = "172.20.0.201"   # iot-attacker container
SPOOF_POOL = ["172.20.0.%d" % i for i in range(240, 251)]

# direction: "in" = attacker -> device, "out" = device -> attacker
# ports: destination ports to pick from; "scan" = random scan port
SCENARIO_META = {
    "iotdos":        {"dir": "in",  "ports": [80]},
    "iotddos":       {"dir": "in",  "ports": [80], "spoof": True},
    "iotslowloris":  {"dir": "in",  "ports": [80]},
    "iotbruteforce": {"dir": "in",  "ports": [22, 23]},
    "iotmitm":       {"dir": "in",  "ports": [80, 443]},
    "iotevasion":    {"dir": "in",  "ports": "scan"},
    "iottlsssl":     {"dir": "in",  "ports": [443]},
    "iotc2beac":     {"dir": "out", "ports": [443, 8080]},
    "iotexfil":      {"dir": "out", "ports": [443]},
}
SCAN_PORTS = [21, 22, 23, 25, 53, 80, 110, 139, 143, 443, 445, 554, 1883,
              3389, 5000, 8000, 8080, 8443, 8883, 9000]


def read_bank(path):
    with open(path, "r", newline="", encoding="utf-8") as f:
        r = csv.reader(f)
        header = next(r, None)
        rows = [row for row in r if row]
    return header, rows


def pick(rows, count):
    if count >= len(rows):
        return [list(x) for x in rows] + [list(x) for x in random.choices(rows, k=count - len(rows))]
    return [list(x) for x in random.sample(rows, count)]


def parse_args(argv):
    pos, opts = [], {}
    i = 0
    while i < len(argv):
        a = argv[i]
        if a.startswith("--") and i + 1 < len(argv):
            opts[a[2:]] = argv[i + 1]
            i += 2
        else:
            pos.append(a)
            i += 1
    return pos, opts


class Readdresser(object):
    """Rewrites addressing columns of a bank row for the selected device."""

    def __init__(self, header, scenario, device_ip, attacker_ip):
        self.meta = SCENARIO_META.get(scenario, {"dir": "in", "ports": [80]})
        self.device_ip = device_ip
        self.attacker_ip = attacker_ip
        col = {name: i for i, name in enumerate(header)}
        self.c_fid = col.get("Flow ID")
        self.c_src = col.get("Src IP")
        self.c_dst = col.get("Dst IP")
        self.c_sport = col.get("Src Port")
        self.c_dport = col.get("Dst Port")
        self.c_proto = col.get("Protocol")
        self.c_ts = col.get("Timestamp")

    def _dport(self):
        ports = self.meta["ports"]
        return random.choice(SCAN_PORTS) if ports == "scan" else random.choice(ports)

    def apply(self, row, now_iso):
        peer = random.choice(SPOOF_POOL) if self.meta.get("spoof") else self.attacker_ip
        if self.meta["dir"] == "out":
            src, dst = self.device_ip, peer
        else:
            src, dst = peer, self.device_ip
        sport = random.randint(32768, 60999)
        dport = self._dport()
        proto = row[self.c_proto] if self.c_proto is not None else "6"
        try:
            proto = str(int(float(proto)))
        except ValueError:
            proto = "6"
        for c, v in ((self.c_src, src), (self.c_dst, dst), (self.c_sport, str(sport)),
                     (self.c_dport, str(dport)), (self.c_ts, now_iso)):
            if c is not None:
                row[c] = v
        if self.c_fid is not None:
            row[self.c_fid] = "%s-%s-%d-%d-%s" % (src, dst, sport, dport, proto)
        return row


def main():
    pos, opts = parse_args(sys.argv[1:])
    if len(pos) < 5:
        print("usage: inject_testcase.py <scenario> <count> <duration> <flows_dir> <bank_dir>"
              " [--device-ip IP] [--attacker-ip IP]")
        return 2
    scenario = pos[0].lower()
    count = max(1, int(pos[1]))
    duration = max(1, int(pos[2]))
    flows_dir = pos[3]
    bank_dir = pos[4]
    device_ip = opts.get("device-ip")
    attacker_ip = opts.get("attacker-ip") or DEFAULT_ATTACKER_IP

    bank_path = os.path.join(bank_dir, scenario + ".csv")
    if not os.path.isfile(bank_path):
        print("ERROR: no bank for scenario '%s' at %s" % (scenario, bank_path))
        return 1
    header, rows = read_bank(bank_path)
    if not rows:
        print("ERROR: bank is empty: %s" % bank_path)
        return 1

    readdr = Readdresser(header, scenario, device_ip, attacker_ip) if device_ip else None

    # Scenario name for a readable filename (bank Label column is the class).
    try:
        label = rows[0][header.index("Label")]
    except Exception:
        label = scenario
    safe = "".join(c for c in label if c.isalnum()) or "case"

    os.makedirs(flows_dir, exist_ok=True)
    print("[INJECT] scenario=%s label=%s count/batch=%d duration=%ds interval=%ds bank=%s (%d rows) device=%s"
          % (scenario, label, count, duration, INTERVAL, os.path.basename(bank_dir), len(rows),
             device_ip or "-"))

    # Drip a SMALL batch every INTERVAL seconds for the whole duration so the
    # attack shows continuously across the dashboard window (every per-minute
    # bucket), while staying light enough that the consumer never backs up.
    end = time.time() + duration
    batch = 0
    while time.time() < end:
        sample = pick(rows, count)
        if readdr is not None:
            now_iso = datetime.now(timezone.utc).isoformat()
            sample = [readdr.apply(r, now_iso) for r in sample]
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        out = os.path.join(flows_dir, "testcase_%s_%s.csv" % (safe, ts))
        tmp = out + ".tmp"
        with open(tmp, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            if header:
                w.writerow(header)
            w.writerows(sample)
        os.replace(tmp, out)   # atomic: producer never sees a half-written file
        batch += 1
        print("[INJECT] batch %d -> %s (%d flows)" % (batch, os.path.basename(out), len(sample)))
        remaining = end - time.time()
        if remaining <= 0:
            break
        time.sleep(min(INTERVAL, remaining))
    print("[INJECT] done (%d batches)" % batch)
    return 0


if __name__ == "__main__":
    sys.exit(main())
