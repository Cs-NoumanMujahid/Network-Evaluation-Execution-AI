"""Build CONFIDENCE-SPREAD banks for the per-device IoT Simulation Lab.

Unlike build_banks.py (rows the model is ~100% sure of), these banks hold flows
that follow each TRUSTLab attack class's pattern but are deliberately perturbed
so they are close to the dataset, never exact copies. As a result the model's
confidence spreads out realistically instead of sitting at 99%.

Per scenario:
  1. sample the class GMM (gen_testcase.sample_rows)  -> dataset-shaped rows
  2. give every row its own perturbation strength k in [0,1]:
       - multiplicative log-normal jitter, sigma = 0.05 + 0.55*k
       - with p=0.5, blend toward a benign sample: x = (1-a)x + a*x_benign, a = 0.6*k
  3. score with the model and fill confidence bins by quota (top conf > 0.95 is
     rejected, so nothing is "too perfect"):
         0.80-0.95  65%  predicted == target   (alert)
         0.50-0.80  20%  predicted == target   (detected, below alert threshold)
         0.30-0.50   8%  predicted == target
         0.10-0.30   7%  any class             (consumer marks Unknown/zero-day)

Output: banks_spread/<scenario>.csv (RAW_COLUMNS, same shape the producer reads)
        banks_spread/report.json      (achieved bins + min/mean/max confidence)

Usage: python build_spread_banks.py [rows_per_bank] [scenario ...]   (needs the ML venv)
       (naming scenarios rebuilds only those and merges into report.json)
"""
import os
import sys
import csv
import json

import numpy as np
import pandas as pd

import gen_testcase as g
from schema import RAW_COLUMNS, IOT_FEATURE_COLS

ROWS = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
ONLY = [a.lower() for a in sys.argv[2:]]
OUT_DIR = os.path.join(g.HERE, "banks_spread")
SCENARIOS = ["iotdos", "iotddos", "iotslowloris", "iotbruteforce", "iotmitm",
             "iotevasion", "iotc2beac", "iotexfil", "iottlsssl"]

# Some classes sit in a narrow region of feature space (slowloris): the same
# noise that gives others a nice spread knocks them straight out of class, so
# they get a gentler perturbation scale.
PERTURB_SCALE = {"iotslowloris": 0.35}

MAX_CONF = 0.95
# (lo, hi, share, must_be_target)
BINS = [
    (0.80, MAX_CONF, 0.65, True),
    (0.50, 0.80, 0.20, True),
    (0.30, 0.50, 0.08, True),
    (0.00, 0.30, 0.07, False),
]
BATCH = 4096
MAX_BATCHES = 120

rng = np.random.default_rng(20261118)
ALL = ["benign"] + SCENARIOS
PROFILES = {}
GMMS = {}


def load_all():
    import joblib
    for s in ALL:
        PROFILES[s] = g.load_profile(s)
        GMMS[s] = joblib.load(os.path.join(g.PROFILE_DIR, s + ".gmm.pkl"))


def sample(s, n):
    """gen_testcase.sample_rows with the GMM cached (it reloads per call)."""
    prof, gmm = PROFILES[s], GMMS[s]
    z, _ = gmm.sample(n)
    z = z[rng.permutation(n)]
    x = z * np.asarray(prof["sd"]) + np.asarray(prof["mu"])
    return np.clip(x, np.asarray(prof["min"]), np.asarray(prof["max"]))


