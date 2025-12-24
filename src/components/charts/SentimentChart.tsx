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
  ReferenceLine,
} from "recharts";

interface SentimentData {
  name: string;
  sentiment: number; // -1 to +1
  highlighted?: boolean;
}

interface SentimentChartProps {
  data: SentimentData[];
  height?: number;
}

function getSentimentColor(value: number): string {
  if (value > 0.2) return "#00A86B"; // Green - positive
  if (value < -0.2) return "#E1386E"; // Pink - negative
  return "#22496A80"; // Gray - neutral
}

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  // On mobile, try to use just first name
  const firstName = name.split(" ")[0];
  if (firstName.length <= maxLength) return firstName;
  return name.substring(0, maxLength - 1) + "…";
}

export function SentimentChart({ data, height = 300 }: SentimentChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Sort by sentiment descending
  const sortedData = [...data].sort((a, b) => b.sentiment - a.sentiment);

  // Responsive values - much more compact on mobile
  const yAxisWidth = isMobile ? 55 : 95;
  const leftMargin = isMobile ? 60 : 100;
  const rightMargin = isMobile ? 10 : 30;
  const fontSize = isMobile ? 9 : 12;
  const maxNameLength = isMobile ? 8 : 20;

  // Prepare data with truncated names for display
  const displayData = sortedData.map((item) => ({
    ...item,
    displayName: truncateName(item.name, maxNameLength),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={displayData}
        layout="vertical"
        margin={{ top: 5, right: rightMargin, left: leftMargin, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#22496A20" />
        <XAxis
          type="number"
          domain={[-1, 1]}
          tick={{ fill: "#22496A", fontSize }}
          tickLine={{ stroke: "#22496A40" }}
          ticks={isMobile ? [-1, 0, 1] : [-1, -0.5, 0, 0.5, 1]}
        />
        <YAxis
          type="category"
          dataKey="displayName"
          tick={{ fill: "#22496A", fontSize }}
          tickLine={{ stroke: "#22496A40" }}
          width={yAxisWidth}
        />
        <ReferenceLine x={0} stroke="#22496A" strokeWidth={2} />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload as SentimentData & { displayName: string };
              const label =
                item.sentiment > 0.2
                  ? "Positif"
                  : item.sentiment < -0.2
                  ? "Négatif"
                  : "Neutre";
              return (
                <div className="bg-white border border-brand-blue/20 rounded-lg p-3 shadow-lg">
                  <p className="font-bold text-gray-900">{item.name}</p>
                  <p style={{ color: getSentimentColor(item.sentiment) }}>
                    {item.sentiment > 0 ? "+" : ""}
                    {item.sentiment.toFixed(2)} ({label})
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="sentiment" radius={4}>
          {displayData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getSentimentColor(entry.sentiment)}
              stroke={entry.highlighted ? "#22496A" : "none"}
              strokeWidth={entry.highlighted ? 2 : 0}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
