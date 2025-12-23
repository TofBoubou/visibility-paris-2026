"use client";

import { usePeriodStore, formatDateRange } from "@/stores/period";
import { useCandidatesStore } from "@/stores/candidates";
import { useContextStore } from "@/stores/context";
import { PARIS_CANDIDATES } from "@/lib/candidates/paris";
import { NATIONAL_CANDIDATES } from "@/lib/candidates/national";
import { cn } from "@/lib/utils/cn";
import { Users, Scale } from "lucide-react";

export function Sidebar() {
  const { context } = useContextStore();
  const { period } = usePeriodStore();
  const { getSelected, toggleCandidate, selectAll } = useCandidatesStore();

  const candidates = context === "paris" ? PARIS_CANDIDATES : NATIONAL_CANDIDATES;
  const selectedCandidates = getSelected(context);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-gray-200 bg-gray-50 p-4 gap-4">
      {/* Date range info */}
      <div className="text-xs text-gray-500 text-center py-2 bg-white rounded-lg border border-gray-200">
        {formatDateRange(period)}
      </div>

      {/* Candidate Selector */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
              {context === "paris" ? "Candidats" : "Personnalités"}
            </h3>
          </div>
          <button
            onClick={() => selectAll(context)}
            className="text-xs text-blue-600 hover:underline"
          >
            Tous
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
          {Object.values(candidates).map((candidate) => {
            const isSelected = selectedCandidates.includes(candidate.id);
            return (
              <button
                key={candidate.id}
                onClick={() => toggleCandidate(context, candidate.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all text-sm",
                  isSelected
                    ? "bg-white border border-gray-200"
                    : "hover:bg-gray-100 opacity-50"
                )}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: candidate.color }}
                />
                <span className={cn(
                  "flex-1 truncate",
                  candidate.highlighted ? "font-semibold text-blue-600" : "text-gray-700"
                )}>
                  {candidate.name}
                </span>
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Weights Info - compact */}
      <div className="border-t border-gray-200 pt-3">
        <div className="flex items-center gap-2 mb-2">
          <Scale className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-400 uppercase">Pondération</span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <WeightItem label="Presse" value={30} color="#4B5563" />
          <WeightItem label="Trends" value={30} color="#6B7280" />
          <WeightItem label="Wiki" value={25} color="#9CA3AF" />
          <WeightItem label="YT" value={15} color="#D1D5DB" />
        </div>
      </div>
    </aside>
  );
}

interface WeightItemProps {
  label: string;
  value: number;
  color: string;
}

function WeightItem({ label, value, color }: WeightItemProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-gray-500">{label}</span>
      <span className="ml-auto text-gray-700">{value}%</span>
    </div>
  );
}
