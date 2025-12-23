import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet, CACHE_DURATION } from "@/lib/cache";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// Cache buckets: 7 days or 30 days
type CacheBucket = "7" | "30";

interface YouTubeVideo {
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

interface YouTubeResponse {
  videos: YouTubeVideo[];
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  shortsViews: number;
  shortsLikes: number;
  shortsComments: number;
  longVideosViews: number;
  longLikes: number;
  longComments: number;
  shortsCount: number;
  longCount: number;
  avgViewsPerVideo: number;
  officialChannel?: string;
  fromCache: boolean;
  error?: string;
}

// Determine cache bucket based on requested days
function getCacheBucket(days: number): CacheBucket {
  // 24h (1) and 7d (7) use 7-day bucket
  // 14d (14) and 30d (30) use 30-day bucket
  return days <= 7 ? "7" : "30";
}

// Get actual days to fetch based on bucket
function getBucketDays(bucket: CacheBucket): number {
  return bucket === "7" ? 7 : 30;
}

// Get cache duration based on bucket
function getCacheDuration(bucket: CacheBucket): number {
  return bucket === "7" ? CACHE_DURATION.YOUTUBE_7D : CACHE_DURATION.YOUTUBE_30D;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get("q");
  const requestedDays = parseInt(searchParams.get("days") || "7", 10);
  const channelHandle = searchParams.get("channel");

  console.log(`[YouTube] Request: q="${searchTerm}", days=${requestedDays}, channel=${channelHandle}`);

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.error("[YouTube] ERROR: YOUTUBE_API_KEY not configured");
    return NextResponse.json(
      { error: "YouTube API key not configured", videos: [], totalViews: 0, totalLikes: 0, totalComments: 0, shortsViews: 0, shortsLikes: 0, shortsComments: 0, longVideosViews: 0, longLikes: 0, longComments: 0, shortsCount: 0, longCount: 0, avgViewsPerVideo: 0, fromCache: false },
      { status: 500 }
    );
  }

  console.log(`[YouTube] API key configured: ${apiKey.slice(0, 10)}...`);

  if (!searchTerm) {
    console.error("[YouTube] ERROR: Missing search term");
    return NextResponse.json({ error: "Missing search term" }, { status: 400 });
  }

  // Determine cache bucket and actual fetch days
  const bucket = getCacheBucket(requestedDays);
  const fetchDays = getBucketDays(bucket);
  const cacheKey = `youtube:${searchTerm.toLowerCase().replace(/\s+/g, "_")}:${bucket}d`;

  // Try cache first
  const cached = await cacheGet<YouTubeResponse>(cacheKey);
  if (cached) {
    console.log(`[YouTube] Cache HIT for ${searchTerm} (${bucket}d bucket)`);
    // Filter videos by requested period and recalculate stats
    const filtered = filterVideosByDays(cached.videos, requestedDays);
    const stats = calculateStats(filtered);
    return NextResponse.json({ ...stats, videos: filtered, fromCache: true, bucket });
  }

