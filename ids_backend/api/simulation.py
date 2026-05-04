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
    command = ATTACK_COMMANDS.get(attack_type)
    if not command:
        return None

    with process_lock:
        if current_process and current_process.poll() is None:
            return current_process
        current_process = subprocess.Popen(command)
        return current_process


def stop_attack_process():
    global current_process
    with process_lock:
        if not current_process:
            return False
        if current_process.poll() is None:
            current_process.kill()
        current_process = None
        return True


def is_attack_running():
    with process_lock:
        return bool(current_process and current_process.poll() is None)
