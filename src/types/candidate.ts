export interface Candidate {
  id: string;
  name: string;
  party: string;
  role: string;
  color: string;
  wikipedia: string;
  searchTerms: string[];
  youtubeHandle?: string;
  highlighted?: boolean;
}

export interface CandidateScore {
  candidateId: string;
  total: number;
  breakdown: {
    trends: number;
    press: number;
    wikipedia: number;
    youtube: number;
  };
  contributions: {
    trends: number;      // trends * 0.30
    press: number;       // press * 0.30
    wikipedia: number;   // wikipedia * 0.25
    youtube: number;     // youtube * 0.15
  };
}

export interface CandidateData {
  candidate: Candidate;
  score: CandidateScore;
  wikipedia: WikipediaData;
  press: PressData;
  youtube: YouTubeData;
  tvRadio: TVRadioData;
  sentiment: SentimentData;
  themes: ThemesData;
}

export interface WikipediaData {
  views: number;
  variation: number;
  avgDaily: number;
  error?: string;
}

export interface PressData {
  articles: PressArticle[];
  count: number;
  domains: number;
  topMedia: string | null;
  topMediaCount: number;
  mediaBreakdown: Array<{ domain: string; count: number }>;
}

export interface PressArticle {
  title: string;
  url: string;
  domain: string;
  date: string;
  source: "GDELT" | "Google News";
}

export interface YouTubeData {
  videos: YouTubeVideo[];
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  shortsViews: number;
  longVideosViews: number;
  shortsCount: number;
  longCount: number;
  avgViewsPerVideo: number;
  officialChannel?: string;
  fromCache: boolean;
  error?: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  published: string;
  url: string;
  views: number;
  likes: number;
  comments: number;
  duration: string;
  isShort: boolean;
  isOfficial: boolean;
}

export interface TVRadioData {
  mentions: TVRadioMention[];
  count: number;
  topMedia: string | null;
}

export interface TVRadioMention {
  title: string;
  url: string;
  date: string;
  source: string;
  media: string;
}

export interface SentimentData {
  combinedAvg: number;
  press: {
    avg: number;
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  youtube: {
    avg: number;
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
}

export interface ThemesData {
  summary: string;
  themes: Theme[];
}

export interface Theme {
  theme: string;
  count: number;
  tone: "positif" | "neutre" | "négatif";
  examples: string[];
}
