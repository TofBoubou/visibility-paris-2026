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
  if (value < -0.2) return "text-red-600";
  return "text-gray-600";
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
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium uppercase text-xs text-gray-500">
                  Candidat
                </th>
                <th className="text-center py-3 px-2 font-medium uppercase text-xs text-gray-500">
                  Presse (avg)
                </th>
                <th className="text-center py-3 px-2 font-medium text-xs">
                  <span className="text-green-600">+</span>
                  {" / "}
                  <span className="text-gray-500">=</span>
                  {" / "}
                  <span className="text-red-600">−</span>
                </th>
                <th className="text-center py-3 px-2 font-medium uppercase text-xs text-gray-500">
                  YouTube (avg)
                </th>
                <th className="text-center py-3 px-2 font-medium text-xs">
                  <span className="text-green-600">+</span>
                  {" / "}
                  <span className="text-gray-500">=</span>
                  {" / "}
                  <span className="text-red-600">−</span>
                </th>
                <th className="text-center py-3 px-2 font-medium uppercase text-xs text-gray-500">
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
                    className={`border-b border-gray-100 ${
                      item.highlighted ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className={`py-3 px-2 ${item.highlighted ? "font-bold text-blue-600" : ""}`}>
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
                          <span className="text-gray-500">{item.pressNeutral}</span>
                          {" / "}
                          <span className="text-red-600">{item.pressNegative}</span>
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
                          <span className="text-gray-500">{item.youtubeNeutral}</span>
                          {" / "}
                          <span className="text-red-600">{item.youtubeNegative}</span>
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
        <p className="text-xs text-gray-500 mt-4 text-center">
          Score combiné = Presse (50%) + YouTube (50%) · Échelle: -1 (négatif) à +1 (positif)
        </p>
      </CardContent>
    </Card>
  );
}
