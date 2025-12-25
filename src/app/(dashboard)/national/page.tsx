"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportableCard } from "@/components/ui/ExportableCard";
import { useCandidatesStore } from "@/stores/candidates";
import { usePeriodStore, PERIOD_DAYS } from "@/stores/period";
import { NATIONAL_CANDIDATES } from "@/lib/candidates/national";
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
import { TvRadioSection } from "@/components/charts/TvRadioSection";
import {
  TrendingUp,
  Youtube,
  MessageSquare,
  Heart,
  Tv,
  History,
  BookOpen,
  Newspaper,
  Loader2,
  ChevronDown,
  ExternalLink,
  Download,
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
    videos: Array<{ title: string }>;
  };
  score: {
    total: number;
    breakdown: { trends: number; press: number; wikipedia: number; youtube: number };
    contributions: { trends: number; press: number; wikipedia: number; youtube: number };
  };
}

async function fetchCandidateData(candidateId: string, days: number) {
  const candidate = NATIONAL_CANDIDATES[candidateId];
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
      videos: (youtube.videos || []).map((v: { title: string }) => ({ title: v.title })),
    },
  };
}

export default function NationalPage() {
  const { selectedNational } = useCandidatesStore();
  const { period } = usePeriodStore();
  const days = PERIOD_DAYS[period];
  const tableRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportToPng = useCallback(async () => {
    if (!tableRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `classement-national-${period}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [period]);

  const { data: candidatesData, isLoading } = useQuery({
    queryKey: ["national-data", selectedNational, period],
    queryFn: async () => {
      const results = await Promise.all(
        selectedNational.map((id) => fetchCandidateData(id, days))
      );
      return results.filter(Boolean) as CandidateData[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Google Trends data
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ["national-trends", selectedNational, period],
    queryFn: async () => {
      const keywords = selectedNational
        .map((id) => NATIONAL_CANDIDATES[id]?.searchTerms[0])
        .filter(Boolean);
      if (keywords.length === 0) return null;
      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, days }),
      });
      return res.json();
    },
    staleTime: 30 * 60 * 1000, // 30 min
  });

  // Calculate scores
  const { data: scoresData } = useQuery({
    queryKey: ["national-scores", candidatesData, trendsData],
    queryFn: async () => {
      if (!candidatesData || candidatesData.length === 0) return null;
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: candidatesData.map((d) => {
            const searchTerm = NATIONAL_CANDIDATES[d.id]?.searchTerms[0];
            const trendsScore = trendsData?.scores?.[searchTerm] ?? 0;
            return {
              id: d.id,
              name: d.name,
              trends: trendsScore,
              pressCount: d.press.count,
              pressDomains: d.press.domains,
              wikipediaViews: d.wikipedia.views,
              youtubeViews: d.youtube.totalViews,
            };
          }),
          period,
        }),
      });
      return res.json();
    },
    enabled: !!candidatesData && candidatesData.length > 0,
  });

  // Fetch sentiment data (press + youtube)
  const { data: sentimentData, isLoading: sentimentLoading } = useQuery({
    queryKey: ["national-sentiment", candidatesData],
    queryFn: async () => {
      if (!candidatesData || candidatesData.length === 0) return null;
      const results = await Promise.all(
        candidatesData.map(async (c) => {
          const pressTitles = c.press.articles.slice(0, 50).map((a) => a.title);
          const youtubeTitles = c.youtube.videos.slice(0, 50).map((v) => v.title);

          // Fetch press sentiment
          let pressData = { average: 0, positive: 0, neutral: 0, negative: 0, total: 0 };
          if (pressTitles.length > 0) {
            const res = await fetch("/api/ai/sentiment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ candidateName: c.name, titles: pressTitles, source: "press" }),
            });
            pressData = await res.json();
          }

          // Fetch youtube sentiment
          let youtubeData = { average: 0, positive: 0, neutral: 0, negative: 0, total: 0 };
          if (youtubeTitles.length > 0) {
            const res = await fetch("/api/ai/sentiment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ candidateName: c.name, titles: youtubeTitles, source: "youtube" }),
            });
            youtubeData = await res.json();
          }

          // Calculate combined average
          const pressWeight = pressData.total || 0;
          const youtubeWeight = youtubeData.total || 0;
          const totalWeight = pressWeight + youtubeWeight;
          const combinedAvg = totalWeight > 0
            ? (pressData.average * pressWeight + youtubeData.average * youtubeWeight) / totalWeight
            : 0;

          return {
            name: c.name,
            pressSentiment: pressData.average || 0,
            pressPositive: pressData.positive || 0,
            pressNeutral: pressData.neutral || 0,
            pressNegative: pressData.negative || 0,
            youtubeSentiment: youtubeData.average || 0,
            youtubePositive: youtubeData.positive || 0,
            youtubeNeutral: youtubeData.neutral || 0,
            youtubeNegative: youtubeData.negative || 0,
            combinedAvg,
          };
        })
      );
      return results;
    },
    enabled: !!candidatesData && candidatesData.length > 0,
  });

  // Fetch themes data
  const { data: themesData, isLoading: themesLoading } = useQuery({
    queryKey: ["national-themes", candidatesData],
    queryFn: async () => {
      if (!candidatesData || candidatesData.length === 0) return null;
      const results = await Promise.all(
        candidatesData.map(async (c) => {
          const pressTitles = c.press.articles.slice(0, 50).map((a) => a.title);
          const youtubeTitles = c.youtube.videos.slice(0, 50).map((v) => v.title);
          if (pressTitles.length === 0 && youtubeTitles.length === 0) return { candidateName: c.name, themes: [], summary: "" };
          const res = await fetch("/api/ai/themes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidateName: c.name, pressTitles, youtubeTitles }),
          });
          const data = await res.json();
          return { candidateName: c.name, themes: data.themes || [], summary: data.summary || "" };
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

  const selectedCandidates = selectedNational
    .map((id) => NATIONAL_CANDIDATES[id])
    .filter(Boolean);

  if (selectedCandidates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          Sélectionnez au moins une personnalité dans la barre latérale.
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
        period={days}
        context={{
          periode: period,
          candidates: sortedData?.reduce(
            (acc, c) => {
              const sentiment = sentimentData?.find((s) => s.name === c.name);
              const themes = themesData?.find((t) => t.candidateName === c.name);
              return {
                ...acc,
                [c.name]: {
                  parti: c.party,
                  score: {
                    total: c.score.total,
                    breakdown: c.score.breakdown,
                  },
                  wikipedia: {
                    vues: c.wikipedia.views,
                    variation: c.wikipedia.variation,
                  },
                  presse: {
                    articles: c.press.count,
                    sources: c.press.domains,
                    topMedia: c.press.topMedia,
                    titres: c.press.articles.slice(0, 10).map((a) => a.title),
                  },
                  youtube: {
                    vuesTotal: c.youtube.totalViews,
                    vuesShorts: c.youtube.shortsViews,
                    vuesLong: c.youtube.longViews,
                    likes: c.youtube.totalLikes,
                    commentaires: c.youtube.totalComments,
                    titres: c.youtube.videos.slice(0, 10).map((v) => v.title),
                  },
                  sentiment: sentiment ? {
                    presse: {
                      moyenne: sentiment.pressSentiment,
                      positif: sentiment.pressPositive,
                      neutre: sentiment.pressNeutral,
                      negatif: sentiment.pressNegative,
                    },
                    youtube: {
                      moyenne: sentiment.youtubeSentiment,
                      positif: sentiment.youtubePositive,
                      neutre: sentiment.youtubeNeutral,
                      negatif: sentiment.youtubeNegative,
                    },
                    combine: sentiment.combinedAvg,
                  } : null,
                  themes: themes ? {
                    resume: themes.summary,
                    liste: themes.themes,
                  } : null,
                },
              };
            },
            {}
          ),
        }}
      />

      {/* Title */}
      <div>
        <h1>Politique Nationale</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Visibilité médiatique - {selectedCandidates.length} personnalités
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
          <TabsList className="flex-wrap sticky top-12 md:top-14 z-40 bg-gray-100 -mx-3 md:-mx-4 lg:-mx-6 px-3 md:px-4 lg:px-6 py-2">
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
            <TabsTrigger value="historique">
              <History className="w-4 h-4 mr-1.5" />
              Historique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scores">
            <div className="space-y-6">
              {/* Ranking Table with Themes */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Classement général</CardTitle>
                  <button
                    onClick={exportToPng}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    PNG
                  </button>
                </CardHeader>
                <CardContent>
                  <div ref={tableRef} className="overflow-x-auto bg-white p-4">
                    <div className="text-center mb-4">
                      <h2 className="text-lg font-bold text-gray-900">Présidentielle 2027</h2>
                      <p className="text-sm text-gray-500">Classement visibilité médiatique • {period}</p>
                    </div>
                    <table className="w-full text-sm min-w-[900px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                            #
                          </th>
                          <th className="text-left py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                            Candidat
                          </th>
                          <th className="text-right py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                            Score
                          </th>
                          <th className="text-right py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                            Trends
                          </th>
                          <th className="text-right py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                            Presse
                          </th>
                          <th className="text-right py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                            Sources
                          </th>
                          <th className="text-left py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                            Top média
                          </th>
                          <th className="text-right py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                            Wikipedia
                          </th>
                          <th className="text-right py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                            YouTube
                          </th>
                          <th className="text-center py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                            Sentiment
                          </th>
                          <th className="text-left py-3 px-2 font-medium uppercase tracking-wide text-xs text-gray-500">
                            Thèmes
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedData.map((candidate, index) => {
                          const candidateThemes = themesData?.find(
                            (t) => t.candidateName === candidate.name
                          )?.themes || [];
                          const candidateSentiment = sentimentData?.find(
                            (s) => s.name === candidate.name
                          );
                          const sentimentScore = candidateSentiment?.combinedAvg || 0;
                          const sentimentDisplay = sentimentScore > 0.15 ? "+" : sentimentScore < -0.15 ? "−" : "○";
                          const sentimentColor = sentimentScore > 0.15 ? "text-green-600 bg-green-50" : sentimentScore < -0.15 ? "text-red-600 bg-red-50" : "text-gray-600 bg-gray-100";
                          return (
                            <tr
                              key={candidate.id}
                              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                candidate.highlighted ? "bg-blue-50" : ""
                              }`}
                            >
                              <td className="py-3 px-2 font-bold text-gray-900">
                                {index + 1}
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: candidate.color }}
                                  />
                                  <span
                                    className={
                                      candidate.highlighted
                                        ? "font-bold text-blue-600"
                                        : ""
                                    }
                                  >
                                    {candidate.name}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right font-bold">
                                {candidate.score.total.toFixed(1)}
                              </td>
                              <td className="py-3 px-2 text-right text-gray-700">
                                {(() => {
                                  const searchTerm = NATIONAL_CANDIDATES[candidate.id]?.searchTerms[0];
                                  const score = trendsData?.scores?.[searchTerm];
                                  return score !== undefined ? score.toFixed(0) : "-";
                                })()}
                              </td>
                              <td className="py-3 px-2 text-right text-gray-700">
                                {candidate.press.count}
                              </td>
                              <td className="py-3 px-2 text-right text-gray-700">
                                {candidate.press.domains}
                              </td>
                              <td className="py-3 px-2 text-gray-700 text-xs max-w-[100px] truncate">
                                {candidate.press.topMedia || "-"}
                              </td>
                              <td className="py-3 px-2 text-right text-gray-700">
                                {formatNumber(candidate.wikipedia.views)}
                              </td>
                              <td className="py-3 px-2 text-right text-gray-700">
                                {formatNumber(candidate.youtube.totalViews)}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className={`inline-block w-6 h-6 rounded-full text-sm font-bold leading-6 ${sentimentColor}`}>
                                  {sentimentDisplay}
                                </span>
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex flex-wrap gap-1">
                                  {candidateThemes.slice(0, 2).map((theme: { theme: string; count: number; tone: string }, i: number) => (
                                    <span
                                      key={i}
                                      className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded ${
                                        theme.tone === "positif"
                                          ? "text-green-600 bg-green-50"
                                          : theme.tone === "négatif"
                                          ? "text-red-600 bg-red-50"
                                          : "text-gray-600 bg-gray-100"
                                      }`}
                                    >
                                      {theme.theme}
                                    </span>
                                  ))}
                                  {candidateThemes.length === 0 && !themesLoading && (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Charts */}
              <div className="grid md:grid-cols-2 gap-6">
                <ExportableCard title="Score global" filename={`national-score-global-${period}`}>
                  <ScoreBarChart
                    data={sortedData.map((c) => ({
                      name: c.name,
                      score: c.score.total,
                      color: c.color,
                      highlighted: c.highlighted,
                    }))}
                    height={Math.max(300, sortedData.length * 35)}
                  />
                </ExportableCard>
                <ExportableCard title="Décomposition" filename={`national-decomposition-${period}`}>
                  <ScoreBreakdownChart
                    data={sortedData.map((c) => ({
                      name: c.name,
                      trends: c.score.contributions.trends,
                      press: c.score.contributions.press,
                      wikipedia: c.score.contributions.wikipedia,
                      youtube: c.score.contributions.youtube,
                    }))}
                    height={Math.max(300, sortedData.length * 35)}
                  />
                </ExportableCard>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="youtube">
            <div className="space-y-6">
              {/* Row 1: Bar charts */}
              <div className="grid md:grid-cols-2 gap-6">
                <ExportableCard title="Vues totales" filename={`national-youtube-vues-${period}`}>
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
                    height={Math.max(300, sortedData.length * 35)}
                  />
                </ExportableCard>
                <ExportableCard title="Shorts vs Vidéos longues" filename={`national-youtube-breakdown-${period}`}>
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
                    height={Math.max(300, sortedData.length * 35)}
                  />
                </ExportableCard>
              </div>

              {/* Row 2: Scatter plots - Viralité */}
              <div className="grid md:grid-cols-2 gap-6">
                <ExportableCard title="Vues vs Taux de likes" filename={`national-youtube-likes-${period}`}>
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
                </ExportableCard>
                <ExportableCard title="Vues vs Taux de commentaires" filename={`national-youtube-comments-${period}`}>
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
                </ExportableCard>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="themes">
            {themesLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Analyse des thèmes en cours...</span>
              </div>
            ) : themesData ? (
              <div className="space-y-6">
                <ExportableCard title="Vue d'ensemble" filename={`national-themes-overview-${period}`}>
                  <ThemesOverview
                    data={themesData.map((t) => ({
                      candidateName: t.candidateName,
                      themes: t.themes,
                      highlighted: sortedData.find((c) => c.name === t.candidateName)?.highlighted,
                    }))}
                  />
                </ExportableCard>
                <div className="grid md:grid-cols-2 gap-6">
                  {[...themesData]
                    .sort((a, b) => {
                      // Put highlighted (Knafo) first
                      const aHighlighted = sortedData.find(c => c.name === a.candidateName)?.highlighted;
                      const bHighlighted = sortedData.find(c => c.name === b.candidateName)?.highlighted;
                      if (aHighlighted && !bHighlighted) return -1;
                      if (!aHighlighted && bHighlighted) return 1;
                      return 0;
                    })
                    .map((t) => (
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
                <span className="ml-2 text-gray-600">Analyse du sentiment en cours...</span>
              </div>
            ) : sentimentData ? (
              <div className="space-y-6">
                <ExportableCard title="Baromètre du sentiment" filename={`national-sentiment-${period}`}>
                  <SentimentChart
                    data={sentimentData.map((s) => ({
                      name: s.name,
                      sentiment: s.combinedAvg,
                      color:
                        sortedData?.find((c) => c.name === s.name)?.color || "#22496A",
                      highlighted: sortedData?.find((c) => c.name === s.name)?.highlighted,
                    }))}
                    height={Math.max(250, sentimentData.length * 40)}
                  />
                  <p className="text-xs text-gray-500 mt-4 text-center">
                    Score de -1 (très négatif) à +1 (très positif), basé sur l&apos;analyse IA des
                    titres d&apos;articles
                  </p>
                </ExportableCard>

                <SentimentDetailTable
                  data={sentimentData.map((s) => ({
                    name: s.name,
                    pressAvg: s.pressSentiment,
                    pressPositive: s.pressPositive,
                    pressNeutral: s.pressNeutral,
                    pressNegative: s.pressNegative,
                    youtubeAvg: s.youtubeSentiment,
                    youtubePositive: s.youtubePositive,
                    youtubeNeutral: s.youtubeNeutral,
                    youtubeNegative: s.youtubeNegative,
                    combinedAvg: s.combinedAvg,
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

          <TabsContent value="historique">
            <Card>
              <CardHeader>
                <CardTitle>Historique</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  L&apos;historique des scores sera disponible après quelques jours de collecte de
                  données.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wikipedia">
            <div className="grid md:grid-cols-2 gap-6">
              <ExportableCard title="Vues Wikipedia" filename={`national-wikipedia-vues-${period}`}>
                <WikipediaChart
                  data={sortedData.map((c) => ({
                    name: c.name,
                    views: c.wikipedia.views,
                    variation: c.wikipedia.variation,
                    color: c.color,
                    highlighted: c.highlighted,
                  }))}
                  variant="views"
                  height={Math.max(300, sortedData.length * 35)}
                />
              </ExportableCard>
              <ExportableCard title="Variation vs période précédente" filename={`national-wikipedia-variation-${period}`}>
                <WikipediaChart
                  data={sortedData.map((c) => ({
                    name: c.name,
                    views: c.wikipedia.views,
                    variation: c.wikipedia.variation,
                    color: c.color,
                    highlighted: c.highlighted,
                  }))}
                  variant="variation"
                  height={Math.max(300, sortedData.length * 35)}
                />
              </ExportableCard>
            </div>
          </TabsContent>

          <TabsContent value="presse">
            <ExportableCard title="Articles de presse" filename={`national-presse-${period}`}>
              <div className="space-y-4">
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
            </ExportableCard>
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
                      Personnalité
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
                          <span className={candidate.highlighted ? "font-bold text-blue-600" : ""}>
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
        highlighted
          ? "border-blue-200 bg-blue-50 hover:bg-blue-100"
          : "border-gray-200 hover:bg-gray-50"
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
            className={`w-4 h-4 text-gray-400 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
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
            className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-blue-600 group"
          >
            <span className="truncate">→ {article.title}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
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
