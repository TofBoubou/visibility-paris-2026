"use client";

import Image from "next/image";
import Link from "next/link";
import { useContextStore } from "@/stores/context";
import { usePeriodStore, PERIOD_LABELS } from "@/stores/period";
import { cn } from "@/lib/utils/cn";
import { Calendar } from "lucide-react";

export function Header() {
  const { context, setContext } = useContextStore();
  const { period } = usePeriodStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-brand-blue/10 bg-brand-cream/95 backdrop-blur supports-[backdrop-filter]:bg-brand-cream/80">
      <div className="flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 md:gap-3">
          <Image
            src="/logos/Logo SK (tout clair sans 3D sans slogan).svg"
            alt="Sarah Knafo Paris"
            width={40}
            height={40}
            className="h-8 w-8 md:h-10 md:w-10"
          />
          <div className="hidden sm:block">
            <h1 className="text-base md:text-lg font-bold italic text-brand-pink leading-tight">
              Baromètre de Visibilité
            </h1>
            <p className="text-xs text-brand-blue/70 font-myriad uppercase tracking-wider">
              Municipales Paris 2026
            </p>
          </div>
        </Link>

        {/* Right side: Period badge (mobile) + Context Switcher */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Period badge - visible on mobile only */}
          <div className="flex lg:hidden items-center gap-1.5 px-2 py-1 bg-brand-yellow/20 rounded-md">
            <Calendar className="w-3 h-3 text-brand-pink" />
            <span className="text-xs font-medium text-brand-blue">
              {PERIOD_LABELS[period]}
            </span>
          </div>

          {/* Context Switcher */}
          <div className="flex items-center gap-1 md:gap-2">
            <ContextButton
              active={context === "paris"}
              onClick={() => setContext("paris")}
            >
              <span className="hidden xs:inline">Paris</span>
              <span className="xs:hidden">P</span>
              <span className="hidden sm:inline"> 2026</span>
            </ContextButton>
            <ContextButton
              active={context === "national"}
              onClick={() => setContext("national")}
            >
              <span className="hidden xs:inline">National</span>
              <span className="xs:hidden">N</span>
            </ContextButton>
          </div>
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
        "px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all",
        active
          ? "bg-brand-pink text-brand-cream shadow-md"
          : "bg-brand-blue/5 text-brand-blue hover:bg-brand-blue/10"
      )}
    >
      {children}
    </button>
  );
}
