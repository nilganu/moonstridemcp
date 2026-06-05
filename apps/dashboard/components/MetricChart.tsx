"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ChartDatum {
  name: string;
  value: number;
}

export function MetricChart({ data }: { data: ChartDatum[] }) {
  if (!data.length) {
    return (
      <div className="grid h-64 place-items-center text-sm text-slate-400">
        No chart data
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Bar dataKey="value" fill="#fe6652" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
