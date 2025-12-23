"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tv, Radio, ExternalLink } from "lucide-react";
import {
  extractTvRadioMentions,
  MEDIAS_TV_RADIO,
} from "@/lib/data/tvRadioMedias";

interface Article {
  title: string;
  url: string;
  domain: string;
  date: string;
}

interface TvRadioSectionProps {
  articles: Article[];
}

export function TvRadioSection({ articles }: TvRadioSectionProps) {
  const { count, mentions, topMedias } = extractTvRadioMentions(articles);

  if (count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="w-5 h-5" />
            Mentions TV & Radio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic">
            Aucune mention TV/Radio détectée dans les articles récents.
          </p>
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">
              Médias surveillés :
            </p>
            <div className="flex flex-wrap gap-2">
              {MEDIAS_TV_RADIO.map((media) => (
                <Badge
                  key={media}
                  variant="outline"
                  className="text-xs text-gray-500"
                >
                  {media}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Résumé */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="w-5 h-5" />
            Mentions TV & Radio
            <Badge className="ml-2 bg-brand-pink text-white">
              {count} mention{count > 1 ? "s" : ""}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Détection automatique des passages TV et Radio dans les articles de presse.
          </p>

          {/* Top médias */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {topMedias.slice(0, 8).map(({ media, count }) => (
              <div
                key={media}
                className="bg-gray-100 rounded-lg p-3 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  {media.includes("Radio") || media.includes("RTL") || media.includes("Europe") || media.includes("RMC") || media.includes("Inter") ? (
                    <Radio className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Tv className="w-4 h-4 text-blue-600" />
                  )}
                  <span className="font-medium text-gray-900 text-sm">
                    {media}
                  </span>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {count}
                </span>
                <span className="text-xs text-gray-500 block">
                  mention{count > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Liste des mentions */}
      <Card>
        <CardHeader>
          <CardTitle>Détail des mentions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {mentions.map((mention, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-brand-yellow/20 text-gray-900"
                      >
                        {mention.media}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(mention.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <a
                      href={mention.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
                    >
                      {mention.title}
                    </a>
                  </div>
                  <a
                    href={mention.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-600/80"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Médias surveillés */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Médias TV & Radio surveillés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {MEDIAS_TV_RADIO.map((media) => {
              const mediaCount = topMedias.find((m) => m.media === media)?.count || 0;
              return (
                <Badge
                  key={media}
                  variant={mediaCount > 0 ? "default" : "outline"}
                  className={
                    mediaCount > 0
                      ? "bg-brand-pink text-white"
                      : "text-gray-500"
                  }
                >
                  {media}
                  {mediaCount > 0 && (
                    <span className="ml-1 bg-white/20 px-1 rounded text-xs">
                      {mediaCount}
                    </span>
                  )}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
