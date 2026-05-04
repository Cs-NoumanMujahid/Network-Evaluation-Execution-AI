import pandas as pd
import numpy as np
import pickle
import os
import json
from sklearn.model_selection import train_test_split

# ── CONFIG ────────────────────────────────────────────────────────────────────
BASE_DIR = r"C:\Users\Nouman\nexa_dvwa"
SCALER_PATH = r"C:\Users\Nouman\IDS_Preprocessing\scaler.pkl"
LABEL_MAPPING_PATH = r"C:\Users\Nouman\IDS_Preprocessing\label_mapping.json"
OUTPUT_DIR = r"C:\Users\Nouman\nexa_dvwa\real_traffic_processed"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── IPs ───────────────────────────────────────────────────────────────────────
ATTACKER_IP = "172.20.0.200"
BENIGN_IPS = ["172.20.0.101", "172.20.0.102", "172.20.0.103"]

# ── FOLDER TO LABEL MAPPING ───────────────────────────────────────────────────
FOLDER_LABEL_MAP = {
    "flows_sqli":        13,  # SQL-Injection
    "flows_bruteforce":  2,   # BruteForce-Web
    "flows_xss":         3,   # BruteForce-XSS
    "flows_dos":         8,   # DoS-Slowloris
    "flows_portscan":    12,  # PortScan
}
LABEL_BENIGN = 0

# ── 66 FEATURE COLUMNS ───────────────────────────────────────────────────────
FEATURE_COLS = [
    "Dst Port", "Protocol", "Flow Duration", "Flow Bytes/s", "Flow Packets/s",
    "Fwd Packets/s", "Bwd Packets/s", "Total Fwd Packet", "Total Bwd packets",
    "Total Length of Fwd Packet", "Total Length of Bwd Packet",
    "Fwd Packet Length Max", "Fwd Packet Length Min", "Fwd Packet Length Mean",
    "Fwd Packet Length Std", "Bwd Packet Length Max", "Bwd Packet Length Min",
    "Bwd Packet Length Mean", "Bwd Packet Length Std", "Packet Length Max",
    "Packet Length Min", "Packet Length Mean", "Packet Length Std",
    "Packet Length Variance", "Fwd Header Length", "Bwd Header Length",
    "Fwd Seg Size Min", "Fwd Act Data Pkts", "Flow IAT Mean", "Flow IAT Max",
    "Flow IAT Min", "Flow IAT Std", "Fwd IAT Total", "Fwd IAT Max", "Fwd IAT Min",
    "Fwd IAT Mean", "Fwd IAT Std", "Bwd IAT Total", "Bwd IAT Max", "Bwd IAT Min",
    "Bwd IAT Mean", "Bwd IAT Std", "FIN Flag Count", "SYN Flag Count",
    "RST Flag Count", "PSH Flag Count", "ACK Flag Count", "URG Flag Count",
    "ECE Flag Count", "Down/Up Ratio", "Average Packet Size",
    "Fwd Segment Size Avg", "Bwd Segment Size Avg",
    "Subflow Fwd Packets", "Subflow Fwd Bytes", "Subflow Bwd Packets",
    "Subflow Bwd Bytes", "FWD Init Win Bytes", "Bwd Init Win Bytes",
    "Active Mean", "Active Max", "Active Min",
    "Idle Mean", "Idle Std", "Idle Max", "Idle Min"
]

DROP_COLS = [
    'Flow ID', 'Src IP', 'Src Port', 'Dst IP', 'Timestamp', 'Label',
    'Bwd URG Flags', 'Bwd Bulk Rate Avg', 'Bwd Packet/Bulk Avg',
    'Bwd Bytes/Bulk Avg', 'Fwd Bulk Rate Avg', 'Fwd Packet/Bulk Avg',
    'Bwd PSH Flags', 'Fwd Bytes/Bulk Avg', 'CWR Flag Count',
    'Fwd URG Flags', 'Active Std', 'Fwd PSH Flags'
]

