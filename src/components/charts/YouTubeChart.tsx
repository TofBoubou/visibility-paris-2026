"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

interface YouTubeData {
  name: string;
  totalViews: number;
  shortsViews: number;
  longViews: number;
  color: string;
  highlighted?: boolean;
}

interface YouTubeChartProps {
  data: YouTubeData[];
  height?: number;
  variant?: "total" | "breakdown";
}

function formatViews(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toString();
}

export function YouTubeChart({
  data,
  height = 300,
  variant = "total",
}: YouTubeChartProps) {
  // Sort by total views descending
  const sortedData = [...data].sort((a, b) => b.totalViews - a.totalViews);

  if (variant === "breakdown") {
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
            tick={{ fill: "#22496A", fontSize: 12 }}
            tickLine={{ stroke: "#22496A40" }}
            tickFormatter={formatViews}
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
                return (
                  <div className="bg-white border border-brand-blue/20 rounded-lg p-3 shadow-lg">
                    <p className="font-bold text-brand-blue mb-2">{label}</p>
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-brand-pink">Shorts</span>
                      <span>{formatViews(Number(payload[0]?.value) || 0)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-brand-blue">Vidéos longues</span>
                      <span>{formatViews(Number(payload[1]?.value) || 0)}</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="shortsViews"
            name="Shorts"
            stackId="a"
            fill="#E1386E"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="longViews"
            name="Vidéos longues"
            stackId="a"
            fill="#22496A"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

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
          tick={{ fill: "#22496A", fontSize: 12 }}
          tickLine={{ stroke: "#22496A40" }}
          tickFormatter={formatViews}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#22496A", fontSize: 12 }}
          tickLine={{ stroke: "#22496A40" }}
          width={95}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload as YouTubeData;
              return (
                <div className="bg-white border border-brand-blue/20 rounded-lg p-3 shadow-lg">
                  <p className="font-bold text-brand-blue">{item.name}</p>
                  <p className="text-brand-pink text-lg">
                    {formatViews(item.totalViews)} vues
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="totalViews" radius={[0, 4, 4, 0]}>
          {sortedData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.highlighted ? "#E1386E" : entry.color}
              stroke={entry.highlighted ? "#22496A" : "none"}
              strokeWidth={entry.highlighted ? 2 : 0}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
