import os
import io
import json
import pickle
import time
import threading
import numpy as np
import pandas as pd
import requests
from datetime import datetime, timezone, timedelta
from kafka import KafkaConsumer
from tensorflow.keras.models import load_model

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka:29092")
TOPIC = os.getenv("KAFKA_TOPIC", "flows")
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.80"))
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
SOURCE_TYPE = os.getenv("SOURCE_TYPE", "website")
REGISTERED_ID = os.getenv("REGISTERED_ID", "1")
HEALTH_INTERVAL = int(os.getenv("HEALTH_INTERVAL", "10"))

# ── CONFIG ────────────────────────────────────────────────────────────────────

WHITELIST_IPS = {
    "172.20.0.101",
    "172.20.0.102",
    "172.20.0.103"
}

RECOMMENDED_ACTIONS = {
    "PortScan": "Block source IP in firewall. Review open ports on target. Disable unnecessary services.",
    "SQL-Injection": "Review and sanitize all database queries. Enable WAF rules. Check for unauthorized data access.",
    "BruteForce-Web": "Implement rate limiting on login endpoint. Enable account lockout after 5 failed attempts. Consider 2FA.",
    "DoS-Slowloris": "Configure connection timeout limits on web server. Enable rate limiting. Consider CDN protection.",
    "DDoS": "Enable DDoS protection. Contact ISP. Consider CDN like Cloudflare.",
    "BruteForce-XSS": "Implement Content Security Policy headers. Sanitize all user inputs. Enable XSS filtering.",
    "Bot": "Implement CAPTCHA. Block suspicious user agents. Enable bot protection.",
    "Infiltration": "Isolate affected system immediately. Review access logs. Change all credentials.",
    "FTP-BruteForce": "Disable FTP if not needed. Use SFTP instead. Implement rate limiting on FTP login.",
    "SSH-BruteForce": "Disable password authentication. Use SSH keys only. Change default SSH port.",
    "DoS-Hulk": "Enable rate limiting. Configure web server connection limits. Consider CDN protection.",
    "DoS-GoldenEye": "Enable rate limiting. Configure connection timeouts. Block suspicious user agents.",
    "DoS-SlowHTTPTest": "Configure minimum data rate limits. Enable connection timeouts on web server.",
    "Heartbleed": "Update OpenSSL immediately. Revoke and reissue all SSL certificates.",
}

RAW_COLUMNS = [
    "Flow ID", "Src IP", "Src Port", "Dst IP", "Dst Port", "Protocol",
    "Timestamp", "Flow Duration", "Total Fwd Packet", "Total Bwd packets",
    "Total Length of Fwd Packet", "Total Length of Bwd Packet",
    "Fwd Packet Length Max", "Fwd Packet Length Min", "Fwd Packet Length Mean",
    "Fwd Packet Length Std", "Bwd Packet Length Max", "Bwd Packet Length Min",
    "Bwd Packet Length Mean", "Bwd Packet Length Std", "Flow Bytes/s",
    "Flow Packets/s", "Flow IAT Mean", "Flow IAT Std", "Flow IAT Max",
    "Flow IAT Min", "Fwd IAT Total", "Fwd IAT Mean", "Fwd IAT Std",
    "Fwd IAT Max", "Fwd IAT Min", "Bwd IAT Total", "Bwd IAT Mean",
    "Bwd IAT Std", "Bwd IAT Max", "Bwd IAT Min", "Fwd PSH Flags",
    "Bwd PSH Flags", "Fwd URG Flags", "Bwd URG Flags", "Fwd Header Length",
    "Bwd Header Length", "Fwd Packets/s", "Bwd Packets/s", "Packet Length Min",
    "Packet Length Max", "Packet Length Mean", "Packet Length Std",
    "Packet Length Variance", "FIN Flag Count", "SYN Flag Count",
    "RST Flag Count", "PSH Flag Count", "ACK Flag Count", "URG Flag Count",
    "CWR Flag Count", "ECE Flag Count", "Down/Up Ratio", "Average Packet Size",
    "Fwd Segment Size Avg", "Bwd Segment Size Avg", "Fwd Bytes/Bulk Avg",
    "Fwd Packet/Bulk Avg", "Fwd Bulk Rate Avg", "Bwd Bytes/Bulk Avg",
    "Bwd Packet/Bulk Avg", "Bwd Bulk Rate Avg", "Subflow Fwd Packets",
    "Subflow Fwd Bytes", "Subflow Bwd Packets", "Subflow Bwd Bytes",
    "FWD Init Win Bytes", "Bwd Init Win Bytes", "Fwd Act Data Pkts",
    "Fwd Seg Size Min", "Active Mean", "Active Std", "Active Max",
    "Active Min", "Idle Mean", "Idle Std", "Idle Max", "Idle Min", "Label"
]

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
    "Fwd Segment Size Avg", "Bwd Segment Size Avg", "Subflow Fwd Packets",
    "Subflow Fwd Bytes", "Subflow Bwd Packets", "Subflow Bwd Bytes",
    "FWD Init Win Bytes", "Bwd Init Win Bytes", "Active Mean", "Active Max",
    "Active Min", "Idle Mean", "Idle Std", "Idle Max", "Idle Min"
]

