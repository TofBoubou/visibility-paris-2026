"use client";

import { useRef, useState, useCallback, ReactNode } from "react";
import html2canvas from "html2canvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-2">
          {headerExtra}
          <button
            onClick={exportToPng}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            title="Exporter en PNG"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={contentRef} className="bg-white">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