  console.log(`[YouTube] Cache MISS for ${searchTerm} (${bucket}d bucket), fetching...`);

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - fetchDays);

    const publishedAfter = startDate.toISOString();
    const publishedBefore = endDate.toISOString();

    // Search for videos mentioning the term
    const searchParams = new URLSearchParams({
      part: "snippet",
      q: searchTerm,
      type: "video",
      maxResults: "50",
      order: "relevance",
      publishedAfter,
      publishedBefore,
      regionCode: "FR",
      key: apiKey,
    });

    console.log(`[YouTube] Calling search API for "${searchTerm}"...`);
    const searchResponse = await fetch(
      `${YOUTUBE_API_BASE}/search?${searchParams}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!searchResponse.ok) {
      const error = await searchResponse.json();
      console.error(`[YouTube] Search API error:`, error);
      throw new Error(error.error?.message || `YouTube API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const videoIds = searchData.items?.map((item: { id: { videoId: string } }) => item.id.videoId) || [];

    console.log(`[YouTube] Search returned ${videoIds.length} videos for "${searchTerm}"`);

    if (videoIds.length === 0) {
      console.log(`[YouTube] No videos found for "${searchTerm}"`);
      return NextResponse.json({
        videos: [],
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        shortsViews: 0,
        shortsLikes: 0,
        shortsComments: 0,
        longVideosViews: 0,
        longLikes: 0,
        longComments: 0,
        shortsCount: 0,
        longCount: 0,
        avgViewsPerVideo: 0,
        fromCache: false,
      });
    }

    // Get video statistics
    const statsParams = new URLSearchParams({
      part: "statistics,contentDetails",
      id: videoIds.join(","),
      key: apiKey,
    });

    const statsResponse = await fetch(
      `${YOUTUBE_API_BASE}/videos?${statsParams}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!statsResponse.ok) {
      throw new Error(`YouTube stats API error: ${statsResponse.status}`);
    }

    const statsData = await statsResponse.json();

    // Combine search results with stats
    const videos: YouTubeVideo[] = [];
    const statsMap = new Map(
      statsData.items?.map((item: {
        id: string;
        statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
        contentDetails: { duration?: string };
      }) => [item.id, item]) || []
    );

    for (const item of searchData.items || []) {
      const videoId = item.id.videoId;
      const stats = statsMap.get(videoId) as {
        statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
        contentDetails: { duration?: string };
      } | undefined;

      if (stats) {
        const duration = stats.contentDetails?.duration || "PT0S";
        const isShort = parseDuration(duration) <= 60;

        videos.push({
          id: videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          published: item.snippet.publishedAt.slice(0, 10),
          url: `https://www.youtube.com/watch?v=${videoId}`,
          views: parseInt(stats.statistics?.viewCount || "0", 10),
          likes: parseInt(stats.statistics?.likeCount || "0", 10),
          comments: parseInt(stats.statistics?.commentCount || "0", 10),
          duration,
          isShort,
          isOfficial: channelHandle ? item.snippet.channelTitle.toLowerCase().includes(searchTerm.toLowerCase().split(" ")[0]) : false,
        });
      }
    }

    // Calculate full stats for caching
    const fullStats = calculateStats(videos);

    // Build full result for cache (with all videos from bucket)
    const fullResult: YouTubeResponse = {
      videos,
      ...fullStats,
      officialChannel: channelHandle || undefined,
      fromCache: false,
    };

    // Save to cache
    const cacheDuration = getCacheDuration(bucket);
    await cacheSet(cacheKey, fullResult, cacheDuration);
    console.log(`[YouTube] Cached ${videos.length} videos for ${searchTerm} (${bucket}d bucket, ${cacheDuration/3600}h TTL)`);

    // Filter by requested period and recalculate stats for response
    const filteredVideos = filterVideosByDays(videos, requestedDays);
    const filteredStats = calculateStats(filteredVideos);

    return NextResponse.json({
      videos: filteredVideos,
      ...filteredStats,
      officialChannel: channelHandle || undefined,
      fromCache: false,
      bucket,
    });
  } catch (error) {
    console.error("YouTube API error:", error);
    return NextResponse.json(
      {
        videos: [],
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        shortsViews: 0,
        shortsLikes: 0,
        shortsComments: 0,
        longVideosViews: 0,
        longLikes: 0,
        longComments: 0,
        shortsCount: 0,
        longCount: 0,
        avgViewsPerVideo: 0,
        fromCache: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

// Filter videos by number of days from today
function filterVideosByDays(videos: YouTubeVideo[], days: number): YouTubeVideo[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  return videos.filter(v => v.published >= cutoffStr);
}

// Calculate aggregate stats from a list of videos
function calculateStats(videos: YouTubeVideo[]) {
  const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
  const totalLikes = videos.reduce((sum, v) => sum + v.likes, 0);
  const totalComments = videos.reduce((sum, v) => sum + v.comments, 0);

  const shorts = videos.filter((v) => v.isShort);
  const longs = videos.filter((v) => !v.isShort);

  return {
    totalViews,
    totalLikes,
    totalComments,
    shortsViews: shorts.reduce((sum, v) => sum + v.views, 0),
    shortsLikes: shorts.reduce((sum, v) => sum + v.likes, 0),
    shortsComments: shorts.reduce((sum, v) => sum + v.comments, 0),
    longVideosViews: longs.reduce((sum, v) => sum + v.views, 0),
    longLikes: longs.reduce((sum, v) => sum + v.likes, 0),
    longComments: longs.reduce((sum, v) => sum + v.comments, 0),
    shortsCount: shorts.length,
    longCount: longs.length,
    avgViewsPerVideo: videos.length > 0 ? Math.round(totalViews / videos.length) : 0,
  };
}
