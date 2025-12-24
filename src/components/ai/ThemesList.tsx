"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Theme {
  theme: string;
  count: number;
  tone: "positif" | "neutre" | "négatif";
  examples: string[];
}

interface ThemesData {
  summary: string;
  themes: Theme[];
}

interface ThemesListProps {
  candidateName: string;
  data: ThemesData | null;
  isLoading?: boolean;
}

function getToneIndicator(tone: string): string {
  switch (tone) {
    case "positif":
      return "+";
    case "négatif":
      return "-";
    default:
      return "○";
  }
}

function getToneColor(tone: string): string {
  switch (tone) {
    case "positif":
      return "text-green-600 bg-green-50";
    case "négatif":
      return "text-red-600 bg-red-50";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

export function ThemesList({ candidateName, data, isLoading }: ThemesListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{candidateName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.themes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{candidateName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">
            Aucun thème identifié pour cette période.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{candidateName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        {data.summary && (
          <p className="text-sm text-gray-700 leading-relaxed border-l-2 border-blue-500 pl-3">
            {data.summary}
          </p>
        )}

        {/* Themes */}
        <div className="space-y-2">
          {data.themes.map((theme, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getToneColor(theme.tone)}`}>
                  {getToneIndicator(theme.tone)}
                </span>
                <span className="font-medium text-gray-900 text-sm">{theme.theme}</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {theme.count}
                </span>
              </div>
              {theme.examples.length > 0 && (
                <div className="pl-6 space-y-0.5">
                  {theme.examples.map((example, i) => (
                    <p
                      key={i}
                      className="text-xs text-gray-500"
                    >
                      → {example}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Overview table component showing top themes for all candidates
interface ThemesOverviewProps {
  data: Array<{
    candidateName: string;
    themes: Theme[];
    highlighted?: boolean;
  }>;
}

export function ThemesOverview({ data }: ThemesOverviewProps) {
  // Sort to put highlighted candidate (Knafo) first
  const sortedData = [...data].sort((a, b) => {
    if (a.highlighted && !b.highlighted) return -1;
    if (!a.highlighted && b.highlighted) return 1;
    return 0;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-2 font-medium text-xs text-gray-500 uppercase tracking-wide">
              Candidat
            </th>
            <th className="text-left py-2 px-2 font-medium text-xs text-gray-500 uppercase tracking-wide">
              Thèmes principaux
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, index) => (
            <tr
              key={index}
              className={`border-b border-gray-100 ${
                item.highlighted ? "bg-blue-50" : ""
              }`}
            >
              <td className={`py-2 px-2 ${item.highlighted ? "font-semibold text-blue-600" : "text-gray-900"}`}>
                {item.candidateName}
              </td>
              <td className="py-2 px-2">
                <div className="flex flex-wrap gap-1.5">
                  {item.themes.slice(0, 3).map((theme, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${getToneColor(theme.tone)}`}
                    >
                      {theme.theme}
                      <span className="opacity-70">({theme.count})</span>
                    </span>
                  ))}
                  {item.themes.length === 0 && (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
