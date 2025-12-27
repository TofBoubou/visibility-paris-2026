"use client";

import { useState, useMemo } from "react";
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
import { ChevronDown } from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  searchTerm: string;
  color: string;
}

interface GeoComparisonProps {
  // Data: region -> { keyword: score }
  data: Record<string, Record<string, number>>;
  candidates: Candidate[];
}

export function GeoComparison({ data, candidates }: GeoComparisonProps) {
  const regions = useMemo(() => Object.keys(data).sort(), [data]);
  const [selectedRegion, setSelectedRegion] = useState<string>(regions[0] || "");

  // Build chart data for selected region
  const chartData = useMemo(() => {
    if (!selectedRegion || !data[selectedRegion]) return [];

    const regionData = data[selectedRegion];
    return candidates
      .map((candidate) => ({
        name: candidate.name,
        score: regionData[candidate.searchTerm] || 0,
        color: candidate.color,
      }))
      .sort((a, b) => b.score - a.score);
  }, [selectedRegion, data, candidates]);

  if (regions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Pas de données disponibles
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Region selector */}
      <div className="relative">
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="w-full md:w-64 appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-gray-900 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 50)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12 }}
              width={95}
            />
            <Tooltip
              formatter={(value) => [`${value}`, "Score"]}
              labelFormatter={(label) => `${label}`}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Legend / summary */}
      <div className="text-xs text-gray-500 text-center">
        Scores comparatifs dans la région {selectedRegion} (0-100, relatif entre candidats)
      </div>
    </div>
  );
}
