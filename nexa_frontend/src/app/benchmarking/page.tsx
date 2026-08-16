"use client";

import { Card } from "@/components/ui/card";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, ShieldAlert, Award, FileText, ArrowUpRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BenchmarkingPage() {
  const detectionData = [
    { name: "NEXA IDS", value: 99.0, color: "#10b981" },
    { name: "Snort", value: 71.2, color: "#f97316" },
    { name: "Suricata", value: 68.5, color: "#ef4444" },
  ];

  const fprData = [
    { name: "NEXA IDS", value: 1.0, color: "#10b981" },
    { name: "Snort", value: 8.7, color: "#f97316" },
    { name: "Suricata", value: 11.2, color: "#ef4444" },
  ];

  const f1Data = [
    { name: "NEXA IDS", value: 0.98, color: "#10b981" },
    { name: "Snort", value: 0.79, color: "#f97316" },
    { name: "Suricata", value: 0.76, color: "#ef4444" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Benchmarking</h1>
        <p className="text-sm text-muted-foreground mt-1">
          NEXA IDS performance evaluated against traditional signature-based intrusion detection systems on the CICIDS2017/2018 dataset.
        </p>
      </header>

      {/* Methodology Card */}
      <Card className="p-6 shadow-none border-border bg-card">
        <h2 className="text-base font-semibold text-foreground mb-2">Evaluation Methodology</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          NEXA IDS CNN model was trained and fine-tuned on the combined CICIDS2017/2018 dataset evaluated on 2.79 million labeled flows across 15 attack categories. Performance metrics for Snort and Suricata were sourced from peer-reviewed literature evaluating the same dataset [1]. Unlike the referenced benchmark which tested on a 50,000 sample subset of CICIDS2017 only, NEXA IDS was evaluated on the full combined dataset providing a more comprehensive assessment.
        </p>
      </Card>

      {/* Comparisons Row / Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Chart 1: Detection Rate */}
        <Card className="p-5 shadow-none border-border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Detection Rate (%)</h3>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detectionData} margin={{ top: 5, left: -25, right: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} 
                  domain={[0, 100]}
                />
                <Tooltip 
                  cursor={{ fill: "var(--muted)", opacity: 0.1 }}
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    borderRadius: "var(--radius)",
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  {detectionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: False Positive Rate */}
        <Card className="p-5 shadow-none border-border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">False Positive Rate (%)</h3>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fprData} margin={{ top: 5, left: -25, right: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} 
                  domain={[0, 15]}
                />
                <Tooltip 
                  cursor={{ fill: "var(--muted)", opacity: 0.1 }}
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    borderRadius: "var(--radius)",
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  {fprData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 3: F1 Score */}
        <Card className="p-5 shadow-none border-border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-4 w-4 text-blue-500 shrink-0" />
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">F1 Score</h3>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={f1Data} margin={{ top: 5, left: -25, right: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} 
                  domain={[0, 1.0]}
                />
                <Tooltip 
                  cursor={{ fill: "var(--muted)", opacity: 0.1 }}
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    borderRadius: "var(--radius)",
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  {f1Data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card className="p-6 shadow-none border-border bg-card">
        <h2 className="text-base font-semibold text-foreground mb-1">Comparative Metrics</h2>
        <p className="text-xs text-muted-foreground mb-4">Evaluating ML performance vs traditional signature-based detection software</p>
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground">
              <tr className="text-left font-semibold">
                <th className="px-4 py-3">Metric</th>
                <th className="px-4 py-3">NEXA IDS</th>
                <th className="px-4 py-3">Snort</th>
                <th className="px-4 py-3">Suricata</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3 font-semibold text-foreground">Detection Rate</td>
                <td className="px-4 py-3 font-mono font-bold text-emerald-500">99%</td>
                <td className="px-4 py-3 font-mono text-foreground">71.2%</td>
                <td className="px-4 py-3 font-mono text-foreground">68.5%</td>
              </tr>
              <tr className="border-t border-border hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3 font-semibold text-foreground">False Positive Rate</td>
                <td className="px-4 py-3 font-mono font-bold text-emerald-500">~1%</td>
                <td className="px-4 py-3 font-mono text-foreground">8.7%</td>
                <td className="px-4 py-3 font-mono text-foreground">11.2%</td>
              </tr>
              <tr className="border-t border-border hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3 font-semibold text-foreground">F1 Score</td>
                <td className="px-4 py-3 font-mono font-bold text-emerald-500">0.98</td>
                <td className="px-4 py-3 font-mono text-foreground">0.79</td>
                <td className="px-4 py-3 font-mono text-foreground">0.76</td>
              </tr>
              <tr className="border-t border-border hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3 font-semibold text-foreground">ML Based</td>
                <td className="px-4 py-3 font-bold text-emerald-500">Yes</td>
                <td className="px-4 py-3 text-foreground">No</td>
                <td className="px-4 py-3 text-foreground">No</td>
              </tr>
              <tr className="border-t border-border hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3 font-semibold text-foreground">Approach</td>
                <td className="px-4 py-3 text-foreground">Deep Learning CNN</td>
                <td className="px-4 py-3 text-foreground">Signature Rules</td>
                <td className="px-4 py-3 text-foreground">Signature Rules</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Key Findings Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 shadow-none border-border bg-card flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wide mb-2">Detection Gain</h4>
            <p className="text-xs font-semibold text-foreground leading-normal">
              {"NEXA IDS achieves 99% detection rate vs Snort's 71.2% — a 27.8% improvement."}
            </p>
          </div>
        </Card>

        <Card className="p-5 shadow-none border-border bg-card flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wide mb-2">Alert Fatigue Reduction</h4>
            <p className="text-xs font-semibold text-foreground leading-normal">
              {"False positive rate of ~1% vs Snort's 8.7% — 88% reduction in false alarms."}
            </p>
          </div>
        </Card>

        <Card className="p-5 shadow-none border-border bg-card flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wide mb-2">Generalization</h4>
            <p className="text-xs font-semibold text-foreground leading-normal">
              Trained on 2.79M flows across 15 attack categories including DoS, DDoS, BruteForce, PortScan and Web Attacks.
            </p>
          </div>
        </Card>
      </div>

      {/* References & Links Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cite reference */}
        <Card className="p-5 shadow-none border-border bg-card/60 flex flex-col justify-between gap-4">
          <div className="flex items-start gap-3">
            <FileText className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">[1]</span> Alzahrani, B. A. (2025). Adaptive Deception Framework with Behavioral Analysis for Enhanced Cybersecurity Defense. arXiv:2510.02424
            </div>
          </div>
          <Link href="https://arxiv.org/abs/2510.02424" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 h-8.5 rounded-full">
              <BookOpen className="h-3.5 w-3.5" />
              Access Research Paper
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </Link>
        </Card>

        {/* Notebook links */}
        <Card className="p-5 shadow-none border-border bg-card/60 flex flex-col justify-between gap-4">
          <div className="flex items-start gap-3">
            <FileText className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">[2]</span> Mujahid, N. (2026). NEXA IDS CNN model training, flow preprocessing pipeline, and model architecture implementation. Kaggle Notebook Hub.
            </div>
          </div>
          <Link href="https://www.kaggle.com/code/nouman56fdf/notebookf9546ff5f1/edit" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 h-8.5 rounded-full">
              <BookOpen className="h-3.5 w-3.5" />
              Access Kaggle Notebook
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
