import asyncio
from datetime import timedelta
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.db.models import Count
from django.utils import timezone
from .models import FlowRecord, Incident, SimulationSession, SystemHealth


class DashboardConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add('dashboard', self.channel_name)
        await self.accept()
        self.push_task = asyncio.create_task(self.push_periodic())

    async def disconnect(self, close_code):
        if hasattr(self, 'push_task'):
            self.push_task.cancel()
        await self.channel_layer.group_discard('dashboard', self.channel_name)

    async def push_periodic(self):
        while True:
            try:
                payload = await self.get_dashboard_payload()
                await self.send_json(payload)
            except Exception as e:
                print(f"WS Dashboard Error: {e}")
            await asyncio.sleep(5)

    async def dashboard_broadcast(self, event):
        await self.send_json(event['payload'])

    @database_sync_to_async
    def get_dashboard_payload(self):
        total_flows = FlowRecord.objects.count()
        total_alerts = FlowRecord.objects.filter(is_alert=True).count()
        active_alerts = Incident.objects.filter(status='open').count()
        benign_flows = FlowRecord.objects.filter(prediction__iexact='Benign').count()
        efficiency = (benign_flows / total_flows * 100) if total_flows else 100
        
        health = SystemHealth.objects.first()
        is_recent = health.timestamp > timezone.now() - timedelta(minutes=2) if health else False
        status = (health.ml_consumer_status and is_recent) if health else False
        
        latest_qs = FlowRecord.objects.filter(is_alert=True).order_by('-timestamp')[:10]
        latest = []
        for flow in latest_qs:
            latest.append({
                'id': flow.id,
                'timestamp': flow.timestamp.isoformat(),
                'prediction': flow.prediction,
                'severity': flow.severity,
                'src_ip': flow.src_ip,
                'dst_ip': flow.dst_ip,
                'confidence': flow.confidence
            })

        return {
            'type': 'dashboard_update',
            'total_flows': total_flows,
            'total_alerts': total_alerts,
            'active_alerts': active_alerts,
            'detection_rate': round(efficiency, 2),
            'latest_alerts': latest,
            'pipeline_status': {
                'kafka': {'status': status},
                'ml_consumer': {'status': status},
                'cicflowmeter': {'status': status},
                'tcpdump': {'status': status},
                'flows_per_minute': health.flows_per_minute if health else 0,
                'alerts_per_minute': health.alerts_per_minute if health else 0,
            }
        }


class HealthConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add('health', self.channel_name)
        await self.accept()
        self.push_task = asyncio.create_task(self.push_periodic())

    async def disconnect(self, close_code):
        if hasattr(self, 'push_task'):
            self.push_task.cancel()
        await self.channel_layer.group_discard('health', self.channel_name)

    async def push_periodic(self):
        while True:
            try:
                await self.send_json(await self.get_health_payload())
            except Exception as e:
                print(f"WS Health Error: {e}")
            await asyncio.sleep(10)

    async def health_broadcast(self, event):
        await self.send_json(event['payload'])

    @database_sync_to_async
    def get_health_payload(self):
        health = SystemHealth.objects.first()
        if not health:
            return {
                'type': 'health_update',
                'kafka': False,
                'ml_consumer': False,
                'cicflowmeter': False,
                'tcpdump': False,
                'flows_per_minute': 0,
                'alerts_per_minute': 0,
            }
        is_recent = health.timestamp > timezone.now() - timedelta(minutes=2)
        status = health.ml_consumer_status and is_recent
        return {
            'type': 'health_update',
            'kafka': status,
            'ml_consumer': status,
            'cicflowmeter': status,
            'tcpdump': status,
            'flows_per_minute': health.flows_per_minute,
            'alerts_per_minute': health.alerts_per_minute,
        }


class SimulationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add('simulation', self.channel_name)
        await self.accept()
        self.push_task = asyncio.create_task(self.push_periodic())

    async def disconnect(self, close_code):
        if hasattr(self, 'push_task'):
            self.push_task.cancel()
        await self.channel_layer.group_discard('simulation', self.channel_name)

    async def push_periodic(self):
        while True:
            try:
                await self.send_json(await self.get_simulation_payload())
            except Exception as e:
                print(f"WS Simulation Error: {e}")
            await asyncio.sleep(2)

    async def simulation_broadcast(self, event):
        await self.send_json(event['payload'])

    @database_sync_to_async
    def get_simulation_payload(self):
        session = SimulationSession.objects.filter(status='running').first()
        if not session:
            return {'type': 'simulation_update', 'is_running': False}
        latest_flow_obj = (
            FlowRecord.objects.filter(timestamp__gte=session.started_at)
            .order_by('-timestamp')
            .first()
        )
        latest_flow = None
        if latest_flow_obj:
            latest_flow = {
                'id': latest_flow_obj.id,
                'src_ip': latest_flow_obj.src_ip,
                'dst_ip': latest_flow_obj.dst_ip,
                'prediction': latest_flow_obj.prediction,
                'confidence': latest_flow_obj.confidence,
                'severity': latest_flow_obj.severity,
                'timestamp': latest_flow_obj.timestamp.isoformat()
            }
        return {
            'type': 'simulation_update',
            'is_running': True,
            'latest_flow': latest_flow,
            'flows_generated': session.flows_generated,
            'alerts_triggered': session.alerts_triggered,
        }
