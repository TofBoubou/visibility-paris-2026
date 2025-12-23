"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  SONDAGES_PARIS_2026,
  CANDIDATE_COLORS,
  getLatestSondage,
  getSondageEvolution,
  Sondage,
} from "@/lib/data/sondages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface SondageBarChartProps {
  sondage: Sondage;
  height?: number;
}

function SondageBarChart({ sondage, height = 300 }: SondageBarChartProps) {
  const data = Object.entries(sondage.scores)
    .map(([name, score]) => ({
      name,
      score,
      color: CANDIDATE_COLORS[name] || "#888",
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 100, right: 40 }}>
        <XAxis type="number" domain={[0, 40]} tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: "#22496A" }}
          width={95}
        />
        <Tooltip
          formatter={(value) => [`${value}%`, "Intentions"]}
          labelStyle={{ fontWeight: "bold" }}
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #22496A20",
            borderRadius: "8px",
          }}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.color}
              stroke={entry.name === "Sarah Knafo" ? "#E1386E" : "none"}
              strokeWidth={entry.name === "Sarah Knafo" ? 2 : 0}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function SondageEvolutionChart({ height = 350 }: { height?: number }) {
  const evolution = getSondageEvolution();

  // Transformer en format pour LineChart
  const dates = Array.from(new Set(evolution.map((e) => e.date))).sort();
  const candidats = Array.from(new Set(evolution.map((e) => e.candidat)));

  const chartData = dates.map((date) => {
    const entry: Record<string, string | number> = { date };
    for (const candidat of candidats) {
      const found = evolution.find((e) => e.date === date && e.candidat === candidat);
      if (found) {
        entry[candidat] = found.score;
      }
    }
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 40]} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value, name) => [`${value}%`, name]}
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #22496A20",
            borderRadius: "8px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {candidats.map((candidat) => (
          <Line
            key={candidat}
            type="monotone"
            dataKey={candidat}
            stroke={CANDIDATE_COLORS[candidat] || "#888"}
            strokeWidth={candidat === "Sarah Knafo" ? 3 : 2}
            dot={{ r: candidat === "Sarah Knafo" ? 5 : 3 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SondagesSection() {
  const latestSondage = getLatestSondage();

  return (
    <div className="space-y-6">
      {/* Dernier sondage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Dernier sondage: {latestSondage.institut} ({latestSondage.date})
            </span>
            {latestSondage.sourceUrl && (
              <a
                href={latestSondage.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-normal text-blue-600 hover:underline flex items-center gap-1"
              >
                Source <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Commanditaire: {latestSondage.commanditaire} · Échantillon:{" "}
            {latestSondage.echantillon} personnes · {latestSondage.methode}
          </p>
          <p className="text-xs text-gray-500 mb-4 italic">
            Hypothèse: {latestSondage.hypothese}
          </p>
          <SondageBarChart sondage={latestSondage} />
        </CardContent>
      </Card>

      {/* Évolution temporelle */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution des intentions de vote</CardTitle>
        </CardHeader>
        <CardContent>
          <SondageEvolutionChart />
        </CardContent>
      </Card>

      {/* Détail par sondage */}
      <Card>
        <CardHeader>
          <CardTitle>Tous les sondages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {SONDAGES_PARIS_2026.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            ).map((sondage, index) => (
              <details
                key={index}
                className="border border-gray-200 rounded-lg"
                open={index === 0}
              >
                <summary className="p-4 cursor-pointer hover:bg-gray-100 transition-colors">
                  <span className="font-medium text-gray-900">
                    {sondage.institut} - {sondage.date}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({sondage.hypothese.slice(0, 40)}...)
                  </span>
                </summary>
                <div className="p-4 pt-0 border-t border-gray-200">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-gray-500">Commanditaire:</span>{" "}
                        {sondage.commanditaire}
                      </p>
                      <p>
                        <span className="text-gray-500">Échantillon:</span>{" "}
                        {sondage.echantillon} personnes
                      </p>
                      <p>
                        <span className="text-gray-500">Méthode:</span>{" "}
                        {sondage.methode}
                      </p>
                      <p>
                        <span className="text-gray-500">Hypothèse:</span>{" "}
                        {sondage.hypothese}
                      </p>
                      {sondage.sourceUrl && (
                        <a
                          href={sondage.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 mt-2"
                        >
                          Voir le sondage <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2">Candidat</th>
                            <th className="text-right py-2">Intentions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(sondage.scores)
                            .sort(([, a], [, b]) => b - a)
                            .map(([name, score]) => (
                              <tr
                                key={name}
                                className={`border-b border-gray-100 ${
                                  name === "Sarah Knafo"
                                    ? "bg-blue-50 font-bold"
                                    : ""
                                }`}
                              >
                                <td className="py-2 flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor:
                                        CANDIDATE_COLORS[name] || "#888",
                                    }}
                                  />
                                  {name}
                                </td>
                                <td className="text-right py-2">{score}%</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
