"use client";

import {
  Pie, PieChart, Bar, BarChart, Area, AreaChart, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// ── Status Pie Chart ──

const STATUS_COLORS: Record<string, string> = {
  incomplete: "hsl(0 0% 64%)",
  complete: "var(--chart-3)",
  submitted: "var(--chart-5)",
  in_review: "var(--chart-4)",
  approved: "var(--chart-2)",
  returned: "hsl(0 84% 60%)",
  escalated: "hsl(25 95% 53%)",
  exported: "var(--chart-2)",
  active: "hsl(160 60% 39%)",
};

export function StatusPieChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).filter(([k, v]) => v > 0 && k !== "total");
  if (entries.length === 0) return null;

  const chartData = entries.map(([status, cases]) => ({
    status,
    cases,
    fill: `var(--color-${status})`,
  }));

  const chartConfig: ChartConfig = {
    cases: { label: "Cases" },
    ...Object.fromEntries(
      entries.map(([status]) => [
        status,
        {
          label: status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          color: STATUS_COLORS[status] || "var(--chart-1)",
        },
      ])
    ),
  };

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[200px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
        <Pie data={chartData} dataKey="cases" nameKey="status" innerRadius={50} outerRadius={80} strokeWidth={0} />
      </PieChart>
    </ChartContainer>
  );
}

// ── Case Type Bar Chart ──

export function CaseTypeBarChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name: name.replace(/-/g, " "), value }))
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) return null;

  const chartConfig: ChartConfig = {
    value: { label: "Cases", color: "var(--chart-1)" },
  };

  return (
    <ChartContainer config={chartConfig} className="max-h-[200px]">
      <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

// ── Readiness / Submission Quality Histogram ──

export function ReadinessHistogram({ cases }: { cases: Array<{ readiness_score: number | null }> }) {
  const buckets = [
    { range: "0-25", tier: "low", count: 0 },
    { range: "26-50", tier: "medium", count: 0 },
    { range: "51-75", tier: "high", count: 0 },
    { range: "76-100", tier: "excellent", count: 0 },
  ];

  for (const c of cases) {
    if (c.readiness_score == null) continue;
    const s = c.readiness_score;
    if (s <= 25) buckets[0].count++;
    else if (s <= 50) buckets[1].count++;
    else if (s <= 75) buckets[2].count++;
    else buckets[3].count++;
  }

  const chartData = buckets.map((b) => ({
    range: b.range,
    count: b.count,
    fill: `var(--color-${b.tier})`,
  }));

  const chartConfig: ChartConfig = {
    count: { label: "Cases" },
    low: { label: "0-25", color: "var(--chart-1)" },
    medium: { label: "26-50", color: "var(--chart-4)" },
    high: { label: "51-75", color: "var(--chart-3)" },
    excellent: { label: "76-100", color: "var(--chart-2)" },
  };

  return (
    <ChartContainer config={chartConfig} className="max-h-[180px]">
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="range" />
        <YAxis allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

// ── Time Series Area Chart ──

export function TimeSeriesChart({ data }: { data: Array<{ period: string; created?: number; submitted?: number; approved?: number }> }) {
  if (!data || data.length === 0) return null;

  const chartConfig: ChartConfig = {
    created: { label: "Created", color: "var(--chart-5)" },
    submitted: { label: "Submitted", color: "var(--chart-3)" },
    approved: { label: "Approved", color: "var(--chart-2)" },
  };

  return (
    <ChartContainer config={chartConfig} className="max-h-[250px]">
      <AreaChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 10 }} />
        <YAxis allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area type="monotone" dataKey="created" stroke="var(--color-created)" fill="var(--color-created)" fillOpacity={0.15} strokeWidth={2} />
        <Area type="monotone" dataKey="submitted" stroke="var(--color-submitted)" fill="var(--color-submitted)" fillOpacity={0.1} strokeWidth={2} />
        <Area type="monotone" dataKey="approved" stroke="var(--color-approved)" fill="var(--color-approved)" fillOpacity={0.1} strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}
