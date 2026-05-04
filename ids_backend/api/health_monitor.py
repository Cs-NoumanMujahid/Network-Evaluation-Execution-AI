import platform
import subprocess
import time
import requests
from apscheduler.schedulers.background import BackgroundScheduler
from django.utils import timezone
from .models import RegisteredDevice, RegisteredSite, TargetHealth

scheduler = BackgroundScheduler()
started = False


def ping_website(site):
    start = time.time()
    try:
        response = requests.get(f"http://{site.domain}", timeout=5)
        elapsed = (time.time() - start) * 1000
        TargetHealth.objects.create(
            target_type='website',
            site=site,
            is_reachable=response.ok,
            response_time_ms=elapsed,
            status_code=response.status_code,
        )
    except requests.RequestException:
        TargetHealth.objects.create(
            target_type='website',
            site=site,
            is_reachable=False,
            response_time_ms=None,
            status_code=None,
        )


def ping_device(device):
    ping_flag = '-n' if platform.system().lower() == 'windows' else '-c'
    start = time.time()
    try:
        rc = subprocess.call(
            ['ping', ping_flag, '1', device.ip_address],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        elapsed = (time.time() - start) * 1000
        reachable = rc == 0
    except Exception:
        elapsed = None
        reachable = False

    TargetHealth.objects.create(
        target_type='device',
        device=device,
        is_reachable=reachable,
        response_time_ms=elapsed,
        status_code=None,
    )
    if reachable:
        device.last_seen = timezone.now()
        device.save(update_fields=['last_seen'])


def check_websites():
    for site in RegisteredSite.objects.filter(is_active=True):
        ping_website(site)


def check_devices():
    for device in RegisteredDevice.objects.filter(is_active=True):
        ping_device(device)


def start_health_monitor():
    global started
    if started:
        return
    scheduler.add_job(check_websites, 'interval', seconds=30, id='website-health', replace_existing=True)
    scheduler.add_job(check_devices, 'interval', seconds=60, id='device-health', replace_existing=True)
    scheduler.start()
    started = True
