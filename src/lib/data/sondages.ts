// Sondages officiels Paris 2026 - Sources vérifiées IFOP et Elabe

export interface Sondage {
  date: string;
  institut: string;
  commanditaire: string;
  echantillon: number;
  methode: string;
  hypothese: string;
  sourceUrl: string;
  scores: Record<string, number>;
}

export const SONDAGES_PARIS_2026: Sondage[] = [
  // IFOP Novembre 2025 - VÉRIFIÉ sur ifop.com
  {
    date: "2025-11-05",
    institut: "IFOP-Fiducial",
    commanditaire: "Le Figaro / Sud Radio",
    echantillon: 1037,
    methode: "Internet, 29 oct - 3 nov 2025",
    hypothese: "Listes séparées (Dati LR-MoDem-UDI vs Bournazel Horizons-Renaissance)",
    sourceUrl: "https://www.ifop.com/article/le-climat-politique-a-paris-11/",
    scores: {
      "Rachida Dati": 27,
      "Emmanuel Grégoire": 21,
      "Pierre-Yves Bournazel": 14,
      "David Belliard": 13,
      "Sophia Chikirou": 12,
    },
  },
  // ELABE Juin 2025 - VÉRIFIÉ sur elabe.fr (sans Bournazel)
  {
    date: "2025-06-21",
    institut: "Elabe",
    commanditaire: "BFMTV / La Tribune Dimanche",
    echantillon: 1206,
    methode: "Internet, 6-16 juin 2025",
    hypothese: "Sans candidature Bournazel",
    sourceUrl: "https://elabe.fr/municipale-paris/",
    scores: {
      "Rachida Dati": 34,
      "David Belliard": 19,
      "Emmanuel Grégoire": 17,
      "Sophia Chikirou": 15,
      "Thierry Mariani": 7,
      "Sarah Knafo": 5,
    },
  },
  // ELABE Juin 2025 - VÉRIFIÉ sur elabe.fr (avec Bournazel)
  {
    date: "2025-06-21",
    institut: "Elabe",
    commanditaire: "BFMTV / La Tribune Dimanche",
    echantillon: 1206,
    methode: "Internet, 6-16 juin 2025",
    hypothese: "Avec candidature Bournazel (Horizons)",
    sourceUrl: "https://elabe.fr/municipale-paris/",
    scores: {
      "Rachida Dati": 29,
      "David Belliard": 19,
      "Emmanuel Grégoire": 16,
      "Sophia Chikirou": 15,
      "Pierre-Yves Bournazel": 8,
      "Thierry Mariani": 7,
      "Sarah Knafo": 5,
    },
  },
];

// Couleurs par candidat pour les graphiques
export const CANDIDATE_COLORS: Record<string, string> = {
  "Rachida Dati": "#0066CC",
  "Emmanuel Grégoire": "#FF69B4",
  "Pierre-Yves Bournazel": "#FF6B35",
  "Ian Brossat": "#DD0000",
  "David Belliard": "#00A86B",
  "Sophia Chikirou": "#C9462C",
  "Thierry Mariani": "#0D2C54",
  "Sarah Knafo": "#E1386E",
};

// Fonction pour obtenir le dernier sondage
export function getLatestSondage(): Sondage {
  return SONDAGES_PARIS_2026.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
}

// Fonction pour obtenir l'évolution par candidat
export function getSondageEvolution(): Array<{
  date: string;
  candidat: string;
  score: number;
}> {
  const evolution: Array<{ date: string; candidat: string; score: number }> = [];

  // Grouper par date et faire la moyenne si plusieurs hypothèses
  const byDate: Record<string, Record<string, number[]>> = {};

  for (const sondage of SONDAGES_PARIS_2026) {
    if (!byDate[sondage.date]) {
      byDate[sondage.date] = {};
    }
    for (const [candidat, score] of Object.entries(sondage.scores)) {
      if (!byDate[sondage.date][candidat]) {
        byDate[sondage.date][candidat] = [];
      }
      byDate[sondage.date][candidat].push(score);
    }
  }

  for (const [date, candidats] of Object.entries(byDate)) {
    for (const [candidat, scores] of Object.entries(candidats)) {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      evolution.push({
        date,
        candidat,
        score: Math.round(avgScore * 10) / 10,
      });
    }
  }

  return evolution.sort((a, b) => a.date.localeCompare(b.date));
}
