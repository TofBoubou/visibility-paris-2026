import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Period = "24h" | "7d" | "14d" | "30d";

interface PeriodState {
  period: Period;
  setPeriod: (period: Period) => void;
  getDateRange: () => { startDate: Date; endDate: Date };
}

export const PERIOD_DAYS: Record<Period, number> = {
  "24h": 1,
  "7d": 7,
  "14d": 14,
  "30d": 30,
};

export const PERIOD_LABELS: Record<Period, string> = {
  "24h": "24 heures",
  "7d": "7 jours",
  "14d": "14 jours",
  "30d": "30 jours",
};

export const usePeriodStore = create<PeriodState>()(
  persist(
    (set, get) => ({
      period: "7d",
      setPeriod: (period) => set({ period }),
      getDateRange: () => {
        const days = PERIOD_DAYS[get().period];
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return { startDate, endDate };
      },
    }),
    {
      name: "visibility-period",
    }
  )
);

// Utility functions
export function formatDateRange(period: Period): string {
  const days = PERIOD_DAYS[period];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return `${formatDate(startDate)} → ${formatDate(endDate)}`;
}

export function getTimeframeForTrends(period: Period): string {
  const days = PERIOD_DAYS[period];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  return `${formatDate(startDate)} ${formatDate(endDate)}`;
}