print("Loading CNN model...")
model = load_model("/app/model/cnn_finetuned_v2.keras")

print("Loading scaler...")
with open("/app/model/scaler.pkl", "rb") as f:
    scaler = pickle.load(f)

print("Loading label mapping...")
with open("/app/model/label_mapping.json", "r") as f:
    label_mapping = json.load(f)

print(f"Source type: {SOURCE_TYPE}")
print(f"Backend URL: {BACKEND_URL}")
print(f"Confidence threshold: {CONFIDENCE_THRESHOLD}")
print("All artifacts loaded! Ready to consume.")

metrics = {
    "flows_processed": 0,
    "alerts_triggered": 0,
    "last_batch_time": None,
    "start_time": datetime.now(timezone.utc).isoformat(),
    "last_fpm": 0,
    "last_apm": 0,
    "last_update_ts": 0
}

flow_history = []
alert_history = []

history_lock = threading.Lock()

def add_to_history(f_count, a_count):
    now = time.time()
    with history_lock:
        flow_history.append((now, f_count))
        alert_history.append((now, a_count))
        # Keep only last 60 seconds
        cutoff = now - 60
        while flow_history and flow_history[0][0] < cutoff:
            flow_history.pop(0)
        f_total = sum(count for ts, count in flow_history if ts >= cutoff)
        a_total = sum(count for ts, count in alert_history if ts >= cutoff)
        
        metrics["last_fpm"] = f_total
        metrics["last_apm"] = a_total
        metrics["last_update_ts"] = now

def get_rolling_metrics():
    # Return the last known rate (permanently sticky)
    return metrics["last_fpm"], metrics["last_apm"]

def get_severity(prediction, confidence):
    if prediction == "Benign":
        return "NORMAL"
    if confidence >= 0.95:
        return "CRITICAL"
    elif confidence >= 0.85:
        return "HIGH"
    elif confidence >= 0.80:
        return "MEDIUM"
    else:
        return "LOW"

def preprocess_batch(batch_str):
    try:
        rows = [line for line in batch_str.strip().split('\n') if line.strip()]
        if not rows:
            return None, None

        df_raw = pd.read_csv(
            io.StringIO('\n'.join(rows)),
            header=None,
            names=RAW_COLUMNS,
            low_memory=False
        )
        df_raw.columns = df_raw.columns.str.strip()

        metadata = df_raw[["Src IP", "Dst IP", "Dst Port", "Protocol",
                            "Timestamp", "Flow Duration", "Flow Bytes/s",
                            "Flow Packets/s", "Total Fwd Packet",
                            "Total Bwd packets"]].copy()

        # Clean
        df_raw = df_raw[
            (df_raw['Flow Duration'] > 0) &
            (df_raw['Flow Bytes/s'] >= 0) &
            (df_raw['Flow Packets/s'] >= 0)
        ]
        metadata = metadata.loc[df_raw.index]

        df_raw['FWD Init Win Bytes'] = pd.to_numeric(
            df_raw['FWD Init Win Bytes'], errors='coerce').replace(-1, 0)
        df_raw['Bwd Init Win Bytes'] = pd.to_numeric(
            df_raw['Bwd Init Win Bytes'], errors='coerce').replace(-1, 0)

        missing = [c for c in FEATURE_COLS if c not in df_raw.columns]
        if missing:
            print(f"WARNING: Missing columns: {missing}")
            return None, None

        df_features = df_raw[FEATURE_COLS].copy()

        for col in FEATURE_COLS:
            df_features[col] = pd.to_numeric(df_features[col], errors='coerce')

        df_features.replace([np.inf, -np.inf], np.nan, inplace=True)
        df_features.dropna(inplace=True)
        metadata = metadata.loc[df_features.index]

        if len(df_features) == 0:
            return None, None

        return df_features, metadata.reset_index(drop=True)

    except Exception as e:
        print(f"Preprocessing error: {e}")
        return None, None

