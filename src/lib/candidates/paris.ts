import { Candidate } from "@/types/candidate";

export const PARIS_CANDIDATES: Record<string, Candidate> = {
  dati: {
    id: "dati",
    name: "Rachida Dati",
    party: "LR/Renaissance",
    role: "Ministre de la Culture, Maire du 7e",
    color: "#0066CC",
    wikipedia: "Rachida_Dati",
    searchTerms: ["Rachida Dati"],
  },
  gregoire: {
    id: "gregoire",
    name: "Emmanuel Grégoire",
    party: "PS",
    role: "Premier adjoint Mairie de Paris",
    color: "#FF69B4",
    wikipedia: "Emmanuel_Grégoire",
    searchTerms: ["Emmanuel Grégoire"],
  },
  bournazel: {
    id: "bournazel",
    name: "Pierre-Yves Bournazel",
    party: "Horizons",
    role: "Conseiller de Paris",
    color: "#FF6B35",
    wikipedia: "Pierre-Yves_Bournazel",
    searchTerms: ["Pierre-Yves Bournazel"],
  },
  brossat: {
    id: "brossat",
    name: "Ian Brossat",
    party: "PCF",
    role: "Sénateur de Paris",
    color: "#DD0000",
    wikipedia: "Ian_Brossat",
    searchTerms: ["Ian Brossat"],
  },
  belliard: {
    id: "belliard",
    name: "David Belliard",
    party: "EELV",
    role: "Adjoint transports Mairie de Paris",
    color: "#00A86B",
    wikipedia: "David_Belliard",
    searchTerms: ["David Belliard"],
  },
  chikirou: {
    id: "chikirou",
    name: "Sophia Chikirou",
    party: "LFI",
    role: "Députée de Paris",
    color: "#C9462C",
    wikipedia: "Sophia_Chikirou",
    searchTerms: ["Sophia Chikirou"],
  },
  mariani: {
    id: "mariani",
    name: "Thierry Mariani",
    party: "RN",
    role: "Député européen",
    color: "#0D2C54",
    wikipedia: "Thierry_Mariani",
    searchTerms: ["Thierry Mariani"],
  },
  knafo: {
    id: "knafo",
    name: "Sarah Knafo",
    party: "Reconquête",
    role: "Députée européenne",
    color: "#1E3A5F",
    wikipedia: "Sarah_Knafo",
    searchTerms: ["Sarah Knafo"],
    youtubeHandle: "@SarahKnafo-Videos",
    highlighted: true, // Pour la mise en valeur spéciale
  },
};

export const PARIS_CANDIDATE_IDS = Object.keys(PARIS_CANDIDATES);
export const PARIS_CANDIDATE_LIST = Object.values(PARIS_CANDIDATES);
