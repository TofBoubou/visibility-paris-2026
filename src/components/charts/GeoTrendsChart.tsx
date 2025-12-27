"use client";

import { useMemo } from "react";
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

interface GeoData {
  name: string;
  score: number;
}

interface CandidateGeoData {
  candidateName: string;
  color: string;
  highlighted?: boolean;
  cities: GeoData[];
}

interface GeoTrendsChartProps {
  data: CandidateGeoData[];
  maxCities?: number;
}

// Predefined colors for cities
const CITY_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

export function GeoTrendsChart({ data, maxCities = 10 }: GeoTrendsChartProps) {
  // Aggregate cities across all candidates to find top cities
  const aggregatedData = useMemo(() => {
    const cityScores: Record<string, Record<string, number>> = {};

    data.forEach((candidate) => {
      candidate.cities.forEach((city) => {
        if (!cityScores[city.name]) {
          cityScores[city.name] = {};
        }
        cityScores[city.name][candidate.candidateName] = city.score;
      });
    });

    // Calculate total score for each city to rank them
    const cityTotals = Object.entries(cityScores).map(([cityName, scores]) => ({
      cityName,
      total: Object.values(scores).reduce((a, b) => a + b, 0),
      scores,
    }));

    // Sort by total and take top N
    cityTotals.sort((a, b) => b.total - a.total);
    const topCities = cityTotals.slice(0, maxCities);

    // Format for chart
    return topCities.map((city) => {
      const entry: Record<string, string | number> = { name: city.cityName };
      data.forEach((candidate) => {
        entry[candidate.candidateName] = city.scores[candidate.candidateName] || 0;
      });
      return entry;
    });
  }, [data, maxCities]);

  if (data.length === 0 || aggregatedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Pas de donnees geographiques disponibles
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, aggregatedData.length * 50)}>
      <BarChart
        data={aggregatedData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}`} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12 }}
          width={90}
        />
        <Tooltip
          formatter={(value: number, name: string) => [`${value}`, name]}
          labelFormatter={(label) => `${label}`}
        />
        <Legend />
        {data.map((candidate, index) => (
          <Bar
            key={candidate.candidateName}
            dataKey={candidate.candidateName}
            fill={candidate.color}
            radius={[0, 4, 4, 0]}
            opacity={candidate.highlighted ? 1 : 0.8}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface GeoTrendsSingleCandidateProps {
  candidateName: string;
  color: string;
  highlighted?: boolean;
  cities: GeoData[];
  maxCities?: number;
}

export function GeoTrendsSingleCandidate({
  candidateName,
  color,
  highlighted,
  cities,
  maxCities = 15,
}: GeoTrendsSingleCandidateProps) {
  const topCities = cities.slice(0, maxCities);

  if (topCities.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        Pas de donnees
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, topCities.length * 28)}>
      <BarChart
        data={topCities}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
        <XAxis type="number" domain={[0, 100]} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11 }}
          width={75}
        />
        <Tooltip formatter={(value: number) => [`${value}`, "Score"]} />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
          {topCities.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={color}
              opacity={index === 0 ? 1 : 0.6 + (0.4 * (topCities.length - index)) / topCities.length}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface GeoTrendsComparisonProps {
  data: CandidateGeoData[];
}

export function GeoTrendsComparison({ data }: GeoTrendsComparisonProps) {
  // Find the top city for each candidate
  const topCities = data.map((candidate) => ({
    name: candidate.candidateName,
    topCity: candidate.cities[0]?.name || "-",
    topScore: candidate.cities[0]?.score || 0,
    color: candidate.color,
    highlighted: candidate.highlighted,
    totalCities: candidate.cities.filter((c) => c.score > 0).length,
  }));

  return (
    <div className="space-y-2">
      {topCities.map((candidate, index) => (
        <div
          key={candidate.name}
          className={`flex items-center justify-between p-3 rounded-lg border ${
            candidate.highlighted ? "border-blue-200 bg-blue-50" : "border-gray-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: candidate.color }}
            />
            <span className={candidate.highlighted ? "font-bold text-blue-600" : "font-medium"}>
              {candidate.name}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {candidate.topCity}{" "}
              <span className="text-gray-500">({candidate.topScore})</span>
            </div>
            <div className="text-xs text-gray-500">
              {candidate.totalCities} villes avec interet
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
