"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SentimentDetailData {
  name: string;
  pressAvg: number;
  pressPositive: number;
  pressNeutral: number;
  pressNegative: number;
  youtubeAvg: number;
  youtubePositive: number;
  youtubeNeutral: number;
  youtubeNegative: number;
  combinedAvg: number;
  highlighted?: boolean;
}

interface SentimentDetailTableProps {
  data: SentimentDetailData[];
}

function formatSentiment(value: number): string {
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function getSentimentColorClass(value: number): string {
  if (value > 0.2) return "text-green-600";
  if (value < -0.2) return "text-brand-pink";
  return "text-brand-blue/70";
}

export function SentimentDetailTable({ data }: SentimentDetailTableProps) {
  // Sort by combined sentiment
  const sortedData = [...data].sort((a, b) => b.combinedAvg - a.combinedAvg);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Détail par source</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-blue/10">
                <th className="text-left py-3 px-2 font-myriad uppercase text-xs text-brand-blue/50">
                  Candidat
                </th>
                <th className="text-center py-3 px-2 font-myriad uppercase text-xs text-brand-blue/50">
                  Presse (avg)
                </th>
                <th className="text-center py-3 px-2 font-myriad uppercase text-xs text-brand-blue/50">
                  <span className="text-green-600">+</span> / ⚪ / <span className="text-brand-pink">-</span>
                </th>
                <th className="text-center py-3 px-2 font-myriad uppercase text-xs text-brand-blue/50">
                  YouTube (avg)
                </th>
                <th className="text-center py-3 px-2 font-myriad uppercase text-xs text-brand-blue/50">
                  <span className="text-green-600">+</span> / ⚪ / <span className="text-brand-pink">-</span>
                </th>
                <th className="text-center py-3 px-2 font-myriad uppercase text-xs text-brand-blue/50">
                  Combiné
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, index) => {
                const pressTotal = item.pressPositive + item.pressNeutral + item.pressNegative;
                const youtubeTotal = item.youtubePositive + item.youtubeNeutral + item.youtubeNegative;

                return (
                  <tr
                    key={index}
                    className={`border-b border-brand-blue/5 ${
                      item.highlighted ? "bg-brand-pink/5" : ""
                    }`}
                  >
                    <td className={`py-3 px-2 ${item.highlighted ? "font-bold text-brand-pink" : ""}`}>
                      {item.name}
                    </td>
                    <td className={`py-3 px-2 text-center font-medium ${getSentimentColorClass(item.pressAvg)}`}>
                      {pressTotal > 0 ? formatSentiment(item.pressAvg) : "-"}
                    </td>
                    <td className="py-3 px-2 text-center text-xs">
                      {pressTotal > 0 ? (
                        <span>
                          <span className="text-green-600">{item.pressPositive}</span>
                          {" / "}
                          <span className="text-brand-blue/50">{item.pressNeutral}</span>
                          {" / "}
                          <span className="text-brand-pink">{item.pressNegative}</span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className={`py-3 px-2 text-center font-medium ${getSentimentColorClass(item.youtubeAvg)}`}>
                      {youtubeTotal > 0 ? formatSentiment(item.youtubeAvg) : "-"}
                    </td>
                    <td className="py-3 px-2 text-center text-xs">
                      {youtubeTotal > 0 ? (
                        <span>
                          <span className="text-green-600">{item.youtubePositive}</span>
                          {" / "}
                          <span className="text-brand-blue/50">{item.youtubeNeutral}</span>
                          {" / "}
                          <span className="text-brand-pink">{item.youtubeNegative}</span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className={`py-3 px-2 text-center font-bold ${getSentimentColorClass(item.combinedAvg)}`}>
                      {formatSentiment(item.combinedAvg)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-brand-blue/50 mt-4 text-center">
          Score combiné = Presse (50%) + YouTube (50%) · Échelle: -1 (négatif) à +1 (positif)
        </p>
      </CardContent>
    </Card>
  );
}