# ── PROCESS ONE FOLDER ────────────────────────────────────────────────────────
def process_folder(folder_name, attack_label):
    folder_path = os.path.join(BASE_DIR, folder_name)
    if not os.path.exists(folder_path):
        print(f"  Folder not found: {folder_path}")
        return None, None

    csv_files = [f for f in os.listdir(folder_path) if f.endswith('.csv')]
    print(f"\nProcessing {folder_name} ({len(csv_files)} files) → attack label {attack_label}")

    all_dfs = []
    for fname in sorted(csv_files):
        fpath = os.path.join(folder_path, fname)
        try:
            df = pd.read_csv(fpath, low_memory=False)
            df.columns = df.columns.str.strip()

            if 'Src IP' not in df.columns:
                print(f"  Skipping {fname} — no Src IP")
                continue

            # Label by source IP
            def assign_label(src_ip):
                src_ip = str(src_ip).strip()
                if src_ip in BENIGN_IPS:
                    return LABEL_BENIGN
                elif src_ip == ATTACKER_IP:
                    return attack_label
                else:
                    return -1

            df['Label_Numeric'] = df['Src IP'].apply(assign_label)
            df = df[df['Label_Numeric'] != -1]

            if len(df) == 0:
                continue

            # Drop columns
            df.drop(columns=[c for c in DROP_COLS if c in df.columns], inplace=True)

            # Check features
            missing = [c for c in FEATURE_COLS if c not in df.columns]
            if missing:
                print(f"  Skipping {fname} — missing: {missing[:3]}")
                continue

            df = df[FEATURE_COLS + ['Label_Numeric']]

            # Clean
            df = df[(df['Flow Duration'] > 0) &
                    (df['Flow Bytes/s'] >= 0) &
                    (df['Flow Packets/s'] >= 0)]
            df['FWD Init Win Bytes'] = df['FWD Init Win Bytes'].replace(-1, 0)
            df['Bwd Init Win Bytes'] = df['Bwd Init Win Bytes'].replace(-1, 0)
            df.replace([np.inf, -np.inf], np.nan, inplace=True)
            df.dropna(inplace=True)

            for col in FEATURE_COLS:
                if df[col].dtype == 'object':
                    df[col] = pd.to_numeric(df[col], errors='coerce')
            df.dropna(inplace=True)

            all_dfs.append(df)

        except Exception as e:
            print(f"  Error {fname}: {e}")

    if not all_dfs:
        print(f"  No data in {folder_name}")
        return None, None

    combined = pd.concat(all_dfs, ignore_index=True)
    combined.drop_duplicates(inplace=True)

    X = combined[FEATURE_COLS].values
    y = combined['Label_Numeric'].values
    return X, y


# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    print("Loading scaler...")
    with open(SCALER_PATH, 'rb') as f:
        scaler = pickle.load(f)

    with open(LABEL_MAPPING_PATH, 'r') as f:
        label_mapping = json.load(f)

    X_all, y_all = [], []

    for folder_name, attack_label in FOLDER_LABEL_MAP.items():
        X, y = process_folder(folder_name, attack_label)
        if X is not None:
            X_all.append(X)
            y_all.append(y)

    X_combined = np.concatenate(X_all)
    y_combined = np.concatenate(y_all)

    print(f"\nTotal rows before scaling: {len(X_combined)}")

    # ── AUDIT ─────────────────────────────────────────────────────────────────
    label_name_map = {
        0: 'Benign',
        2: 'BruteForce-Web',
        3: 'BruteForce-XSS',
        8: 'DoS-Slowloris',
        12: 'PortScan',
        13: 'SQL-Injection'
    }
    targets = {
        0: 'N/A',
        13: 1000,
        2: 500,
        3: 700,
        12: 300,
        8: 300
    }

    print("\n" + "="*55)
    print("FLOW COUNT AUDIT PER CLASS:")
    print("="*55)
    unique, counts = np.unique(y_combined, return_counts=True)
    count_dict = dict(zip(unique, counts))
    for label_id, name in label_name_map.items():
        count = count_dict.get(label_id, 0)
        target = targets[label_id]
        status = ''
        if target != 'N/A':
            status = '✓ MET' if count >= target else f'✗ NEED {target - count} MORE'
        print(f"  {name:<20} {count:>7} flows   target: {target}  {status}")
    print("="*55)

    # ── SCALE ─────────────────────────────────────────────────────────────────
    print("\nScaling...")
    X_scaled = scaler.transform(X_combined)

    # ── SPLIT ─────────────────────────────────────────────────────────────────
    print("Splitting 80/20...")
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_combined, test_size=0.2, random_state=42, stratify=y_combined
    )

    print(f"  X_real_train: {X_train.shape}")
    print(f"  X_real_test:  {X_test.shape}")

    # ── SAVE ──────────────────────────────────────────────────────────────────
    print(f"\nSaving to {OUTPUT_DIR}...")
    np.save(os.path.join(OUTPUT_DIR, 'X_real_train_diverse.npy'), X_train)
    np.save(os.path.join(OUTPUT_DIR, 'X_real_test_diverse.npy'), X_test)
    np.save(os.path.join(OUTPUT_DIR, 'y_real_train_diverse.npy'), y_train)
    np.save(os.path.join(OUTPUT_DIR, 'y_real_test_diverse.npy'), y_test)

    print("\nDone! Files saved:")
    print(f"  X_real_train_diverse.npy  {X_train.shape}")
    print(f"  X_real_test_diverse.npy   {X_test.shape}")
    print(f"  y_real_train_diverse.npy  {y_train.shape}")
    print(f"  y_real_test_diverse.npy   {y_test.shape}")


if __name__ == "__main__":
    main()