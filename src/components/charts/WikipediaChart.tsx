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

interface WikipediaData {
  name: string;
  views: number;
  variation: number;
  color: string;
  highlighted?: boolean;
}

interface WikipediaChartProps {
  data: WikipediaData[];
  height?: number;
  variant?: "views" | "variation";
}

function formatViews(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toString();
}

function getVariationColor(value: number): string {
  if (value > 10) return "#00A86B"; // Green - positive
  if (value < -10) return "#E1386E"; // Pink - negative
  return "#22496A80"; // Gray - neutral
}

export function WikipediaChart({
  data,
  height = 300,
  variant = "views",
}: WikipediaChartProps) {
  // Sort appropriately
  const sortedData =
    variant === "views"
      ? [...data].sort((a, b) => b.views - a.views)
      : [...data].sort((a, b) => b.variation - a.variation);

  if (variant === "variation") {
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
            domain={[-100, 100]}
            tick={{ fill: "#22496A", fontSize: 12 }}
            tickLine={{ stroke: "#22496A40" }}
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
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
                const item = payload[0].payload as WikipediaData;
                const sign = item.variation > 0 ? "+" : "";
                return (
                  <div className="bg-white border border-brand-blue/20 rounded-lg p-3 shadow-lg">
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <p style={{ color: getVariationColor(item.variation) }}>
                      {sign}
                      {item.variation.toFixed(1)}% vs période précédente
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="variation" radius={4}>
            {sortedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getVariationColor(entry.variation)}
              />
            ))}
          </Bar>
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
              const item = payload[0].payload as WikipediaData;
              return (
                <div className="bg-white border border-brand-blue/20 rounded-lg p-3 shadow-lg">
                  <p className="font-bold text-gray-900">{item.name}</p>
                  <p className="text-blue-600 text-lg">
                    {formatViews(item.views)} vues
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="views" radius={[0, 4, 4, 0]}>
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
