import subprocess
import threading

ATTACK_COMMANDS = {
    'portscan': ['docker', 'exec', 'kali-attacker', 'sh', '/attacks/portscan_attack.sh'],
    'sqli': ['docker', 'exec', 'kali-attacker', 'sh', '/attacks/sqli_attack.sh'],
    'bruteforce': ['docker', 'exec', 'kali-attacker', 'sh', '/attacks/bruteforce_web_attack.sh'],
    'dos': ['docker', 'exec', 'kali-attacker', 'sh', '/attacks/dos_attack.sh'],
    'xss': ['docker', 'exec', 'kali-attacker', 'sh', '/attacks/xss_attack.sh'],
}

current_process = None
process_lock = threading.Lock()


def start_attack_process(attack_type):
    global current_process
    raw = str(attack_type or '').lower().replace(' ', '').replace('_', '').replace('-', '')
    if 'portscan' in raw or 'nmap' in raw:
        clean_key = 'portscan'
    elif 'sql' in raw:
        clean_key = 'sqli'
    elif 'brute' in raw:
        clean_key = 'bruteforce'
    elif 'dos' in raw or 'hping' in raw:
        clean_key = 'dos'
    elif 'xss' in raw:
        clean_key = 'xss'
    else:
        clean_key = raw

    command = ATTACK_COMMANDS.get(clean_key)
    if not command:
        print(f"Unknown attack type: '{attack_type}' (normalized: '{clean_key}')")
        return None

    with process_lock:
        if current_process and current_process.poll() is None:
            return current_process
        try:
            current_process = subprocess.Popen(command)
            print(f"Started attack command: {command}")
        except Exception as e:
            print(f"Error launching attack process: {e}")
        return current_process


def stop_attack_process():
    global current_process
    with process_lock:
        if current_process:
            if current_process.poll() is None:
                current_process.kill()
            current_process = None
        
        # Kill any orphaned processes inside the kali-attacker container
        try:
            subprocess.run(['docker', 'exec', 'kali-attacker', 'pkill', '-f', 'attack.sh'], capture_output=True, timeout=3)
            subprocess.run(['docker', 'exec', 'kali-attacker', 'pkill', '-f', 'nmap'], capture_output=True, timeout=3)
            subprocess.run(['docker', 'exec', 'kali-attacker', 'pkill', '-f', 'hydra'], capture_output=True, timeout=3)
            subprocess.run(['docker', 'exec', 'kali-attacker', 'pkill', '-f', 'hping3'], capture_output=True, timeout=3)
            subprocess.run(['docker', 'exec', 'kali-attacker', 'pkill', '-f', 'sqlmap'], capture_output=True, timeout=3)
        except Exception as e:
            print(f"Error killing docker attack processes: {e}")
        return True


def is_attack_running():
    with process_lock:
        return bool(current_process and current_process.poll() is None)
