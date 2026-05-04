from rest_framework import serializers
from .models import (
    FlowRecord,
    Incident,
    RegisteredDevice,
    RegisteredSite,
    SimulationSession,
    SystemHealth,
    TargetHealth,
)


class FlowRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlowRecord
        fields = '__all__'


class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlowRecord
        fields = [
            'id',
            'timestamp',
            'prediction',
            'severity',
            'src_ip',
            'dst_ip',
            'dst_port',
            'protocol',
            'confidence',
            'source_type',
            'recommended_action',
        ]


class RegisteredSiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegisteredSite
        fields = ['id', 'name', 'domain', 'ip_address', 'is_active', 'registered_at']


class RegisteredDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegisteredDevice
        fields = ['id', 'name', 'ip_address', 'device_type', 'is_active', 'last_seen', 'registered_at']


class TargetHealthSerializer(serializers.ModelSerializer):
    class Meta:
        model = TargetHealth
        fields = '__all__'


class SystemHealthSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemHealth
        fields = '__all__'


class IncidentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = [
            'id',
            'attack_type',
            'severity',
            'src_ip',
            'dst_ip',
            'status',
            'recommended_action',
            'created_at',
            'resolved_at',
        ]


class IncidentDetailSerializer(serializers.ModelSerializer):
    dst_port = serializers.IntegerField(source='flow.dst_port', read_only=True)
    protocol = serializers.IntegerField(source='flow.protocol', read_only=True)
    confidence = serializers.FloatField(source='flow.confidence', read_only=True)
    flow = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = [
            'id',
            'attack_type',
            'severity',
            'src_ip',
            'dst_ip',
            'dst_port',
            'protocol',
            'confidence',
            'status',
            'recommended_action',
            'created_at',
            'resolved_at',
            'flow',
        ]

    def get_flow(self, obj):
        return {
            'flow_duration': obj.flow.flow_duration,
            'flow_bytes_per_sec': obj.flow.flow_bytes_per_sec,
            'flow_packets_per_sec': obj.flow.flow_packets_per_sec,
            'total_fwd_packets': obj.flow.total_fwd_packets,
            'total_bwd_packets': obj.flow.total_bwd_packets,
        }


class SimulationSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimulationSession
        fields = '__all__'
