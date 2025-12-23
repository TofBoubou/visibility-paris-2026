// Liste des médias TV et Radio français principaux
export const MEDIAS_TV_RADIO = [
  "BFM",
  "BFMTV",
  "LCI",
  "CNews",
  "TF1",
  "France 2",
  "France 3",
  "France Inter",
  "RTL",
  "Europe 1",
  "RMC",
  "France Info",
  "France 24",
  "Arte",
  "Public Sénat",
  "LCP",
  "C8",
  "TMC",
  "Sud Radio",
];

// Fonction pour détecter si un article provient d'un média TV/Radio
export function isTvRadioArticle(
  title: string,
  domain: string
): { isMatch: boolean; media: string | null } {
  const lowerTitle = title.toLowerCase();
  const lowerDomain = domain.toLowerCase();

  for (const media of MEDIAS_TV_RADIO) {
    const lowerMedia = media.toLowerCase();
    if (
      lowerTitle.includes(lowerMedia) ||
      lowerDomain.includes(lowerMedia.replace(" ", ""))
    ) {
      return { isMatch: true, media };
    }
  }

  // Check domain-specific patterns
  if (lowerDomain.includes("bfm")) return { isMatch: true, media: "BFMTV" };
  if (lowerDomain.includes("lci")) return { isMatch: true, media: "LCI" };
  if (lowerDomain.includes("cnews")) return { isMatch: true, media: "CNews" };
  if (lowerDomain.includes("tf1")) return { isMatch: true, media: "TF1" };
  if (lowerDomain.includes("francetvinfo")) return { isMatch: true, media: "France Info" };
  if (lowerDomain.includes("france24")) return { isMatch: true, media: "France 24" };
  if (lowerDomain.includes("rtl")) return { isMatch: true, media: "RTL" };
  if (lowerDomain.includes("europe1")) return { isMatch: true, media: "Europe 1" };
  if (lowerDomain.includes("rmc")) return { isMatch: true, media: "RMC" };
  if (lowerDomain.includes("publicsenat")) return { isMatch: true, media: "Public Sénat" };

  return { isMatch: false, media: null };
}

// Extraire les mentions TV/Radio d'une liste d'articles
export function extractTvRadioMentions(
  articles: Array<{ title: string; url: string; domain: string; date: string }>
): {
  count: number;
  mentions: Array<{ title: string; url: string; media: string; date: string }>;
  topMedias: Array<{ media: string; count: number }>;
} {
  const mentions: Array<{ title: string; url: string; media: string; date: string }> = [];
  const mediaCounts: Record<string, number> = {};

  for (const article of articles) {
    const { isMatch, media } = isTvRadioArticle(article.title, article.domain);
    if (isMatch && media) {
      mentions.push({
        title: article.title,
        url: article.url,
        media,
        date: article.date,
      });
      mediaCounts[media] = (mediaCounts[media] || 0) + 1;
    }
  }

  const topMedias = Object.entries(mediaCounts)
    .map(([media, count]) => ({ media, count }))
    .sort((a, b) => b.count - a.count);

  return {
    count: mentions.length,
    mentions,
    topMedias,
  };
}
