import threading
import os
import shutil
from datetime import timedelta
from django.db.models import Count, Max, Min, Q, Avg
from django.db.models.functions import TruncDate, TruncHour, TruncMinute
from django.utils import timezone
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import (
    FlowRecord,
    Incident,
    RegisteredDevice,
    RegisteredSite,
    SimulationSession,
    SystemHealth,
    TargetHealth,
)
from .serializers import (
    AlertSerializer,
    IncidentDetailSerializer,
    IncidentListSerializer,
    RegisteredDeviceSerializer,
    RegisteredSiteSerializer,
)
from .simulation import is_attack_running, start_attack_process, stop_attack_process


class LimitPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'limit'
    max_page_size = 50


def _source_type(request):
    return request.query_params.get('source_type')


def _send_group(group, event_type, payload):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(group, {'type': event_type, 'payload': payload})


class ScanResetView(APIView):
    def post(self, request):
        try:
            stop_attack_process()
            # Restart ML consumer containers to reset their offsets to 'latest' and discard stale queues
            subprocess.run(['docker', 'restart', 'ml-consumer'], capture_output=True, timeout=5)
            subprocess.run(['docker', 'restart', 'ml-consumer-iot'], capture_output=True, timeout=5)
        except Exception as e:
            print(f"[ScanReset] stop/restart processes warning: {e}")

        try:
            # 1. Clear database tables containing operational metrics/alerts
            FlowRecord.objects.all().delete()
            Incident.objects.all().delete()
            SystemHealth.objects.all().delete()
            TargetHealth.objects.all().delete()
            SimulationSession.objects.all().delete()
        except Exception as e:
            return Response(
                {"status": "error", "message": f"Database cleanup failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # 2. Clear pcaps and flows directories on filesystem
        pcaps_dir = settings.BASE_DIR.parent / 'pcaps'
        flows_dir = settings.BASE_DIR.parent / 'flows'

        for directory in [pcaps_dir, flows_dir]:
            if os.path.exists(directory):
                for item in os.listdir(directory):
                    item_path = os.path.join(directory, item)
                    try:
                        if os.path.isfile(item_path) or os.path.islink(item_path):
                            os.unlink(item_path)
                        elif os.path.isdir(item_path):
                            shutil.rmtree(item_path)
                    except Exception as e:
                        print(f"Failed to delete {item_path}: {e}")

        # 3. Broadcast empty state to active WebSocket dashboard client connections
        payload = {
            'type': 'dashboard_update',
            'total_flows': 0,
            'total_alerts': 0,
            'active_alerts': 0,
            'detection_rate': 0.0,
            'latest_alerts': [],
        }
        _send_group('dashboard', 'dashboard_broadcast', payload)
        _send_group('health', 'health_broadcast', {
            'type': 'health_update',
            'kafka': True,
            'ml_consumer': False,
            'cicflowmeter': True,
            'tcpdump': True,
            'flows_per_minute': 0,
            'alerts_per_minute': 0,
        })
        # Tell simulation page to clear its state
        _send_group('simulation', 'simulation_broadcast', {
            'type': 'simulation_reset',
        })

        return Response({"status": "ok"})


class FlowIngestView(APIView):
    def post(self, request):
        flows = request.data.get('flows', [])
        now = timezone.now()
        print(f"DEBUG: Ingesting flows at {now}")
        saved = 0
        alert_count = 0
        for item in flows:
            item['timestamp'] = now
            flow = FlowRecord.objects.create(**item)
            saved += 1
            if flow.is_alert:
                Incident.objects.create(
                    flow=flow,
                    attack_type=flow.prediction,
                    severity=flow.severity,
                    src_ip=flow.src_ip,
                    dst_ip=flow.dst_ip,
                    recommended_action=flow.recommended_action,
                )
                alert_count += 1

        total_flows = FlowRecord.objects.count()
        total_alerts = FlowRecord.objects.filter(is_alert=True).count()
        active_alerts = Incident.objects.filter(status='open').count()
        threat_rate = (total_alerts / total_flows * 100) if total_flows else 0.0
        payload = {
            'type': 'dashboard_update',
            'total_flows': total_flows,
            'total_alerts': total_alerts,
            'active_alerts': active_alerts,
            'detection_rate': round(threat_rate, 2),
            'latest_alerts': list(
                FlowRecord.objects.filter(is_alert=True).order_by('-timestamp')[:10].values(
                    'timestamp', 'prediction', 'severity', 'src_ip', 'dst_ip', 'confidence'
                )
            ),
        }
        _send_group('dashboard', 'dashboard_broadcast', payload)

        # Update active simulation session stats if one is running
        session = SimulationSession.objects.filter(status='running').first()
        if session:
            session.flows_generated += saved
            session.alerts_triggered += alert_count
            session.save(update_fields=['flows_generated', 'alerts_triggered'])

            # Send immediate live update to simulation websocket group
            latest_flow = None
            if saved > 0:
                # Get the last flow in this batch
                latest_flow = {
                    'id': flow.id,
                    'src_ip': flow.src_ip,
                    'dst_ip': flow.dst_ip,
                    'prediction': flow.prediction,
                    'confidence': flow.confidence,
                    'severity': flow.severity,
                    'timestamp': flow.timestamp.isoformat()
                }

            _send_group('simulation', 'simulation_broadcast', {
                'type': 'simulation_update',
                'is_running': True,
                'latest_flow': latest_flow,
                'flows_generated': session.flows_generated,
                'alerts_triggered': session.alerts_triggered,
            })

        return Response({'status': 'ok', 'saved': saved})


def _filter_by_date(request, qs, date_field='timestamp'):
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    if date_from:
        qs = qs.filter(**{f"{date_field}__date__gte": date_from})
    if date_to:
        qs = qs.filter(**{f"{date_field}__date__lte": date_to})
    return qs


class DashboardStatsView(APIView):
    def get(self, request):
        source_type = _source_type(request)
        qs = FlowRecord.objects.all()
        incident_qs = Incident.objects.all()
        if source_type:
            qs = qs.filter(source_type=source_type)
            incident_qs = incident_qs.filter(flow__source_type=source_type)
        
        qs = _filter_by_date(request, qs, 'timestamp')
        incident_qs = _filter_by_date(request, incident_qs, 'created_at')

        total_flows = qs.count()
        total_alerts = qs.filter(is_alert=True).count()
        active_alerts = incident_qs.filter(status='open').count()
        benign_flows = qs.filter(is_alert=False).count()
        threat_rate = (total_alerts / total_flows * 100) if total_flows else 0.0
        return Response(
            {
                'total_flows': total_flows,
                'total_alerts': total_alerts,
                'active_alerts': active_alerts,
                'detection_rate': round(threat_rate, 2),
                'benign_flows': benign_flows,
            }
        )


class AttackTypesView(APIView):
    def get(self, request):
        qs = FlowRecord.objects.all()
        source_type = _source_type(request)
        if source_type:
            qs = qs.filter(source_type=source_type)
        
        qs = _filter_by_date(request, qs, 'timestamp')
        rows = qs.values('prediction').annotate(count=Count('id')).order_by('-count')
        return Response({'labels': [x['prediction'] for x in rows], 'values': [x['count'] for x in rows]})


class SeverityDistributionView(APIView):
    def get(self, request):
        qs = FlowRecord.objects.all()
        source_type = _source_type(request)
        if source_type:
            qs = qs.filter(source_type=source_type)
        
        qs = _filter_by_date(request, qs, 'timestamp')
        rows = qs.values('severity').annotate(count=Count('id')).order_by('-count')
        return Response({'labels': [x['severity'] for x in rows], 'values': [x['count'] for x in rows]})


class TrafficVolumeView(APIView):
    def get(self, request):
        minutes = int(request.query_params.get('minutes', 60))
        now = timezone.now()
        start_time = now - timedelta(minutes=minutes)
        qs = FlowRecord.objects.filter(timestamp__gte=start_time)
        source_type = _source_type(request)
        if source_type:
            qs = qs.filter(source_type=source_type)

        grouped = qs.annotate(minute=TruncMinute('timestamp')).values('minute').annotate(
            flows=Count('id'),
            alerts=Count('id', filter=Q(is_alert=True)),
        ).order_by('minute')

        print(f"DEBUG: Found {len(grouped)} minutes in window {start_time} to {now}")
        if len(grouped) > 0:
            print(f"DEBUG: First minute: {grouped[0]['minute']}, Last minute: {grouped[len(grouped)-1]['minute']}")

        data_map = {x['minute'].strftime('%H:%M'): x for x in grouped}

        labels = []
        flows = []
        alerts = []
        for i in range(minutes + 1):
            ts = start_time + timedelta(minutes=i)
            label = ts.strftime('%H:%M')
            labels.append(label)
            if label in data_map:
                flows.append(data_map[label]['flows'])
                alerts.append(data_map[label]['alerts'])
            else:
                flows.append(0)
                alerts.append(0)

        return Response(
            {
                'labels': labels,
                'flows': flows,
                'alerts': alerts,
            }
        )


class TopAttackersView(APIView):
    def get(self, request):
        limit = int(request.query_params.get('limit', 5))
        qs = FlowRecord.objects.filter(is_alert=True)
        source_type = _source_type(request)
        if source_type:
            qs = qs.filter(source_type=source_type)
        
        qs = _filter_by_date(request, qs, 'timestamp')
        top = qs.values('src_ip').annotate(count=Count('id')).order_by('-count')[:limit]
        attackers = []
        for row in top:
            preds_qs = qs.filter(src_ip=row['src_ip'])
            preds = preds_qs.order_by().values_list('prediction', flat=True).distinct()
            attackers.append({'src_ip': row['src_ip'], 'count': row['count'], 'attack_types': list(preds)})
        return Response({'attackers': attackers})


class TopTargetsView(APIView):
    def get(self, request):
        limit = int(request.query_params.get('limit', 5))
        qs = FlowRecord.objects.filter(is_alert=True)
        source_type = _source_type(request)
        if source_type:
            qs = qs.filter(source_type=source_type)
        
        qs = _filter_by_date(request, qs, 'timestamp')
        top = qs.values('dst_ip').annotate(count=Count('id')).order_by('-count')[:limit]
        targets = []
        for row in top:
            target_qs = qs.filter(dst_ip=row['dst_ip'])
            preds = target_qs.order_by().values_list('prediction', flat=True).distinct()
            ports = target_qs.order_by().values_list('dst_port', flat=True).distinct()
            last_record = target_qs.order_by('-timestamp').first()
            last_seen = last_record.timestamp if last_record else None
            targets.append({
                'dst_ip': row['dst_ip'],
                'count': row['count'],
                'ports': list(ports),
                'attack_types': list(preds),
                'last_seen': last_seen,
            })
        return Response({'targets': targets})


class ThreatBreakdownView(APIView):
    def get(self, request):
        qs = FlowRecord.objects.all()
        source_type = _source_type(request)
        if source_type:
            qs = qs.filter(source_type=source_type)

        qs = _filter_by_date(request, qs, 'timestamp')
        total_threats = qs.filter(is_alert=True).count()

        rows = qs.filter(is_alert=True).values('prediction').annotate(
            count=Count('id'),
            avg_confidence=Avg('confidence')
        ).order_by('-count')

        breakdown = []
        for r in rows:
            prediction = r['prediction']
            count = r['count']
            avg_conf = r['avg_confidence'] or 0.0
            pct = (count / total_threats * 100) if total_threats else 0.0

            # Find peak activity time (hour of the day)
            peak_row = qs.filter(is_alert=True, prediction=prediction).annotate(
                hour=TruncHour('timestamp')
            ).values('hour').annotate(
                h_count=Count('id')
            ).order_by('-h_count').first()

            peak_time = "N/A"
            if peak_row and peak_row['hour']:
                peak_time = peak_row['hour'].strftime('%H:00')

            breakdown.append({
                'attack_type': prediction,
                'count': count,
                'percentage': round(pct, 2),
                'avg_confidence': round(avg_conf, 2),
                'peak_time': peak_time
            })

        return Response({'breakdown': breakdown})


class PipelineStatusView(APIView):
    def get(self, request):
        health = SystemHealth.objects.first()
        if not health:
            return Response(
                {
                    'kafka': {'status': False, 'label': 'Down'},
                    'ml_consumer': {'status': False, 'label': 'Down', 'last_seen': None},
                    'cicflowmeter': {'status': False, 'label': 'Down'},
                    'tcpdump': {'status': False, 'label': 'Down'},
                    'flows_per_minute': 0,
                    'alerts_per_minute': 0,
                }
            )
        ml_seen = health.timestamp
        ml_ok = bool(health.ml_consumer_status and ml_seen and ml_seen > timezone.now() - timedelta(minutes=2))
        
        return Response(
            {
                'kafka': {'status': ml_ok, 'label': 'Running' if ml_ok else 'Down'},
                'ml_consumer': {'status': ml_ok, 'label': 'Running' if ml_ok else 'Down', 'last_seen': ml_seen},
                'cicflowmeter': {'status': ml_ok, 'label': 'Running' if ml_ok else 'Down'},
                'tcpdump': {'status': ml_ok, 'label': 'Running' if ml_ok else 'Down'},
                'flows_per_minute': health.flows_per_minute,
                'alerts_per_minute': health.alerts_per_minute,
            }
        )


class AlertListView(generics.ListAPIView):
    serializer_class = AlertSerializer
    pagination_class = LimitPagination

    def get_queryset(self):
        qs = FlowRecord.objects.filter(is_alert=True).order_by('-timestamp')
        severity = self.request.query_params.get('severity')
        prediction = self.request.query_params.get('prediction')
        source_type = self.request.query_params.get('source_type')
        if severity:
            qs = qs.filter(severity=severity)
        if prediction:
            qs = qs.filter(prediction=prediction)
        if source_type:
            qs = qs.filter(source_type=source_type)
        return qs


class SiteListCreateView(generics.ListCreateAPIView):
    queryset = RegisteredSite.objects.all().order_by('-registered_at')
    serializer_class = RegisteredSiteSerializer
    pagination_class = LimitPagination

    def list(self, request, *args, **kwargs):
        if 'page' not in request.query_params and 'limit' not in request.query_params:
            serializer = self.get_serializer(self.get_queryset(), many=True)
            return Response(serializer.data)
        return super().list(request, *args, **kwargs)


class SiteDetailView(generics.DestroyAPIView):
    queryset = RegisteredSite.objects.all()
    serializer_class = RegisteredSiteSerializer

    def delete(self, request, *args, **kwargs):
        super().delete(request, *args, **kwargs)
        return Response({'status': 'deleted'})


class DeviceListCreateView(generics.ListCreateAPIView):
    queryset = RegisteredDevice.objects.all().order_by('-registered_at')
    serializer_class = RegisteredDeviceSerializer
    pagination_class = LimitPagination

    def list(self, request, *args, **kwargs):
        if 'page' not in request.query_params and 'limit' not in request.query_params:
            serializer = self.get_serializer(self.get_queryset(), many=True)
            return Response(serializer.data)
        return super().list(request, *args, **kwargs)


class DeviceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = RegisteredDevice.objects.all()
    serializer_class = RegisteredDeviceSerializer

    def delete(self, request, *args, **kwargs):
        super().delete(request, *args, **kwargs)
        return Response({'status': 'deleted'})


class PipelineHealthView(APIView):
    def get(self, request):
        health = SystemHealth.objects.first()
        if not health:
            return Response({})
        return Response(
            {
                'kafka': {'status': health.kafka_status, 'label': 'Running' if health.kafka_status else 'Down'},
                'ml_consumer': {
                    'status': health.ml_consumer_status,
                    'label': 'Running' if health.ml_consumer_status else 'Down',
                    'last_seen': health.timestamp,
                    'uptime_since': health.uptime_since,
                },
                'cicflowmeter': {'status': health.cicflowmeter_status, 'label': 'Running' if health.cicflowmeter_status else 'Down'},
                'tcpdump': {'status': health.tcpdump_status, 'label': 'Running' if health.tcpdump_status else 'Down'},
                'flows_per_minute': health.flows_per_minute,
                'alerts_per_minute': health.alerts_per_minute,
                'flows_processed_total': health.flows_processed_total,
                'alerts_triggered_total': health.alerts_triggered_total,
            }
        )

    def post(self, request):
        previous = SystemHealth.objects.first()
        flows_processed = int(request.data.get('flows_processed', 0))
        alerts_triggered = int(request.data.get('alerts_triggered', 0))
        increased = True if not previous else flows_processed > previous.flows_processed_total
        health = SystemHealth.objects.create(
            ml_consumer_status=bool(request.data.get('status', False)),
            kafka_status=True,
            cicflowmeter_status=True,
            tcpdump_status=True,
            flows_processed_total=flows_processed,
            alerts_triggered_total=alerts_triggered,
            flows_per_minute=int(request.data.get('flows_per_minute', 0)),
            alerts_per_minute=int(request.data.get('alerts_per_minute', 0)),
            uptime_since=request.data.get('uptime_since'),
        )
        _send_group(
            'health',
            'health_broadcast',
            {
                'type': 'health_update',
                'kafka': True,
                'ml_consumer': health.ml_consumer_status,
                'cicflowmeter': True,
                'tcpdump': True,
                'flows_per_minute': health.flows_per_minute,
                'alerts_per_minute': health.alerts_per_minute,
            },
        )
        return Response({'status': 'ok'})


class TargetHealthView(APIView):
    def get(self, request):
        website_rows = []
        for site in RegisteredSite.objects.all():
            latest = TargetHealth.objects.filter(site=site).first()
            total = TargetHealth.objects.filter(site=site).count()
            up = TargetHealth.objects.filter(site=site, is_reachable=True).count()
            uptime = (up / total * 100) if total else 0
            website_rows.append(
                {
                    'id': site.id,
                    'name': site.name,
                    'domain': site.domain,
                    'is_reachable': latest.is_reachable if latest else False,
                    'response_time_ms': latest.response_time_ms if latest else None,
                    'status_code': latest.status_code if latest else None,
                    'uptime_percent_24h': round(uptime, 1),
                    'last_checked': latest.timestamp if latest else None,
                }
            )

        device_rows = []
        for device in RegisteredDevice.objects.all():
            latest = TargetHealth.objects.filter(device=device).first()
            device_rows.append(
                {
                    'id': device.id,
                    'name': device.name,
                    'ip_address': device.ip_address,
                    'is_online': latest.is_reachable if latest else False,
                    'ping_latency_ms': latest.response_time_ms if latest else None,
                    'last_seen': device.last_seen,
                }
            )
        return Response({'websites': website_rows, 'devices': device_rows})

    def post(self, request):
        target_type = request.data.get('target_type')
        target_id = request.data.get('target_id')
        site = RegisteredSite.objects.filter(id=target_id).first() if target_type == 'website' else None
        device = RegisteredDevice.objects.filter(id=target_id).first() if target_type == 'device' else None
        record = TargetHealth.objects.create(
            target_type=target_type,
            site=site,
            device=device,
            is_reachable=bool(request.data.get('is_reachable', False)),
            response_time_ms=request.data.get('response_time_ms'),
            status_code=request.data.get('status_code'),
        )
        return Response({'id': record.id, 'status': 'ok'})


class HealthHistoryView(APIView):
    def get(self, request):
        hours = int(request.query_params.get('hours', 24))
        start = timezone.now() - timedelta(hours=hours)
        rows = SystemHealth.objects.filter(timestamp__gte=start).annotate(hour=TruncHour('timestamp')).values(
            'hour', 'kafka_status', 'flows_per_minute'
        ).order_by('hour')
        return Response(
            {
                'labels': [x['hour'].strftime('%H:%M') for x in rows],
                'pipeline_up': [x['kafka_status'] for x in rows],
                'flows_per_minute': [x['flows_per_minute'] for x in rows],
            }
        )


class SimulationStartView(APIView):
    def post(self, request):
        attack_type = request.data.get('attack_type')
        session = SimulationSession.objects.create(attack_type=attack_type, status='running')
        threading.Thread(target=start_attack_process, args=(attack_type,), daemon=True).start()
        return Response({'status': 'started', 'session_id': session.id, 'attack_type': attack_type})


class SimulationStatusView(APIView):
    def get(self, request):
        session = SimulationSession.objects.filter(status='running').first()
        if not session:
            return Response({'is_running': False})
        elapsed = int((timezone.now() - session.started_at).total_seconds())
        return Response(
            {
                'is_running': is_attack_running(),
                'session_id': session.id,
                'attack_type': session.attack_type,
                'started_at': session.started_at,
                'elapsed_seconds': elapsed,
                'flows_generated': session.flows_generated,
                'alerts_triggered': session.alerts_triggered,
            }
        )


class SimulationStopView(APIView):
    def post(self, request):
        session = SimulationSession.objects.filter(status='running').first()
        if session:
            session.status = 'stopped'
            session.stopped_at = timezone.now()
            session.save(update_fields=['status', 'stopped_at'])
        stop_attack_process()
        return Response({'status': 'stopped', 'session_id': session.id if session else None})


class SimulationLiveFeedView(APIView):
    def get(self, request):
        session = SimulationSession.objects.filter(status='running').first()
        qs = FlowRecord.objects.order_by('-timestamp')
        if session:
            qs = qs.filter(timestamp__gte=session.started_at)
        flows = list(qs[:20].values('timestamp', 'src_ip', 'dst_ip', 'prediction', 'confidence', 'severity'))
        return Response({'flows': flows})


class IncidentListView(generics.ListAPIView):
    serializer_class = IncidentListSerializer
    pagination_class = LimitPagination

    def get_queryset(self):
        qs = Incident.objects.select_related('flow').all()
        if self.request.query_params.get('attack_type'):
            qs = qs.filter(attack_type=self.request.query_params['attack_type'])
        if self.request.query_params.get('severity'):
            qs = qs.filter(severity=self.request.query_params['severity'])
        if self.request.query_params.get('status'):
            qs = qs.filter(status=self.request.query_params['status'])
        if self.request.query_params.get('date_from'):
            qs = qs.filter(created_at__date__gte=self.request.query_params['date_from'])
        if self.request.query_params.get('date_to'):
            qs = qs.filter(created_at__date__lte=self.request.query_params['date_to'])
        return qs


class IncidentDetailView(generics.RetrieveAPIView):
    queryset = Incident.objects.select_related('flow')
    serializer_class = IncidentDetailSerializer


class IncidentStatusUpdateView(APIView):
    def patch(self, request, pk):
        incident = Incident.objects.get(pk=pk)
        new_status = request.data.get('status', incident.status)
        incident.status = new_status
        if new_status == 'resolved':
            incident.resolved_at = timezone.now()
        incident.save()
        return Response(IncidentDetailSerializer(incident).data)


class IncidentStatsView(APIView):
    def get(self, request):
        return Response(
            {
                'total_incidents': Incident.objects.count(),
                'open_incidents': Incident.objects.filter(status='open').count(),
                'acknowledged_incidents': Incident.objects.filter(status='acknowledged').count(),
                'resolved_incidents': Incident.objects.filter(status='resolved').count(),
            }
        )


class IncidentTimelineView(APIView):
    def get(self, request):
        qs = Incident.objects.all()
        source_type = _source_type(request)
        if source_type:
            qs = qs.filter(flow__source_type=source_type)
            
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from or date_to:
            qs = _filter_by_date(request, qs, 'created_at')
        else:
            days = int(request.query_params.get('days', 30))
            start = timezone.now() - timedelta(days=days)
            qs = qs.filter(created_at__gte=start)
            
        grouped = (
            qs.annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        return Response({'labels': [x['day'].isoformat() for x in grouped], 'counts': [x['count'] for x in grouped]})


class IncidentAttackDistributionView(APIView):
    def get(self, request):
        grouped = Incident.objects.values('attack_type').annotate(count=Count('id')).order_by('-count')
        return Response({'labels': [x['attack_type'] for x in grouped], 'values': [x['count'] for x in grouped]})


class IPHistoryView(APIView):
    def get(self, request, pk):
        incident = Incident.objects.get(pk=pk)
        src_ip = incident.src_ip
        flows = FlowRecord.objects.filter(src_ip=src_ip)
        recent = list(flows.order_by('-timestamp')[:20].values('timestamp', 'prediction', 'confidence', 'severity'))
        return Response(
            {
                'src_ip': src_ip,
                'total_flows': flows.count(),
                'total_alerts': flows.filter(is_alert=True).count(),
                'first_seen': flows.aggregate(first=Min('timestamp'))['first'],
                'last_seen': flows.aggregate(last=Max('timestamp'))['last'],
                'attack_types': list(flows.filter(is_alert=True).values_list('prediction', flat=True).distinct()),
                'recent_flows': recent,
            }
        )
