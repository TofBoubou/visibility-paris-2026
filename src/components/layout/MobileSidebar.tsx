"use client";

import { useState } from "react";
import { usePeriodStore, Period, PERIOD_LABELS, formatDateRange } from "@/stores/period";
import { useCandidatesStore } from "@/stores/candidates";
import { useContextStore } from "@/stores/context";
import { PARIS_CANDIDATES } from "@/lib/candidates/paris";
import { NATIONAL_CANDIDATES } from "@/lib/candidates/national";
import { cn } from "@/lib/utils/cn";
import { Menu, X, Calendar, Users, Scale } from "lucide-react";

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { context } = useContextStore();
  const { period, setPeriod } = usePeriodStore();
  const { getSelected, toggleCandidate, selectAll } = useCandidatesStore();

  const candidates = context === "paris" ? PARIS_CANDIDATES : NATIONAL_CANDIDATES;
  const selectedCandidates = getSelected(context);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 bg-brand-pink text-white p-4 rounded-full shadow-lg hover:bg-brand-pink/90 transition-all"
        aria-label="Ouvrir les filtres"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar drawer */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-brand-cream transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-blue/10">
          <h2 className="font-puffin text-lg text-brand-blue">Filtres</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-brand-blue/10 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-brand-blue" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Period Selector */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-brand-pink" />
              <h3 className="font-myriad text-sm uppercase tracking-wider text-brand-blue/70">
                Période
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    period === p
                      ? "bg-brand-yellow text-brand-blue shadow-md"
                      : "bg-brand-blue/5 text-brand-blue/70 hover:bg-brand-blue/10"
                  )}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-brand-blue/50 text-center">
              {formatDateRange(period)}
            </p>
          </div>

          {/* Candidate Selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-pink" />
                <h3 className="font-myriad text-sm uppercase tracking-wider text-brand-blue/70">
                  Candidats
                </h3>
              </div>
              <button
                onClick={() => selectAll(context)}
                className="text-xs text-brand-pink hover:underline"
              >
                Tout sélectionner
              </button>
            </div>
            <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-2">
              {Object.values(candidates).map((candidate) => {
                const isSelected = selectedCandidates.includes(candidate.id);
                return (
                  <button
                    key={candidate.id}
                    onClick={() => toggleCandidate(context, candidate.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all",
                      isSelected
                        ? "bg-brand-blue/10"
                        : "hover:bg-brand-blue/5 opacity-50"
                    )}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: candidate.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm truncate",
                          candidate.highlighted
                            ? "font-bold text-brand-pink"
                            : "text-brand-blue"
                        )}
                      >
                        {candidate.name}
                      </p>
                      <p className="text-xs text-brand-blue/50 truncate">
                        {candidate.party}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-brand-pink flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weights Info */}
          <div className="border-t border-brand-blue/10 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4 text-brand-pink" />
              <h3 className="font-myriad text-sm uppercase tracking-wider text-brand-blue/70">
                Pondération
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <WeightItem label="Presse" value={30} color="#22496A" />
              <WeightItem label="Trends" value={30} color="#FBCD41" />
              <WeightItem label="Wikipedia" value={25} color="#00A86B" />
              <WeightItem label="YouTube" value={15} color="#E1386E" />
            </div>
          </div>
        </div>

        {/* Apply button */}
        <div className="p-4 border-t border-brand-blue/10">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full bg-brand-pink text-white py-3 rounded-lg font-medium hover:bg-brand-pink/90 transition-colors"
          >
            Appliquer les filtres
          </button>
        </div>
      </aside>
    </>
  );
}

interface WeightItemProps {
  label: string;
  value: number;
  color: string;
}

function WeightItem({ label, value, color }: WeightItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-brand-blue/70">{label}</span>
      <span className="ml-auto font-medium text-brand-blue">{value}%</span>
    </div>
  );
}
