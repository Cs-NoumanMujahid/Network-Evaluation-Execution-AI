"""Fire a model-verified attack at a REGISTERED device, by name or IP.

A thin convenience wrapper around inject_camera.py / run_all.py so you don't have to
set NEXA_DEVICE_NAME / NEXA_CAMERA_IP by hand. Injection is the reliable path: real
packet attacks read Benign on this model because the live CICFlowMeter doesn't
populate the bulk features the model keys on, so we drip model-verified bank flows
(attack_simulation/testcases/banks/<scenario>.csv) stamped with the target device's
IP into the home-network lane. The device dashboard then shows the correct attack class.

Stdlib ONLY. Runs on the HOST (reads /api/devices/, writes to <repo>/flows_iot).

Usage:
  python attack_device.py <device> <scenario> [count] [duration] [backend_url]
  python attack_device.py --list

  <device>    registered device NAME ("Doorbell", "Wifi Router", "LAN"),
              an IP ("172.20.0.61"), or the device id.
  <scenario>  dos | ddos | slowloris | bruteforce | mitm | evasion | c2beac |
              exfil | tlsssl | benign | all   (iot* bank names also accepted)

Examples:
  python attack_device.py Doorbell exfil
  python attack_device.py 172.20.0.62 dos 30 90
  python attack_device.py "Wifi Router" bruteforce
  python attack_device.py LAN all
"""
import os
import re
import sys
import json
import subprocess
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
INJECTOR = os.path.join(HERE, "inject_camera.py")
RUNALL = os.path.join(HERE, "run_all.py")
DEFAULT_BACKEND = "http://localhost:8000"

IP_RE = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")

# friendly scenario -> model-verified bank name
ALIASES = {
    "dos": "iotdos",
    "ddos": "iotddos",
    "slowloris": "iotslowloris",
    "bruteforce": "iotbruteforce",
    "brute": "iotbruteforce",
    "mitm": "iotmitm",
    "evasion": "iotevasion",
    "c2beac": "iotc2beac",
    "c2": "iotc2beac",
    "exfil": "iotexfil",
    "exfiltration": "iotexfil",
    "tlsssl": "iottlsssl",
    "tls": "iottlsssl",
    "ssl": "iottlsssl",
    "benign": "benign",
}
VALID_BANKS = set(ALIASES.values())


def list_devices(backend):
    url = backend.rstrip("/") + "/api/devices/"
    try:
        with urllib.request.urlopen(url, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print("ERROR: could not reach backend at %s (%s). Is the Django server running?" % (url, e))
        return 1
    devices = data.get("results", data) if isinstance(data, dict) else data
    if not devices:
        print("No registered devices. Add them in the UI (Sources) first.")
        return 0
    print("Registered devices:")
    print("  %-4s %-20s %-16s %s" % ("id", "name", "ip_address", "type"))
    for d in devices:
        if isinstance(d, dict):
            print("  %-4s %-20s %-16s %s" % (
                d.get("id", "?"), d.get("name", "?"),
                d.get("ip_address", "?"), d.get("device_type", "?")))
    return 0


def resolve_scenario(s):
    s = s.lower()
    if s == "all":
        return "all"
    if s in ALIASES:
        return ALIASES[s]
    if s in VALID_BANKS:
        return s
    return None


def main():
    args = [a for a in sys.argv[1:]]
    if not args or args[0] in ("-h", "--help", "help"):
        print(__doc__)
        return 0

    backend = DEFAULT_BACKEND
    # allow a trailing backend_url anywhere via env too
    if args[0] in ("--list", "-l", "list"):
        if len(args) > 1:
            backend = args[1]
        return list_devices(backend)

    if len(args) < 2:
        print("usage: attack_device.py <device> <scenario> [count] [duration] [backend_url]")
        print("       attack_device.py --list")
        return 2

    device = args[0]
    scenario_in = args[1]
    count = args[2] if len(args) > 2 else "25"
    duration = args[3] if len(args) > 3 else "60"
    backend = args[4] if len(args) > 4 else DEFAULT_BACKEND

    scenario = resolve_scenario(scenario_in)
    if not scenario:
        print("ERROR: unknown scenario '%s'. Choose one of: %s | all"
              % (scenario_in, ", ".join(sorted(ALIASES))))
        return 2

    # Target the device: IP-looking -> NEXA_CAMERA_IP, otherwise treat as a name.
    env = os.environ.copy()
    if IP_RE.match(device):
        env["NEXA_CAMERA_IP"] = device
        env.pop("NEXA_DEVICE_NAME", None)
        target_desc = "IP %s" % device
    else:
        env["NEXA_DEVICE_NAME"] = device
        env.pop("NEXA_CAMERA_IP", None)
        target_desc = "device '%s'" % device

    if scenario == "all":
        print("[attack_device] ALL scenarios -> %s (count=%s dur=%s each)" % (target_desc, count, duration))
        # run_all.py [dur] [pause] [backend_url] [count]
        cmd = [sys.executable, RUNALL, duration, "15", backend, count]
    else:
        print("[attack_device] %s -> %s (count=%s dur=%ss)" % (scenario, target_desc, count, duration))
        # inject_camera.py <scenario> [count] [duration] [backend_url]
        cmd = [sys.executable, INJECTOR, scenario, count, duration, backend]

    try:
        return subprocess.call(cmd, env=env)
    except KeyboardInterrupt:
        print("\n[attack_device] stopped by user")
        return 0


if __name__ == "__main__":
    sys.exit(main())
