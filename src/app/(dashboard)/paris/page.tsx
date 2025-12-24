"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCandidatesStore } from "@/stores/candidates";
import { usePeriodStore, PERIOD_DAYS } from "@/stores/period";
import { PARIS_CANDIDATES } from "@/lib/candidates/paris";
import { Chatbot } from "@/components/ai/Chatbot";
import {
  ScoreBarChart,
  ScoreBreakdownChart,
  YouTubeChart,
  YouTubeScatterChart,
  WikipediaChart,
  SentimentChart,
  SentimentDetailTable,
} from "@/components/charts";
import { ThemesList, ThemesOverview } from "@/components/ai/ThemesList";
import { SondagesSection } from "@/components/charts/SondagesChart";
import { TvRadioSection } from "@/components/charts/TvRadioSection";
import {
  TrendingUp,
  Youtube,
  MessageSquare,
  Heart,
  Vote,
  BookOpen,
  Newspaper,
  Loader2,
  Tv,
  ChevronDown,
} from "lucide-react";

interface CandidateData {
  id: string;
  name: string;
  party: string;
  color: string;
  highlighted?: boolean;
  wikipedia: { views: number; variation: number };
  press: {
    count: number;
    domains: number;
    topMedia: string | null;
    articles: Array<{ title: string; url: string; domain: string; date: string }>;
  };
  youtube: {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    shortsViews: number;
    shortsLikes: number;
    shortsComments: number;
    shortsCount: number;
    longViews: number;
    longLikes: number;
    longComments: number;
    longCount: number;
  };
  score: {
    total: number;
    breakdown: { trends: number; press: number; wikipedia: number; youtube: number };
    contributions: { trends: number; press: number; wikipedia: number; youtube: number };
  };
}

async function fetchCandidateData(candidateId: string, days: number) {
  const candidate = PARIS_CANDIDATES[candidateId];
  if (!candidate) return null;

  const searchTerm = candidate.searchTerms[0];

  const [wikiRes, pressRes, ytRes] = await Promise.all([
    fetch(`/api/wikipedia?page=${encodeURIComponent(candidate.wikipedia)}&days=${days}`),
    fetch(`/api/press?q=${encodeURIComponent(searchTerm)}&days=${days}`),
    fetch(`/api/youtube?q=${encodeURIComponent(searchTerm)}&days=${days}`),
  ]);

  const [wiki, press, youtube] = await Promise.all([
    wikiRes.json(),
    pressRes.json(),
    ytRes.json(),
  ]);

  return {
    id: candidate.id,
    name: candidate.name,
    party: candidate.party,
    color: candidate.color,
    highlighted: candidate.highlighted,
    wikipedia: { views: wiki.views || 0, variation: wiki.variation || 0 },
    press: {
      count: press.count || 0,
      domains: press.domains || 0,
      topMedia: press.topMedia,
      articles: press.articles || [],
    },
    youtube: {
      totalViews: youtube.totalViews || 0,
      totalLikes: youtube.totalLikes || 0,
      totalComments: youtube.totalComments || 0,
      shortsViews: youtube.shortsViews || 0,
      shortsLikes: youtube.shortsLikes || 0,
      shortsComments: youtube.shortsComments || 0,
      shortsCount: youtube.shortsCount || 0,
      longViews: youtube.longVideosViews || 0,
      longLikes: youtube.longLikes || 0,
      longComments: youtube.longComments || 0,
      longCount: youtube.longCount || 0,
    },
  };
}

