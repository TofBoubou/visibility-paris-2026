"use client";

import Link from "next/link";
import Image from "next/image";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6 text-center">
      <Image
        src="/logos/Logo SK (tout clair sans 3D sans slogan).svg"
        alt="Sarah Knafo Paris"
        width={80}
        height={80}
        className="mb-6 opacity-50"
      />
      <h1 className="text-6xl font-bold text-brand-pink mb-4">404</h1>
      <h2 className="text-2xl font-bold text-brand-blue mb-2">
        Page non trouvée
      </h2>
      <p className="text-brand-blue/70 mb-8 max-w-md">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      <div className="flex gap-4">
        <Link
          href="/paris"
          className="flex items-center gap-2 px-6 py-3 bg-brand-pink text-white rounded-lg hover:bg-brand-pink/90 transition-colors font-medium"
        >
          <Home className="w-4 h-4" />
          Dashboard Paris
        </Link>
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-6 py-3 bg-brand-blue/10 text-brand-blue rounded-lg hover:bg-brand-blue/20 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
      </div>
    </div>
  );
}
