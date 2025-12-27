"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChevronDown, Loader2, MapPin, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ExportableCard } from "@/components/ui/ExportableCard";

interface Candidate {
  id: string;
  name: string;
  searchTerm: string;
  color: string;
}

interface GeoTabProps {
  allCandidates: Candidate[];
  days: number;
  period: string;
}

export function GeoTab({ allCandidates, days, period }: GeoTabProps) {
  // Internal selection of candidates to compare (max 5)
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    allCandidates.slice(0, 5).map(c => c.id)
  );
  const [selectedRegion, setSelectedRegion] = useState<string>("");

  const selectedCandidates = useMemo(
    () => allCandidates.filter(c => selectedIds.includes(c.id)),
    [allCandidates, selectedIds]
  );

  const toggleCandidate = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 5) {
        return prev; // Max 5
      }
      return [...prev, id];
    });
  };

  // Fetch geo data for selected candidates
  const { data: geoData, isLoading } = useQuery({
    queryKey: ["geo-comparison", selectedIds.sort().join(","), days],
    queryFn: async () => {
      const keywords = selectedCandidates.map(c => c.searchTerm);
      if (keywords.length === 0) return null;

      console.log("[GeoTab] Fetching for:", keywords);
      const res = await fetch("/api/trends/geo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords,
          geo: "FR",
          days,
          resolution: "REGION",
          comparative: true,
        }),
      });

      const data = await res.json();
      console.log("[GeoTab] Response:", {
        regions: Object.keys(data.results || {}).length,
        rateLimited: data.rateLimited,
        error: data.error,
      });
      return data;
    },
    staleTime: 30 * 60 * 1000,
    enabled: selectedIds.length > 0 && selectedIds.length <= 5,
  });

  const regions = useMemo(
    () => Object.keys(geoData?.results || {}).sort(),
    [geoData]
  );

  // Set default region when data loads
  useMemo(() => {
    if (regions.length > 0 && !selectedRegion) {
      setSelectedRegion(regions[0]);
    }
  }, [regions, selectedRegion]);

  // Build chart data for selected region
  const chartData = useMemo(() => {
    if (!selectedRegion || !geoData?.results?.[selectedRegion]) return [];

    const regionData = geoData.results[selectedRegion];
    return selectedCandidates
      .map((candidate) => ({
        name: candidate.name,
        score: regionData[candidate.searchTerm] || 0,
        color: candidate.color,
      }))
      .sort((a, b) => b.score - a.score);
  }, [selectedRegion, geoData, selectedCandidates]);

  // Build individual candidate data (all regions for each candidate)
  const individualData = useMemo(() => {
    if (!geoData?.results) return [];

    return selectedCandidates.map(candidate => {
      const regionScores = Object.entries(geoData.results)
        .map(([region, scores]) => ({
          name: region,
          score: (scores as Record<string, number>)[candidate.searchTerm] || 0,
        }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score);

      return {
        ...candidate,
        regions: regionScores,
      };
    });
  }, [geoData, selectedCandidates]);

  return (
    <div className="space-y-6">
      {/* Candidate selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-sm font-medium text-gray-700">
              Candidats à comparer ({selectedIds.length}/5) :
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allCandidates.map((candidate) => {
              const isSelected = selectedIds.includes(candidate.id);
              const isDisabled = !isSelected && selectedIds.length >= 5;
              return (
                <button
                  key={candidate.id}
                  onClick={() => toggleCandidate(candidate.id)}
                  disabled={isDisabled}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                    transition-all border
                    ${isSelected
                      ? "border-transparent text-white"
                      : isDisabled
                        ? "border-gray-200 text-gray-400 cursor-not-allowed"
                        : "border-gray-300 text-gray-700 hover:border-gray-400"
                    }
                  `}
                  style={isSelected ? { backgroundColor: candidate.color } : {}}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  {candidate.name}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Chargement...</span>
        </div>
      )}

      {/* Rate limited */}
      {geoData?.rateLimited && (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-orange-400" />
            <p className="font-medium text-orange-700">Limite API atteinte</p>
            <p className="text-sm mt-2 text-gray-600">
              Réessayez dans quelques minutes.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Comparison chart */}
      {!isLoading && !geoData?.rateLimited && regions.length > 0 && (
        <ExportableCard title="Comparaison par région" filename={`national-geo-comparison-${period}`}>
          <div className="space-y-4">
            {/* Region selector */}
            <div className="relative">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full md:w-64 appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-gray-900 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Bar chart */}
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 50)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={115} />
                  <Tooltip formatter={(value) => [`${value}`, "Score"]} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            <div className="text-xs text-gray-500 text-center">
              Scores comparatifs dans {selectedRegion} (0-100, relatif entre les candidats sélectionnés)
            </div>
          </div>
        </ExportableCard>
      )}

      {/* Individual candidate charts */}
      {!isLoading && !geoData?.rateLimited && individualData.length > 0 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Comment lire ces graphiques ?</p>
            <p className="mb-2">
              Google Trends attribue un score de 100 à une seule combinaison région/candidat :
              celle avec le plus de recherches. Tous les autres scores sont relatifs à ce pic.
              Ainsi, si aucun candidat n'atteint 100 dans une région donnée, c'est que le pic
              d'intérêt se situe ailleurs (autre région, autre candidat).
            </p>
            <p>
              <strong>Important :</strong> les scores dépendent des candidats sélectionnés.
              Changer la sélection modifie l'échelle et peut changer les classements régionaux.
              Par exemple, la "meilleure région" d'un candidat peut varier selon à qui on le compare.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
          {individualData.map((candidate) => (
            <ExportableCard
              key={candidate.id}
              title={candidate.name}
              filename={`national-geo-${candidate.id}-${period}`}
            >
              {candidate.regions.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.min(300, candidate.regions.length * 28)}>
                  <BarChart
                    data={candidate.regions.slice(0, 10)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={95} />
                    <Tooltip formatter={(value) => [`${value}`, "Score"]} />
                    <Bar dataKey="score" fill={candidate.color} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Pas de données
                </div>
              )}
            </ExportableCard>
          ))}
          </div>
        </div>
      )}

      {/* No data */}
      {!isLoading && !geoData?.rateLimited && regions.length === 0 && selectedIds.length > 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Pas de données géographiques disponibles</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
