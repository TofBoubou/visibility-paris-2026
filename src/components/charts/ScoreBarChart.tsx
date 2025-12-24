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
} from "recharts";

interface ScoreData {
  name: string;
  score: number;
  color: string;
  highlighted?: boolean;
}

interface ScoreBarChartProps {
  data: ScoreData[];
  height?: number;
}

function truncateName(name: string, isMobile: boolean): string {
  if (!isMobile) return name;
  // On mobile, use last name only
  const parts = name.split(" ");
  const lastName = parts[parts.length - 1];
  return lastName;
}

export function ScoreBarChart({ data, height = 300 }: ScoreBarChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Sort by score descending
  const sortedData = [...data].sort((a, b) => b.score - a.score);

  // Responsive values
  const fontSize = isMobile ? 11 : 12;

  // Prepare data with truncated names for display
  const displayData = sortedData.map((item) => ({
    ...item,
    displayName: truncateName(item.name, isMobile),
  }));

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
          domain={[0, 100]}
          tick={{ fill: "#22496A", fontSize }}
          tickLine={{ stroke: "#22496A40" }}
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
              const item = payload[0].payload as ScoreData;
              return (
                <div className="bg-white border border-brand-blue/20 rounded-lg p-3 shadow-lg">
                  <p className="font-bold text-gray-900">{item.name}</p>
                  <p className="text-blue-600 text-lg">
                    {item.score.toFixed(1)} / 100
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
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
