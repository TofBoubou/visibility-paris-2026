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

export function SentimentChart({ data, height = 300 }: SentimentChartProps) {
  // Sort by sentiment descending
  const sortedData = [...data].sort((a, b) => b.sentiment - a.sentiment);

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
          domain={[-1, 1]}
          tick={{ fill: "#22496A", fontSize: 12 }}
          tickLine={{ stroke: "#22496A40" }}
          ticks={[-1, -0.5, 0, 0.5, 1]}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#22496A", fontSize: 12 }}
          tickLine={{ stroke: "#22496A40" }}
          width={95}
        />
        <ReferenceLine x={0} stroke="#22496A" strokeWidth={2} />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload as SentimentData;
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
          {sortedData.map((entry, index) => (
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
