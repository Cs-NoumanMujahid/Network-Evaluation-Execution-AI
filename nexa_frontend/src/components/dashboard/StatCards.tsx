"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ShieldCheck, Flame, Zap } from "lucide-react";
import CountUp from "./CountUp";

interface StatCardsProps {
  stats: {
    total_flows?: number;
    total_alerts?: number;
    active_alerts?: number;
    detection_rate?: number;
  } | null;
  loading: boolean;
}

const StatCards = ({ stats, loading }: StatCardsProps) => {
  const cards = [
    {
      title: "Network Throughput",
      value: stats?.total_flows || 0,
      icon: Activity,
      suffix: "",
      color: "text-cyber-blue",
      bg: "bg-cyber-blue/5",
    },
    {
      title: "Secure Traffic",
      value: stats?.total_alerts || 0,
      icon: ShieldCheck,
      suffix: "",
      color: "text-cyber-teal",
      bg: "bg-cyber-teal/5",
    },
    {
      title: "Threat Level",
      value: stats?.active_alerts || 0,
      icon: Flame,
      suffix: "",
      color: "text-cyber-red",
      bg: "bg-cyber-red/5",
    },
    {
      title: "System Efficiency",
      value: stats?.detection_rate || 0,
      icon: Zap,
      suffix: "%",
      color: "text-cyber-amber",
      bg: "bg-cyber-amber/5",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="animate-in fade-in zoom-in-95 slide-in-from-bottom-8 fill-mode-both"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '800ms' }}
        >
          <Card className={`relative overflow-hidden border-border/40 ${card.bg}`}>
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <card.icon className={`h-16 w-16 ${card.color}`} />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color} animate-pulse-slow`} />
            </CardHeader>
            <CardContent className="relative z-10">
              {loading && !stats ? (
                <Skeleton className="h-8 w-24 bg-foreground/5" />
              ) : (
                <div className="text-3xl font-black tabular-nums tracking-tighter">
                  <CountUp
                    end={card.value}
                    duration={2.5}
                    separator=","
                    decimals={card.suffix === "%" ? 2 : 0}
                    suffix={card.suffix}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default StatCards;
