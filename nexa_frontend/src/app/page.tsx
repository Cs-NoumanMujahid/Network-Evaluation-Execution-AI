"use client";

import { useDashboardData } from "@/hooks/useDashboardData";
import OverviewCard from "@/components/dashboard/OverviewCard";
import WeeklyTrafficCard from "@/components/dashboard/WeeklyTrafficCard";
import DetectionScoreCard from "@/components/dashboard/DetectionScoreCard";
import PipelineGoalsCard from "@/components/dashboard/PipelineGoalsCard";
import ActiveAlertsCard from "@/components/dashboard/ActiveAlertsCard";
import RecentIncidentsRow from "@/components/dashboard/RecentIncidentsRow";
import SeverityChart from "@/components/dashboard/SeverityChart";
import AttackTypesChart from "@/components/dashboard/AttackTypesChart";
import RecentAlertsTable from "@/components/dashboard/RecentAlertsTable";
import { Card } from "@/components/ui/card";

const DashboardPage = () => {
  const {
    stats,
    attackTypes,
    severity,
    trafficVolume,
    topAttackers,
    pipelineStatus,
    alerts,
    loading,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = useDashboardData();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <OverviewCard stats={stats} loading={loading} />
        </div>
        <div className="lg:col-span-5">
          <WeeklyTrafficCard data={trafficVolume} loading={loading} />
        </div>
        <div className="lg:col-span-3">
          <DetectionScoreCard stats={stats} attackTypes={attackTypes} loading={loading} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <PipelineGoalsCard data={pipelineStatus} loading={loading} />
        </div>
        <div className="lg:col-span-8">
          <ActiveAlertsCard data={alerts} loading={loading} />
        </div>
      </div>

      <RecentIncidentsRow
        data={topAttackers}
        totalAlerts={stats?.total_alerts || 0}
        loading={loading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7 p-6 shadow-none border-border bg-card">
          <SeverityChart data={severity} loading={loading} />
        </Card>
        <Card className="lg:col-span-5 p-6 shadow-none border-border bg-card">
          <AttackTypesChart data={attackTypes} loading={loading} />
        </Card>
      </div>

      <Card className="p-6 shadow-none border-border bg-card">
        <RecentAlertsTable
          data={alerts}
          loading={loading}
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
        />
      </Card>
    </div>
  );
};

export default DashboardPage;
