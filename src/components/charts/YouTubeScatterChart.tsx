"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
  ReferenceLine,
} from "recharts";

interface YouTubeScatterData {
  name: string;
  color: string;
  highlighted?: boolean;
  // Shorts data
  shortsViews: number;
  shortsLikes: number;
  shortsComments: number;
  shortsCount: number;
  // Long videos data
  longViews: number;
  longLikes: number;
  longComments: number;
  longCount: number;
}

interface YouTubeScatterChartProps {
  data: YouTubeScatterData[];
  variant: "likes" | "comments";
  height?: number;
}

function formatViews(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toString();
}

export function YouTubeScatterChart({
  data,
  variant,
  height = 400,
}: YouTubeScatterChartProps) {
  const MIN_VIEWS_DISPLAY = 10000;

  // Prepare scatter data - separate points for shorts and longs
  const scatterData: Array<{
    name: string;
    views: number;
    ratio: number;
    color: string;
    highlighted?: boolean;
    type: "shorts" | "long";
    count: number;
  }> = [];

  for (const candidate of data) {
    // Long videos (circle)
    if (candidate.longViews > 0) {
      const ratio =
        variant === "likes"
          ? (candidate.longLikes / candidate.longViews) * 100
          : (candidate.longComments / candidate.longViews) * 100;
      scatterData.push({
        name: candidate.name,
        views: Math.max(candidate.longViews, MIN_VIEWS_DISPLAY),
        ratio,
        color: candidate.color,
        highlighted: candidate.highlighted,
        type: "long",
        count: candidate.longCount,
      });
    }

    // Shorts (square - we'll use a different color)
    if (candidate.shortsViews > 0) {
      const ratio =
        variant === "likes"
          ? (candidate.shortsLikes / candidate.shortsViews) * 100
          : (candidate.shortsComments / candidate.shortsViews) * 100;
      scatterData.push({
        name: candidate.name,
        views: Math.max(candidate.shortsViews, MIN_VIEWS_DISPLAY),
        ratio,
        color: candidate.color,
        highlighted: candidate.highlighted,
        type: "shorts",
        count: candidate.shortsCount,
      });
    }
  }

  // Separate by type for different styling
  const longData = scatterData.filter((d) => d.type === "long");
  const shortsData = scatterData.filter((d) => d.type === "shorts");

  const ratioLabel = variant === "likes" ? "Likes / Vues (%)" : "Commentaires / Vues (%)";

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#22496A20" />
          <XAxis
            type="number"
            dataKey="views"
            name="Vues"
            tick={{ fill: "#22496A", fontSize: 11 }}
            tickFormatter={formatViews}
            scale="log"
            domain={[MIN_VIEWS_DISPLAY, "auto"]}
            label={{ value: "Vues", position: "bottom", fill: "#22496A", fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="ratio"
            name={ratioLabel}
            tick={{ fill: "#22496A", fontSize: 11 }}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            label={{
              value: ratioLabel,
              angle: -90,
              position: "insideLeft",
              fill: "#22496A",
              fontSize: 12,
            }}
          />
          <ZAxis range={[200, 200]} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                const typeLabel = item.type === "long" ? "Vidéos longues" : "Shorts";
                return (
                  <div className="bg-white border border-brand-blue/20 rounded-lg p-3 shadow-lg">
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-900/60 mb-2">{typeLabel}</p>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between gap-4">
                        <span>Vues:</span>
                        <span className="font-medium">{formatViews(item.views)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>{variant === "likes" ? "Taux likes:" : "Taux commentaires:"}</span>
                        <span className="font-medium text-blue-600">{item.ratio.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Vidéos:</span>
                        <span>{item.count}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <ReferenceLine y={0} stroke="#22496A40" />

          {/* Long videos - circles */}
          <Scatter name="Vidéos longues" data={longData} shape="circle">
            {longData.map((entry, index) => (
              <Cell
                key={`long-${index}`}
                fill={entry.highlighted ? "#E1386E" : entry.color}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Scatter>

          {/* Shorts - squares */}
          <Scatter name="Shorts" data={shortsData} shape="square">
            {shortsData.map((entry, index) => (
              <Cell
                key={`short-${index}`}
                fill={entry.highlighted ? "#E1386E" : entry.color}
                stroke="white"
                strokeWidth={2}
                opacity={0.7}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 text-center mt-2">
        Rond = Vidéos longues, Carré = Shorts · Échelle logarithmique
      </p>
    </div>
  );
}
