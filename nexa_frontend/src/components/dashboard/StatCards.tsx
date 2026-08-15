"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ShieldCheck, Flame, Zap, ArrowUpRight } from "lucide-react";
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
      title: "Network throughput",
      hint: "Total flows analyzed",
      value: stats?.total_flows || 0,
      icon: Activity,
      suffix: "",
      tone: "text-status-info",
    },
    {
      title: "Secure traffic",
      hint: "Benign sessions",
      value: stats?.total_alerts || 0,
      icon: ShieldCheck,
      suffix: "",
      tone: "text-status-low",
    },
    {
      title: "Threat level",
      hint: "Active alerts",
      value: stats?.active_alerts || 0,
      icon: Flame,
      suffix: "",
      tone: "text-status-critical",
    },
    {
      title: "Detection rate",
      hint: "Model confidence",
      value: stats?.detection_rate || 0,
      icon: Zap,
      suffix: "%",
      tone: "text-status-medium",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
          style={{ animationDelay: `${i * 80}ms`, animationDuration: "500ms" }}
        >
          <Card className="border border-border shadow-none hover:border-foreground/20 transition-colors">
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-1">
              <div>
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">{card.hint}</p>
              </div>
              <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-muted ${card.tone}`}>
                <card.icon className="h-4 w-4" strokeWidth={2.25} />
              </div>
            </CardHeader>
            <CardContent>
              {loading && !stats ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                    <CountUp
                      end={card.value}
                      duration={1.6}
                      separator=","
                      decimals={card.suffix === "%" ? 2 : 0}
                      suffix={card.suffix}
                    />
                  </div>
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground">
                    <ArrowUpRight className="h-3 w-3" /> Live
                  </span>
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
