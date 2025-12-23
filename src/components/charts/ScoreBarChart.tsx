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

export function ScoreBarChart({ data, height = 300 }: ScoreBarChartProps) {
  // Sort by score descending
  const sortedData = [...data].sort((a, b) => b.score - a.score);

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
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload as ScoreData;
              return (
                <div className="bg-white border border-brand-blue/20 rounded-lg p-3 shadow-lg">
                  <p className="font-bold text-brand-blue">{item.name}</p>
                  <p className="text-brand-pink text-lg">
                    {item.score.toFixed(1)} / 100
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
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
