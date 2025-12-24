"use client";

import { useRef, useState, useCallback, ReactNode } from "react";
import html2canvas from "html2canvas";
import { Card } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";

interface ExportableCardProps {
  title: string;
  filename: string;
  children: ReactNode;
  headerExtra?: ReactNode;
}

export function ExportableCard({
  title,
  filename,
  children,
  headerExtra,
}: ExportableCardProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportToPng = useCallback(async () => {
    if (!contentRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [filename]);

  return (
    <Card className="relative">
      {/* Export button - positioned absolute so it doesn't appear in export */}
      <button
        onClick={exportToPng}
        disabled={isExporting}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
        title="Exporter en PNG"
      >
        {isExporting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Content to export - includes title */}
      <div ref={contentRef} className="bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {headerExtra}
        </div>
        {children}
      </div>
    </Card>
  );
}
