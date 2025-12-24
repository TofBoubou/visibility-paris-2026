"use client";

import { useState, useEffect } from "react";
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

function truncateName(name: string, isMobile: boolean): string {
  if (!isMobile) return name;
  // On mobile, use last name only
  const parts = name.split(" ");
  const lastName = parts[parts.length - 1];
  return lastName;
}

export function YouTubeChart({
  data,
  height = 300,
  variant = "total",
}: YouTubeChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Responsive values
  const fontSize = isMobile ? 11 : 12;

  // Sort by total views descending
  const sortedData = [...data].sort((a, b) => b.totalViews - a.totalViews);

  // Prepare data with truncated names for display
  const displayData = sortedData.map((item) => ({
    ...item,
    displayName: truncateName(item.name, isMobile),
  }));

  if (variant === "breakdown") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={displayData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#22496A20" />
          <XAxis
            type="number"
            tick={{ fill: "#22496A", fontSize }}
            tickLine={{ stroke: "#22496A40" }}
            tickFormatter={formatViews}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            tick={{ fill: "#22496A", fontSize }}
            tickLine={{ stroke: "#22496A40" }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as YouTubeData;
                return (
                  <div className="bg-white border border-brand-blue/20 rounded-lg p-3 shadow-lg">
                    <p className="font-bold text-gray-900 mb-2">{item.name}</p>
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-blue-600">Shorts</span>
                      <span>{formatViews(item.shortsViews)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-gray-900">Vidéos longues</span>
                      <span>{formatViews(item.longViews)}</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ fontSize }} />
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
        data={displayData}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#22496A20" />
        <XAxis
          type="number"
          tick={{ fill: "#22496A", fontSize }}
          tickLine={{ stroke: "#22496A40" }}
          tickFormatter={formatViews}
        />
        <YAxis
          type="category"
          dataKey="displayName"
          tick={{ fill: "#22496A", fontSize }}
          tickLine={{ stroke: "#22496A40" }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload as YouTubeData;
              return (
                <div className="bg-white border border-brand-blue/20 rounded-lg p-3 shadow-lg">
                  <p className="font-bold text-gray-900">{item.name}</p>
                  <p className="text-blue-600 text-lg">
                    {formatViews(item.totalViews)} vues
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="totalViews" radius={[0, 4, 4, 0]}>
          {displayData.map((entry, index) => (
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
