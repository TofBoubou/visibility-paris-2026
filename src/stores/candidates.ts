import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PARIS_CANDIDATE_IDS } from "@/lib/candidates/paris";
import { NATIONAL_CANDIDATE_IDS } from "@/lib/candidates/national";
import { Context } from "./context";

interface CandidatesState {
  selectedParis: string[];
  selectedNational: string[];
  setSelectedParis: (ids: string[]) => void;
  setSelectedNational: (ids: string[]) => void;
  toggleCandidate: (context: Context, id: string) => void;
  selectAll: (context: Context) => void;
  getSelected: (context: Context) => string[];
}

export const useCandidatesStore = create<CandidatesState>()(
  persist(
    (set, get) => ({
      selectedParis: PARIS_CANDIDATE_IDS,
      selectedNational: NATIONAL_CANDIDATE_IDS,

      setSelectedParis: (ids) => set({ selectedParis: ids }),
      setSelectedNational: (ids) => set({ selectedNational: ids }),

      toggleCandidate: (context, id) => {
        if (context === "paris") {
          const current = get().selectedParis;
          if (current.includes(id)) {
            if (current.length > 1) {
              set({ selectedParis: current.filter((c) => c !== id) });
            }
          } else {
            set({ selectedParis: [...current, id] });
          }
        } else {
          const current = get().selectedNational;
          if (current.includes(id)) {
            if (current.length > 1) {
              set({ selectedNational: current.filter((c) => c !== id) });
            }
          } else {
            set({ selectedNational: [...current, id] });
          }
        }
      },

      selectAll: (context) => {
        if (context === "paris") {
          set({ selectedParis: PARIS_CANDIDATE_IDS });
        } else {
          set({ selectedNational: NATIONAL_CANDIDATE_IDS });
        }
      },

      getSelected: (context) => {
        return context === "paris"
          ? get().selectedParis
          : get().selectedNational;
      },
    }),
    {
      name: "visibility-candidates",
    }
  )
);
