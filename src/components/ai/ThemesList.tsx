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

function getToneEmoji(tone: string): string {
  switch (tone) {
    case "positif":
      return "🟢";
    case "négatif":
      return "🔴";
    default:
      return "⚪";
  }
}

function getToneColor(tone: string): string {
  switch (tone) {
    case "positif":
      return "text-green-600";
    case "négatif":
      return "text-brand-pink";
    default:
      return "text-brand-blue/70";
  }
}

export function ThemesList({ candidateName, data, isLoading }: ThemesListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{candidateName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-brand-blue/10 rounded w-3/4" />
            <div className="h-4 bg-brand-blue/10 rounded w-1/2" />
            <div className="h-4 bg-brand-blue/10 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.themes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{candidateName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-brand-blue/50 text-sm">
            Aucun thème identifié pour cette période.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{candidateName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {data.summary && (
          <p className="text-sm text-brand-blue leading-relaxed border-l-2 border-brand-pink pl-3">
            {data.summary}
          </p>
        )}

        {/* Themes */}
        <div className="space-y-3">
          {data.themes.map((theme, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2">
                <span>{getToneEmoji(theme.tone)}</span>
                <span className="font-medium text-brand-blue">{theme.theme}</span>
                <span className="text-xs text-brand-blue/50 bg-brand-blue/5 px-2 py-0.5 rounded">
                  {theme.count} mention{theme.count > 1 ? "s" : ""}
                </span>
                <span className={`text-xs ${getToneColor(theme.tone)}`}>
                  {theme.tone}
                </span>
              </div>
              {theme.examples.length > 0 && (
                <div className="pl-6 space-y-1">
                  {theme.examples.map((example, i) => (
                    <p
                      key={i}
                      className="text-xs text-brand-blue/60 before:content-['→_'] before:text-brand-pink"
                    >
                      {example}
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
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-blue/10">
            <th className="text-left py-3 px-2 font-myriad uppercase text-xs text-brand-blue/50">
              Candidat
            </th>
            <th className="text-left py-3 px-2 font-myriad uppercase text-xs text-brand-blue/50">
              Thèmes principaux
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={index}
              className={`border-b border-brand-blue/5 ${
                item.highlighted ? "bg-brand-pink/5" : ""
              }`}
            >
              <td className={`py-3 px-2 ${item.highlighted ? "font-bold text-brand-pink" : ""}`}>
                {item.candidateName}
              </td>
              <td className="py-3 px-2">
                <div className="flex flex-wrap gap-2">
                  {item.themes.slice(0, 3).map((theme, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs bg-brand-blue/5 px-2 py-1 rounded"
                    >
                      {getToneEmoji(theme.tone)} {theme.theme}
                      <span className="text-brand-blue/50">({theme.count})</span>
                    </span>
                  ))}
                  {item.themes.length === 0 && (
                    <span className="text-brand-blue/50">-</span>
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
