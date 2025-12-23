"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface BreakdownData {
  name: string;
  trends: number;
  press: number;
  wikipedia: number;
  youtube: number;
}

interface ScoreBreakdownChartProps {
  data: BreakdownData[];
  height?: number;
}

const COLORS = {
  trends: "#FBCD41",
  press: "#22496A",
  wikipedia: "#00A86B",
  youtube: "#E1386E",
};

const LABELS = {
  trends: "Trends (30%)",
  press: "Presse (30%)",
  wikipedia: "Wikipedia (25%)",
  youtube: "YouTube (15%)",
};

export function ScoreBreakdownChart({ data, height = 300 }: ScoreBreakdownChartProps) {
  // Sort by total score descending
  const sortedData = [...data].sort(
    (a, b) =>
      b.trends + b.press + b.wikipedia + b.youtube -
      (a.trends + a.press + a.wikipedia + a.youtube)
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={sortedData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#22496A20" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fill: "#22496A", fontSize: 12 }}
          tickLine={{ stroke: "#22496A40" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#22496A", fontSize: 12 }}
          tickLine={{ stroke: "#22496A40" }}
          width={95}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const total = payload.reduce(
                (sum, p) => sum + (Number(p.value) || 0),
                0
              );
              return (
                <div className="bg-white border border-brand-blue/20 rounded-lg p-3 shadow-lg">
                  <p className="font-bold text-brand-blue mb-2">{label}</p>
                  {payload.map((p) => (
                    <div key={p.dataKey} className="flex justify-between gap-4 text-sm">
                      <span style={{ color: p.color }}>{LABELS[p.dataKey as keyof typeof LABELS]}</span>
                      <span className="font-medium">{Number(p.value).toFixed(1)}</span>
                    </div>
                  ))}
                  <div className="border-t border-brand-blue/20 mt-2 pt-2 flex justify-between">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-brand-pink">{total.toFixed(1)}</span>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend
          formatter={(value) => LABELS[value as keyof typeof LABELS]}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="press" stackId="a" fill={COLORS.press} radius={[0, 0, 0, 0]} />
        <Bar dataKey="trends" stackId="a" fill={COLORS.trends} radius={[0, 0, 0, 0]} />
        <Bar dataKey="wikipedia" stackId="a" fill={COLORS.wikipedia} radius={[0, 0, 0, 0]} />
        <Bar dataKey="youtube" stackId="a" fill={COLORS.youtube} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
