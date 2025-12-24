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

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 1) + "…";
}

export function WikipediaChart({
  data,
  height = 300,
  variant = "views",
}: WikipediaChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Responsive values
  const yAxisWidth = isMobile ? 70 : 95;
  const leftMargin = isMobile ? 75 : 100;
  const rightMargin = isMobile ? 15 : 30;
  const fontSize = isMobile ? 10 : 12;
  const maxNameLength = isMobile ? 10 : 20;

  // Sort appropriately
  const sortedData =
    variant === "views"
      ? [...data].sort((a, b) => b.views - a.views)
      : [...data].sort((a, b) => b.variation - a.variation);

  // Prepare data with truncated names for display
  const displayData = sortedData.map((item) => ({
    ...item,
    displayName: truncateName(item.name, maxNameLength),
  }));

  if (variant === "variation") {
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
            domain={[-100, 100]}
            tick={{ fill: "#22496A", fontSize }}
            tickLine={{ stroke: "#22496A40" }}
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            tick={{ fill: "#22496A", fontSize }}
            tickLine={{ stroke: "#22496A40" }}
            width={yAxisWidth}
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
            {displayData.map((entry, index) => (
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
        data={displayData}
        layout="vertical"
        margin={{ top: 5, right: rightMargin, left: leftMargin, bottom: 5 }}
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
          width={yAxisWidth}
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