def perturb(scenario, n):
    """Dataset-shaped rows for `scenario`, each perturbed by its own strength.

    mode A (75%): jitter + optional blend toward benign   -> 0.30-0.95 range
    mode B (25%): 3-way mixture target/other-attack/benign -> ambiguous, 0.1-0.5
    """
    prof = PROFILES[scenario]
    x = sample(scenario, n)
    d = x.shape[1]
    # Skew toward light perturbation so the 0.80-0.95 bin fills for every class.
    k = rng.uniform(0.0, 1.0, size=(n, 1)) ** 1.5 * PERTURB_SCALE.get(scenario, 1.0)
    x = x * np.exp(rng.normal(0.0, 1.0, size=(n, d)) * (0.05 + 0.55 * k))
    xb = sample("benign", n)
    blend = rng.uniform(size=(n, 1)) < 0.5
    alpha = np.where(blend, 0.6 * k, 0.0)
    x = (1.0 - alpha) * x + alpha * xb

    # Mode B: mix with a random other attack class + benign (Dirichlet weights).
    mix = rng.uniform(size=n) < 0.25 * PERTURB_SCALE.get(scenario, 1.0)
    if mix.any():
        m = int(mix.sum())
        others = [s for s in SCENARIOS if s != scenario]
        other = others[rng.integers(len(others))]
        xo = sample(other, m)
        w = rng.dirichlet([2.0, 1.5, 1.5], size=m)
        x[mix] = w[:, :1] * x[mix] + w[:, 1:2] * xo + w[:, 2:3] * xb[mix]

    x = np.clip(x, GLO, GHI)
    for j, is_int in enumerate(prof["is_int"]):
        if is_int:
            x[:, j] = np.round(x[:, j])
    x[x < 0] = 0.0
    fd = IOT_FEATURE_COLS.index("Flow Duration")
    x[:, fd] = np.maximum(x[:, fd], 1.0)
    return x


def build(scenario, model, le, order):
    prof = PROFILES[scenario]
    label = prof["label"]
    quotas = [int(round(ROWS * b[2])) for b in BINS]
    quotas[0] += ROWS - sum(quotas)
    kept = [[] for _ in BINS]
    kept_conf = [[] for _ in BINS]

    for _ in range(MAX_BATCHES):
        if all(sum(len(a) for a in kept[i]) >= quotas[i] for i in range(len(BINS))):
            break
        x = perturb(scenario, BATCH)
        df = pd.DataFrame(x, columns=IOT_FEATURE_COLS)[order]
        proba = model.predict_proba(df)
        top = proba.max(axis=1)
        pred = le.inverse_transform(proba.argmax(axis=1))
        for i, (lo, hi, _share, must) in enumerate(BINS):
            need = quotas[i] - sum(len(a) for a in kept[i])
            if need <= 0:
                continue
            mask = (top >= lo) & (top < hi) if i else (top >= lo) & (top <= hi)
            if must:
                mask &= (pred == label)
            idx = np.flatnonzero(mask)[:need]
            if idx.size:
                kept[i].append(x[idx])
                kept_conf[i].append(top[idx])

    parts = [np.vstack(k) for k in kept if k]
    confs = np.concatenate([np.concatenate(c) for c in kept_conf if c])
    xs = np.vstack(parts)
    perm = rng.permutation(xs.shape[0])
    xs, confs = xs[perm], confs[perm]

    rows = g.to_raw_rows(xs, prof)
    with open(os.path.join(OUT_DIR, scenario + ".csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(RAW_COLUMNS)
        w.writerows(rows)

    got = [int(sum(len(a) for a in kept[i])) for i in range(len(BINS))]
    return {
        "label": label,
        "rows": int(xs.shape[0]),
        "bins": {"%.2f-%.2f" % (b[0], b[1]): {"quota": q, "got": n}
                 for b, q, n in zip(BINS, quotas, got)},
        "conf_min": round(float(confs.min()), 4),
        "conf_mean": round(float(confs.mean()), 4),
        "conf_max": round(float(confs.max()), 4),
    }


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    model, le = g.load_model()
    order = list(model.feature_names_in_)
    load_all()
    global GLO, GHI
    GLO = np.min([PROFILES[s]["min"] for s in ALL], axis=0)
    GHI = np.max([PROFILES[s]["max"] for s in ALL], axis=0)
    report = {}
    rpath = os.path.join(OUT_DIR, "report.json")
    if ONLY and os.path.isfile(rpath):
        with open(rpath, "r", encoding="utf-8") as f:
            report = json.load(f)
    for s in (ONLY or SCENARIOS):
        r = build(s, model, le, order)
        report[s] = r
        bins = "  ".join("%s:%d/%d" % (k, v["got"], v["quota"]) for k, v in r["bins"].items())
        print("%-14s %-12s rows=%4d conf[min=%.3f mean=%.3f max=%.3f]  %s"
              % (s, r["label"], r["rows"], r["conf_min"], r["conf_mean"], r["conf_max"], bins))
    with open(rpath, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)


if __name__ == "__main__":
    main()
