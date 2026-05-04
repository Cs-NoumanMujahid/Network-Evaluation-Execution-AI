"use client";

import { useDashboardData } from "@/hooks/useDashboardData";
import StatCards from "@/components/dashboard/StatCards";
import AttackTypesChart from "@/components/dashboard/AttackTypesChart";
import SeverityChart from "@/components/dashboard/SeverityChart";
import TrafficVolumeChart from "@/components/dashboard/TrafficVolumeChart";
import TopAttackersChart from "@/components/dashboard/TopAttackersChart";
import PipelineStatus from "@/components/dashboard/PipelineStatus";
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
    <div className="flex flex-col gap-4 pb-8">
      <StatCards stats={stats} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
          <AttackTypesChart data={attackTypes} loading={loading} />
        </Card>
        <Card className="p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-1000 delay-450 fill-mode-both">
          <SeverityChart data={severity} loading={loading} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-1000 delay-600 fill-mode-both">
          <TrafficVolumeChart data={trafficVolume} loading={loading} />
        </Card>
        <Card className="p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-1000 delay-750 fill-mode-both">
          <TopAttackersChart data={topAttackers} loading={loading} />
        </Card>
      </div>

      <Card className="p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-1000 delay-900 fill-mode-both">
        <PipelineStatus data={pipelineStatus} loading={loading} />
      </Card>

      <div className="animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-1000 delay-1000 fill-mode-both">
        <RecentAlertsTable
          data={alerts}
          loading={loading}
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
