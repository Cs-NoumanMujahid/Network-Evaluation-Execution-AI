# 🛡️ NEXA IDS — Nouman's Guide to Your Success

Welcome to the official deployment and operations guide for the NEXA Watchtower IDS. This document outlines the steps required to set up the environment, run the pipeline, and perform security demonstrations.

---

## 🏗️ Prerequisites
Before starting, ensure you have the following installed on your Windows machine:
1. **Docker Desktop**: [Download here](https://www.docker.com/products/docker-desktop/)
2. **XAMPP**: Also needed for local DVWA database management (if not using the Docker MySQL exclusively).
3. **Node.js & npm**: Required for the frontend.
4. **Python 3.10+**: Required for the backend.

### Docker Initialization
* Install Docker Desktop and restart your computer.
* Open Docker Desktop and wait for the **"Engine running"** indicator in the bottom left.
* Verify installation in PowerShell:
  ```powershell
  docker --version
  docker-compose --version
  ```

> [!TIP]
> Everything else (Python, Java, Kafka, Kali Linux, DVWA, CICFlowMeter) runs inside Docker automatically.

---

## 🚀 First-Time Setup

### Step 1 — Clone the Repository
```powershell
git clone <repo-link>
cd nexa_dvwa
```

### Step 2 — Add CICFlowMeter (Manual)
> [!IMPORTANT]
> The `cicflowmeter` folder is not included in the Git repository due to its size and binary dependencies.
> 1. Download the `cicflowmeter` folder (provided via WhatsApp/External link).
> 2. Copy and paste it into the root of the `nexa_dvwa` directory.

### Step 3 — Create Required Folders
These files are already given in the project directory. If not present, create them:
```powershell
mkdir flows
mkdir pcaps
mkdir kali_attacks
```

### Step 4 — Install Attack Tools on Kali (First Time)
First start the containers:
```powershell
docker-compose up -d
```
*Wait ~30 seconds for all services to initialize.*

### Step 5 — Set up DVWA Database
1. Open your browser and go to: [http://localhost:8080/dvwa/setup.php](http://localhost:8080/dvwa/setup.php)
2. Click the **"Create / Reset Database"** button.
3. Once redirected to the login page, the database is ready.

### Step 6 — Configure DVWA Security
1. Login at [http://localhost:8080/dvwa/login.php](http://localhost:8080/dvwa/login.php)
   * **Username**: `admin`
   * **Password**: `password`
2. Go to **DVWA Security**.
3. Set the level to **Low** and click **Submit**.

---

## 🖥️ Running the Backend (Django/Daphne)

The backend handles alert ingestion and provides the WebSocket feed for the dashboard.

1. **Navigate to the backend directory**:
   ```powershell
   cd ids_backend
   ```
2. **Install Dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```
3. **Run the Server**:
   ```powershell
   python -m daphne ids_backend.asgi:application
   ```

---

## 🎨 Running the Frontend (Next.js)

The frontend provides the visual NEXA Watchtower Dashboard.

1. **Navigate to the frontend directory**:
   ```powershell
   cd nexa_frontend
   ```
2. **Install Dependencies**:
   ```powershell
   npm install
   ```
3. **Start Development Server**:
   ```powershell
   npm run dev
   ```
4. **Access the Dashboard**: Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔄 Starting the System (Every Time)

1. **Start Docker Pipeline**:
   ```powershell
   docker-compose up -d
   ```
2. **Verify Containers**:
   ```powershell
   docker ps
   ```
   You should see these containers running: `dvwa-web`, `dvwa-db`, `traffic-sniffer`, `cicflowmeter`, `kafka`, `kafka-producer`, `ml-consumer`, `kali-attacker`, `client1`, `client2`, `client3`, etc.

---

## ✅ Verifying the System is Working

### 1. Check ML Consumer
Verify it is receiving and classifying traffic:
```powershell
docker logs ml-consumer -f
```
Expected output:
```text
Loading CNN model...
Loading scaler...
Loading label mapping...
All artifacts loaded! Ready to consume.
Connected! Waiting for messages...

[BATCH] Flows: 20 | Benign: 20 | Alerts: 0
All flows benign
```
*Press Ctrl+C to stop watching logs.*

### 2. Check Infrastructure
* **Kafka Health**: `docker logs kafka --tail 20`
* **CICFlowMeter**: `docker logs cicflowmeter --tail 20`

---

## 🕵️ Running Attacks (Testing & Demo)

### 1. Get Fresh Session
```powershell
docker exec -it kali-attacker sh /attacks/get_session.sh
```
*Copy the `PHPSESSID` value and update it in your attack scripts inside the `kali_attacks/` folder.*

### 2. Run Individual Attacks
```powershell
# Port Scan
docker exec -it kali-attacker sh /attacks/portscan_attack.sh

# SQL Injection
docker exec -it kali-attacker sh /attacks/sqli_attack.sh

# Brute Force
docker exec -it kali-attacker sh /attacks/bruteforce_web_attack.sh

# DoS
docker exec -it kali-attacker sh /attacks/dos_attack.sh

# XSS
docker exec -it kali-attacker sh /attacks/xss_attack.sh
```

### 3. Run All Attacks Simultaneously
```powershell
docker exec -it kali-attacker sh /attacks/run_all_attacks.sh
```

---

## 🛑 Stopping the System
```powershell
docker-compose down
```
To stop and remove all data (full reset):
```powershell
docker-compose down -v
```

---

## 🛠️ Troubleshooting

*   **Containers not starting**: Run `docker-compose down` followed by `docker-compose up -d --force-recreate`.
*   **"Backend not reachable"**: Ensure the Django server is running on port 8000 *before* or alongside the Docker pipeline.
*   **Tools not found on kali-attacker**:
    ```powershell
    docker exec -it kali-attacker apt-get install -y nmap sqlmap hydra slowhttptest curl medusa hping3 nikto
    ```
*   **Missing Folders**: Run `mkdir flows pcaps` in the root.
*   **DVWA Errors**: Go to the setup page and click "Create / Reset Database" again.
*   **Kafka Health**: Restart the pipeline components:
    ```powershell
    docker-compose restart kafka kafka-producer ml-consumer
    ```

---

## 🌐 Network Map

| Container | IP Address | Purpose |
| :--- | :--- | :--- |
| `dvwa-web` | `172.20.0.10` | Target website |
| `dvwa-db` | `172.20.0.11` | MySQL database |
| `client1-3` | `172.20.0.101-103` | Benign traffic generators |
| `kali-attacker` | `172.20.0.200` | Attack container |

---

## ⚠️ Important Notes
*   **Reset**: Run `docker-compose down -v` to perform a full reset (wipes Kafka data).
*   **Storage**: Safe to delete contents of `flows/` and `pcaps/` if disk space is low.
*   **Session**: Always refresh `PHPSESSID` before a demo to ensure attacks are accepted by DVWA.
