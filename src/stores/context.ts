import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Context = "paris" | "national";

interface ContextState {
  context: Context;
  setContext: (context: Context) => void;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      context: "paris",
      setContext: (context) => set({ context }),
    }),
    {
      name: "visibility-context",
    }
  )
);
