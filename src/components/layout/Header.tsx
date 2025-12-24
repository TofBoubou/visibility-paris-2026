"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContextStore, Context } from "@/stores/context";
import { usePeriodStore, PERIOD_LABELS, Period } from "@/stores/period";
import { cn } from "@/lib/utils/cn";
import { ChevronDown, BarChart3 } from "lucide-react";

export function Header() {
  const router = useRouter();
  const { context, setContext } = useContextStore();
  const { period, setPeriod } = usePeriodStore();

  const handleContextChange = (newContext: Context) => {
    setContext(newContext);
    router.push(`/${newContext}`);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="flex h-12 md:h-14 items-center justify-between px-2 md:px-4 gap-2">
        {/* Title - icon only on mobile */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <span className="hidden sm:inline text-sm font-semibold text-gray-900">
            Baromètre
          </span>
        </Link>

        {/* Center: Context Switcher */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 md:p-1">
          <ContextButton
            active={context === "paris"}
            onClick={() => handleContextChange("paris")}
          >
            <span className="sm:hidden">Paris</span>
            <span className="hidden sm:inline">Paris 2026</span>
          </ContextButton>
          <ContextButton
            active={context === "national"}
            onClick={() => handleContextChange("national")}
          >
            National
          </ContextButton>
        </div>

        {/* Right: Period dropdown */}
        <div className="relative flex-shrink-0">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="appearance-none bg-gray-100 text-gray-700 text-xs md:text-sm font-medium pl-2 md:pl-3 pr-6 md:pr-8 py-1.5 md:py-2 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p]}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>
    </header>
  );
}

interface ContextButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ContextButton({ active, onClick, children }: ContextButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-all whitespace-nowrap",
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-gray-600 hover:bg-gray-200"
      )}
    >
      {children}
    </button>
  );
}
