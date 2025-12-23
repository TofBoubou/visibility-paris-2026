"use client";

import { useState } from "react";
import { usePeriodStore, formatDateRange } from "@/stores/period";
import { useCandidatesStore } from "@/stores/candidates";
import { useContextStore } from "@/stores/context";
import { PARIS_CANDIDATES } from "@/lib/candidates/paris";
import { NATIONAL_CANDIDATES } from "@/lib/candidates/national";
import { cn } from "@/lib/utils/cn";
import { Menu, X, Users } from "lucide-react";

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { context } = useContextStore();
  const { period } = usePeriodStore();
  const { getSelected, toggleCandidate, selectAll } = useCandidatesStore();

  const candidates = context === "paris" ? PARIS_CANDIDATES : NATIONAL_CANDIDATES;
  const selectedCandidates = getSelected(context);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-all"
        aria-label="Ouvrir les filtres"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar drawer */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-white transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Filtres</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Date range info */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-xs text-gray-500 text-center">{formatDateRange(period)}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Candidate Selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
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
            <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
              {Object.values(candidates).map((candidate) => {
                const isSelected = selectedCandidates.includes(candidate.id);
                return (
                  <button
                    key={candidate.id}
                    onClick={() => toggleCandidate(context, candidate.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-2 rounded text-left transition-all text-sm",
                      isSelected
                        ? "bg-gray-100 border border-gray-200"
                        : "hover:bg-gray-50 opacity-50"
                    )}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: candidate.color }}
                    />
                    <span
                      className={cn(
                        "flex-1 truncate",
                        candidate.highlighted
                          ? "font-semibold text-blue-600"
                          : "text-gray-700"
                      )}
                    >
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
        </div>

        {/* Apply button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Appliquer
          </button>
        </div>
      </aside>
    </>
  );
}