export default function ParisPage() {
  const { selectedParis } = useCandidatesStore();
  const { period } = usePeriodStore();
  const days = PERIOD_DAYS[period];

  const { data: candidatesData, isLoading } = useQuery({
    queryKey: ["paris-data", selectedParis, period],
    queryFn: async () => {
      const results = await Promise.all(
        selectedParis.map((id) => fetchCandidateData(id, days))
      );
      return results.filter(Boolean) as CandidateData[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Calculate scores
  const { data: scoresData } = useQuery({
    queryKey: ["paris-scores", candidatesData],
    queryFn: async () => {
      if (!candidatesData || candidatesData.length === 0) return null;
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: candidatesData.map((d) => ({
            id: d.id,
            name: d.name,
            trends: 50, // Placeholder
            pressCount: d.press.count,
            pressDomains: d.press.domains,
            wikipediaViews: d.wikipedia.views,
            youtubeViews: d.youtube.totalViews,
          })),
          period,
        }),
      });
      return res.json();
    },
    enabled: !!candidatesData && candidatesData.length > 0,
  });

  // Fetch sentiment data
  const { data: sentimentData, isLoading: sentimentLoading } = useQuery({
    queryKey: ["paris-sentiment", candidatesData],
    queryFn: async () => {
      if (!candidatesData || candidatesData.length === 0) return null;
      const results = await Promise.all(
        candidatesData.map(async (c) => {
          const titles = c.press.articles.slice(0, 15).map((a) => a.title);
          if (titles.length === 0) {
            return {
              name: c.name,
              sentiment: 0,
              count: 0,
              positive: 0,
              neutral: 0,
              negative: 0,
            };
          }
          const res = await fetch("/api/ai/sentiment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidateName: c.name, titles }),
          });
          const data = await res.json();
          return {
            name: c.name,
            sentiment: data.average || 0,
            count: data.total || titles.length,
            positive: data.positive || 0,
            neutral: data.neutral || 0,
            negative: data.negative || 0,
          };
        })
      );
      return results;
    },
    enabled: !!candidatesData && candidatesData.length > 0,
  });

  // Fetch themes data
  const { data: themesData, isLoading: themesLoading } = useQuery({
    queryKey: ["paris-themes", candidatesData],
    queryFn: async () => {
      if (!candidatesData || candidatesData.length === 0) return null;
      const results = await Promise.all(
        candidatesData.map(async (c) => {
          const titles = c.press.articles.slice(0, 15).map((a) => a.title);
          if (titles.length === 0)
            return { candidateName: c.name, themes: [], summary: "" };
          const res = await fetch("/api/ai/themes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidateName: c.name, titles }),
          });
          const data = await res.json();
          return {
            candidateName: c.name,
            themes: data.themes || [],
            summary: data.summary || "",
          };
        })
      );
      return results;
    },
    enabled: !!candidatesData && candidatesData.length > 0,
  });

  // Merge scores with candidate data
  const enrichedData = candidatesData?.map((c) => {
    const score = scoresData?.scores?.find((s: { id: string }) => s.id === c.id);
    return {
      ...c,
      score: score || {
        total: 0,
        breakdown: { trends: 0, press: 0, wikipedia: 0, youtube: 0 },
        contributions: { trends: 0, press: 0, wikipedia: 0, youtube: 0 },
      },
    };
  });

  // Sort by score
  const sortedData = enrichedData?.sort((a, b) => b.score.total - a.score.total);

  const selectedCandidates = selectedParis
    .map((id) => PARIS_CANDIDATES[id])
    .filter(Boolean);

  if (selectedCandidates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          Sélectionnez au moins un candidat dans la barre latérale.
        </p>
      </div>
    );
  }

  const leader = sortedData?.[0];
  const totalArticles = sortedData?.reduce((sum, c) => sum + c.press.count, 0) || 0;
  const totalWiki = sortedData?.reduce((sum, c) => sum + c.wikipedia.views, 0) || 0;

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
    return n.toLocaleString("fr-FR");
  };

  return (
    <div className="space-y-6">
      {/* Chatbot */}
      <Chatbot
        context={{
          candidates: sortedData?.reduce(
            (acc, c) => ({
              ...acc,
              [c.name]: {
                score: c.score.total,
                wikipedia: c.wikipedia.views,
                press: c.press.count,
                youtube: c.youtube.totalViews,
              },
            }),
            {}
          ),
        }}
      />

      {/* Title */}
      <div>
        <h1>Municipales Paris 2026</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Visibilité médiatique - {selectedCandidates.length} candidats
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500 text-sm">Chargement...</span>
        </div>
      )}

      {/* Metrics Cards */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Leader"
            value={leader?.name || "-"}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <MetricCard
            label="Score du leader"
            value={leader ? `${leader.score.total.toFixed(1)} / 100` : "-"}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <MetricCard
            label="Total articles"
            value={formatNumber(totalArticles)}
            icon={<Newspaper className="w-5 h-5" />}
          />
          <MetricCard
            label="Total Wikipedia"
            value={formatNumber(totalWiki)}
            icon={<BookOpen className="w-5 h-5" />}
          />
        </div>
      )}

      {/* Tabs */}
      {!isLoading && sortedData && (
        <Tabs defaultValue="scores" className="w-full">
          <TabsList className="flex-wrap">
            <TabsTrigger value="scores">
              <TrendingUp className="w-4 h-4 mr-1.5" />
              Scores
            </TabsTrigger>
            <TabsTrigger value="themes">
              <MessageSquare className="w-4 h-4 mr-1.5" />
              Thèmes
            </TabsTrigger>
            <TabsTrigger value="presse">
              <Newspaper className="w-4 h-4 mr-1.5" />
              Presse
            </TabsTrigger>
            <TabsTrigger value="sentiment">
              <Heart className="w-4 h-4 mr-1.5" />
              Sentiment
            </TabsTrigger>
            <TabsTrigger value="sondages">
              <Vote className="w-4 h-4 mr-1.5" />
              Sondages
            </TabsTrigger>
            <TabsTrigger value="tv-radio">
              <Tv className="w-4 h-4 mr-1.5" />
              TV/Radio
            </TabsTrigger>
            <TabsTrigger value="wikipedia">
              <BookOpen className="w-4 h-4 mr-1.5" />
              Wikipedia
            </TabsTrigger>
            <TabsTrigger value="youtube">
              <Youtube className="w-4 h-4 mr-1.5" />
              YouTube
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scores">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Score global</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScoreBarChart
                    data={sortedData.map((c) => ({
                      name: c.name,
                      score: c.score.total,
                      color: c.color,
                      highlighted: c.highlighted,
                    }))}
                    height={Math.max(250, sortedData.length * 40)}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Décomposition</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScoreBreakdownChart
                    data={sortedData.map((c) => ({
                      name: c.name,
                      trends: c.score.contributions.trends,
                      press: c.score.contributions.press,
                      wikipedia: c.score.contributions.wikipedia,
                      youtube: c.score.contributions.youtube,
                    }))}
                    height={Math.max(250, sortedData.length * 40)}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="youtube">
            <div className="space-y-6">
              {/* Row 1: Bar charts */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Vues totales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <YouTubeChart
                      data={sortedData.map((c) => ({
                        name: c.name,
                        totalViews: c.youtube.totalViews,
                        shortsViews: c.youtube.shortsViews,
                        longViews: c.youtube.longViews,
                        color: c.color,
                        highlighted: c.highlighted,
                      }))}
                      variant="total"
                      height={Math.max(250, sortedData.length * 40)}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Shorts vs Vidéos longues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <YouTubeChart
                      data={sortedData.map((c) => ({
                        name: c.name,
                        totalViews: c.youtube.totalViews,
                        shortsViews: c.youtube.shortsViews,
                        longViews: c.youtube.longViews,
                        color: c.color,
                        highlighted: c.highlighted,
                      }))}
                      variant="breakdown"
                      height={Math.max(250, sortedData.length * 40)}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Row 2: Scatter plots - Viralité */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Vues vs Taux de likes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <YouTubeScatterChart
                      data={sortedData.map((c) => ({
                        name: c.name,
                        color: c.color,
                        highlighted: c.highlighted,
                        shortsViews: c.youtube.shortsViews,
                        shortsLikes: c.youtube.shortsLikes,
                        shortsComments: c.youtube.shortsComments,
                        shortsCount: c.youtube.shortsCount,
                        longViews: c.youtube.longViews,
                        longLikes: c.youtube.longLikes,
                        longComments: c.youtube.longComments,
                        longCount: c.youtube.longCount,
                      }))}
                      variant="likes"
                      height={350}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Vues vs Taux de commentaires</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <YouTubeScatterChart
                      data={sortedData.map((c) => ({
                        name: c.name,
                        color: c.color,
                        highlighted: c.highlighted,
                        shortsViews: c.youtube.shortsViews,
                        shortsLikes: c.youtube.shortsLikes,
                        shortsComments: c.youtube.shortsComments,
                        shortsCount: c.youtube.shortsCount,
                        longViews: c.youtube.longViews,
                        longLikes: c.youtube.longLikes,
                        longComments: c.youtube.longComments,
                        longCount: c.youtube.longCount,
                      }))}
                      variant="comments"
                      height={350}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="themes">
            {themesLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500 text-sm">Analyse des thèmes...</span>
              </div>
            ) : themesData ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Vue d&apos;ensemble</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ThemesOverview
                      data={themesData.map((t) => ({
                        candidateName: t.candidateName,
                        themes: t.themes,
                        highlighted: sortedData.find((c) => c.name === t.candidateName)
                          ?.highlighted,
                      }))}
                    />
                  </CardContent>
                </Card>
                <div className="grid md:grid-cols-2 gap-6">
                  {themesData.map((t) => (
                    <ThemesList
                      key={t.candidateName}
                      candidateName={t.candidateName}
                      data={{ summary: t.summary, themes: t.themes }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  Pas assez d&apos;articles pour analyser les thèmes.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sentiment">
            {sentimentLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">
                  Analyse du sentiment en cours...
                </span>
              </div>
            ) : sentimentData ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Baromètre du sentiment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SentimentChart
                      data={sentimentData.map((s) => ({
                        name: s.name,
                        sentiment: s.sentiment,
                        color:
                          sortedData?.find((c) => c.name === s.name)?.color || "#22496A",
                        highlighted: sortedData?.find((c) => c.name === s.name)?.highlighted,
                      }))}
                      height={Math.max(250, sentimentData.length * 40)}
                    />
                    <p className="text-xs text-gray-500 mt-4 text-center">
                      Score de -1 (très négatif) à +1 (très positif), basé sur l&apos;analyse IA
                      des titres d&apos;articles
                    </p>
                  </CardContent>
                </Card>

                <SentimentDetailTable
                  data={sentimentData.map((s) => ({
                    name: s.name,
                    pressAvg: s.sentiment,
                    pressPositive: s.positive,
                    pressNeutral: s.neutral,
                    pressNegative: s.negative,
                    youtubeAvg: 0,
                    youtubePositive: 0,
                    youtubeNeutral: 0,
                    youtubeNegative: 0,
                    combinedAvg: s.sentiment,
                    highlighted: sortedData?.find((c) => c.name === s.name)?.highlighted,
                  }))}
                />
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  Pas assez d&apos;articles pour analyser le sentiment.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="wikipedia">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vues Wikipedia</CardTitle>
                </CardHeader>
                <CardContent>
                  <WikipediaChart
                    data={sortedData.map((c) => ({
                      name: c.name,
                      views: c.wikipedia.views,
                      variation: c.wikipedia.variation,
                      color: c.color,
                      highlighted: c.highlighted,
                    }))}
                    variant="views"
                    height={Math.max(250, sortedData.length * 40)}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Variation vs période précédente</CardTitle>
                </CardHeader>
                <CardContent>
                  <WikipediaChart
                    data={sortedData.map((c) => ({
                      name: c.name,
                      views: c.wikipedia.views,
                      variation: c.wikipedia.variation,
                      color: c.color,
                      highlighted: c.highlighted,
                    }))}
                    variant="variation"
                    height={Math.max(250, sortedData.length * 40)}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="presse">
            <Card>
              <CardHeader>
                <CardTitle>Articles de presse</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedData.map((c) => (
                    <ExpandablePressCard
                      key={c.id}
                      name={c.name}
                      color={c.color}
                      highlighted={c.highlighted}
                      count={c.press.count}
                      domains={c.press.domains}
                      topMedia={c.press.topMedia}
                      articles={c.press.articles}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sondages">
            <SondagesSection />
          </TabsContent>

          <TabsContent value="tv-radio">
            <TvRadioSection
              articles={sortedData.flatMap((c) =>
                c.press.articles.map((a) => ({
                  ...a,
                  candidate: c.name,
                }))
              )}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Ranking Table */}
      {!isLoading && sortedData && (
        <Card>
          <CardHeader>
            <CardTitle>Classement Général</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                      Rang
                    </th>
                    <th className="text-left py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                      Candidat
                    </th>
                    <th className="text-left py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                      Parti
                    </th>
                    <th className="text-right py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                      Score
                    </th>
                    <th className="text-right py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                      Presse
                    </th>
                    <th className="text-right py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                      Wikipedia
                    </th>
                    <th className="text-right py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                      YouTube
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((candidate, index) => (
                    <tr
                      key={candidate.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        candidate.highlighted ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="py-3 px-2 font-bold text-gray-900">{index + 1}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: candidate.color }}
                          />
                          <span
                            className={candidate.highlighted ? "font-bold text-blue-600" : ""}
                          >
                            {candidate.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-600">{candidate.party}</td>
                      <td className="py-3 px-2 text-right font-bold">
                        {candidate.score.total.toFixed(1)}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-600">
                        {candidate.press.count}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-600">
                        {formatNumber(candidate.wikipedia.views)}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-600">
                        {formatNumber(candidate.youtube.totalViews)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function MetricCard({ label, value, icon }: MetricCardProps) {
  return (
    <Card className="card-hover">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 text-gray-600">{icon}</div>
          <div>
            <p className="text-xs uppercase text-gray-500">{label}</p>
            <p className="text-base font-semibold text-gray-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ExpandablePressCardProps {
  name: string;
  color: string;
  highlighted?: boolean;
  count: number;
  domains: number;
  topMedia: string | null;
  articles: Array<{ title: string; url: string; domain: string; date: string }>;
}

function ExpandablePressCard({
  name,
  color,
  highlighted,
  count,
  domains,
  topMedia,
  articles,
}: ExpandablePressCardProps) {
  const [expanded, setExpanded] = useState(false);
  const displayArticles = expanded ? articles : articles.slice(0, 3);

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        highlighted ? "border-blue-200 bg-blue-50" : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className={highlighted ? "font-bold text-blue-600" : "font-medium"}>
            {name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {count} articles • {domains} sources
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>
      {topMedia && (
        <p className="text-xs text-gray-500 mb-2">Top média: {topMedia}</p>
      )}
      <div className="space-y-1">
        {displayArticles.map((article, i) => (
          <a
            key={i}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="block text-sm text-gray-700 hover:text-blue-600 truncate"
          >
            → {article.title}
          </a>
        ))}
      </div>
      {!expanded && articles.length > 3 && (
        <p className="text-xs text-blue-600 mt-2">
          + {articles.length - 3} autres articles
        </p>
      )}
    </div>
  );
}
