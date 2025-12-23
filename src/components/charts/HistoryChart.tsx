"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface HistoryDataPoint {
  date: string;
  [candidateName: string]: number | string;
}

interface CandidateConfig {
  name: string;
  color: string;
  highlighted?: boolean;
}

interface HistoryChartProps {
  data: HistoryDataPoint[];
  candidates: CandidateConfig[];
  height?: number;
}

export function HistoryChart({ data, candidates, height = 350 }: HistoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-brand-blue/50">
        Pas assez de données historiques pour afficher l&apos;évolution.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#22496A20" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#22496A", fontSize: 11 }}
          tickLine={{ stroke: "#22496A40" }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "#22496A", fontSize: 12 }}
          tickLine={{ stroke: "#22496A40" }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white border border-brand-blue/20 rounded-lg p-3 shadow-lg max-w-xs">
                  <p className="font-bold text-brand-blue mb-2">{label}</p>
                  {[...payload]
                    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
                    .map((p) => (
                      <div
                        key={p.dataKey}
                        className="flex justify-between gap-4 text-sm"
                      >
                        <span style={{ color: p.color }}>{p.name}</span>
                        <span className="font-medium">
                          {Number(p.value).toFixed(1)}
                        </span>
                      </div>
                    ))}
                </div>
              );
            }
            return null;
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {candidates.map((candidate) => (
          <Line
            key={candidate.name}
            type="monotone"
            dataKey={candidate.name}
            name={candidate.name}
            stroke={candidate.highlighted ? "#E1386E" : candidate.color}
            strokeWidth={candidate.highlighted ? 3 : 2}
            dot={{
              r: candidate.highlighted ? 5 : 3,
              fill: candidate.highlighted ? "#E1386E" : candidate.color,
              stroke: candidate.highlighted ? "#fff" : "none",
              strokeWidth: candidate.highlighted ? 2 : 0,
            }}
            activeDot={{
              r: 6,
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