def predict_batch(df_features, metadata):
    df = df_features[FEATURE_COLS]
    X = scaler.transform(df)
    X_cnn = X.reshape(X.shape[0], X.shape[1], 1)
    predictions = model.predict(X_cnn, verbose=0)
    class_indices = np.argmax(predictions, axis=1)
    confidences = np.max(predictions, axis=1)

    results = []
    now = datetime.now(timezone.utc)
    for i, (cls_idx, conf) in enumerate(zip(class_indices, confidences)):
        label = label_mapping[str(cls_idx)]
        
        # Get metadata for this flow
        meta = metadata.iloc[i] if i < len(metadata) else {}
        src_ip = meta.get("Src IP")
        dst_ip = meta.get("Dst IP")
        src_ip = str(src_ip).strip() if src_ip else None
        dst_ip = str(dst_ip).strip() if dst_ip else None
        
        flow_duration = float(meta.get("Flow Duration", 0))
        flow_packets_per_sec = float(meta.get("Flow Packets/s", 0))

        if src_ip in WHITELIST_IPS:
            label = "Benign"
            conf = 1.0

        if label == "DoS-Slowloris":
            if flow_duration < 5.0 or flow_packets_per_sec > 10.0:
                label = "Benign"
                conf = 1.0

        is_alert = label != "Benign" and float(conf) >= CONFIDENCE_THRESHOLD
        severity = get_severity(label, float(conf))

        dst_port = int(meta.get("Dst Port", 0))
        protocol = int(meta.get("Protocol", 0))
        flow_bytes_per_sec = float(meta.get("Flow Bytes/s", 0))
        total_fwd_packets = int(meta.get("Total Fwd Packet", 0))
        total_bwd_packets = int(meta.get("Total Bwd packets", 0))

        # Parse timestamp
        raw_ts = str(meta.get("Timestamp", ""))
        try:
            ts_dt = pd.to_datetime(raw_ts, utc=True)
            if (now - ts_dt).total_seconds() > 3600:
                ts = now.isoformat()
            else:
                ts = ts_dt.isoformat()
        except:
            ts = now.isoformat()

        result = {
            "timestamp": ts,
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "dst_port": dst_port,
            "protocol": protocol,
            "prediction": label,
            "confidence": round(float(conf), 4),
            "is_alert": is_alert,
            "severity": severity,
            "flow_duration": flow_duration,
            "flow_bytes_per_sec": round(flow_bytes_per_sec, 4),
            "flow_packets_per_sec": round(flow_packets_per_sec, 4),
            "total_fwd_packets": total_fwd_packets,
            "total_bwd_packets": total_bwd_packets,
            "source_type": SOURCE_TYPE,
            "registered_id": REGISTERED_ID,
            "recommended_action": RECOMMENDED_ACTIONS.get(label, "") if is_alert else ""
        }
        results.append(result)

    return results

def send_to_backend(results):
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/flows/ingest/",
            json={"flows": results},
            timeout=10
        )
        if response.status_code == 200:
            pass  # success
        else:
            print(f"Backend error: {response.status_code} — {response.text[:100]}")
    except requests.exceptions.ConnectionError:
        print("Backend not reachable — skipping this batch")
    except Exception as e:
        print(f"Send error: {e}")

def report_health():
    while True:
        try:
            fpm, apm = get_rolling_metrics()
            
            health_data = {
                "component": "ml-consumer",
                "status": True,
                "flows_processed": metrics["flows_processed"],
                "alerts_triggered": metrics["alerts_triggered"],
                "flows_per_minute": fpm,
                "alerts_per_minute": apm,
                "last_batch_time": metrics["last_batch_time"],
                "uptime_since": metrics["start_time"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            requests.post(
                f"{BACKEND_URL}/api/health/pipeline/",
                json=health_data,
                timeout=5
            )
        except Exception as e:
            print(f"Health report error: {e}")
        time.sleep(HEALTH_INTERVAL)

health_thread = threading.Thread(target=report_health, daemon=True)
health_thread.start()
print(f"Connecting to Kafka at {KAFKA_BROKER}...")

try:
    dynamic_group_id = f"ml-consumer-group-{int(time.time())}"
    
    consumer = KafkaConsumer(
        TOPIC,
        bootstrap_servers=KAFKA_BROKER,
        auto_offset_reset='latest',
        enable_auto_commit=True,
        group_id=dynamic_group_id,
        value_deserializer=lambda x: x.decode('utf-8')
    )
    print("Connected! Waiting for messages...")
except Exception as e:
    print(f"Critical Error: Failed to connect to Kafka: {e}")
    os._exit(1)

for message in consumer:
    batch_str = message.value

    df_features, metadata = preprocess_batch(batch_str)
    if df_features is None:
        print("Skipping batch — preprocessing failed")
        continue

    results = predict_batch(df_features, metadata)

    # Update metrics
    num_results = len(results)
    num_alerts = sum(1 for r in results if r["is_alert"])
    
    metrics["flows_processed"] += num_results
    metrics["alerts_triggered"] += num_alerts
    add_to_history(num_results, num_alerts)
    metrics["last_batch_time"] = datetime.now(timezone.utc).isoformat()

    alerts = [r for r in results if r["is_alert"]]
    benign = [r for r in results if not r["is_alert"]]
    print(f"\n[BATCH] Flows: {len(results)} | Benign: {len(benign)} | Alerts: {len(alerts)}")

    if alerts:
        print("ALERTS:")
        for alert in alerts:
            print(f"  → {alert['prediction']} "
                  f"(confidence: {alert['confidence']*100:.1f}%) "
                  f"| {alert['severity']} "
                  f"| {alert['src_ip']} → {alert['dst_ip']}")
    else:
        print("All flows benign")

    # Send to backend
    send_to_backend(results)