import { NextRequest, NextResponse } from "next/server";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get("q");
  const days = parseInt(searchParams.get("days") || "30", 10);
  const channelHandle = searchParams.get("channel");

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube API key not configured", videos: [], totalViews: 0, totalLikes: 0, totalComments: 0, shortsViews: 0, shortsLikes: 0, shortsComments: 0, longVideosViews: 0, longLikes: 0, longComments: 0, shortsCount: 0, longCount: 0, avgViewsPerVideo: 0, fromCache: false },
      { status: 500 }
    );
  }

  if (!searchTerm) {
    return NextResponse.json({ error: "Missing search term" }, { status: 400 });
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

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

    const searchResponse = await fetch(
      `${YOUTUBE_API_BASE}/search?${searchParams}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!searchResponse.ok) {
      const error = await searchResponse.json();
      throw new Error(error.error?.message || `YouTube API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const videoIds = searchData.items?.map((item: { id: { videoId: string } }) => item.id.videoId) || [];

    if (videoIds.length === 0) {
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

    // Calculate aggregates
    const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
    const totalLikes = videos.reduce((sum, v) => sum + v.likes, 0);
    const totalComments = videos.reduce((sum, v) => sum + v.comments, 0);

    const shorts = videos.filter((v) => v.isShort);
    const longs = videos.filter((v) => !v.isShort);

    const shortsViews = shorts.reduce((sum, v) => sum + v.views, 0);
    const shortsLikes = shorts.reduce((sum, v) => sum + v.likes, 0);
    const shortsComments = shorts.reduce((sum, v) => sum + v.comments, 0);
    const longVideosViews = longs.reduce((sum, v) => sum + v.views, 0);
    const longLikes = longs.reduce((sum, v) => sum + v.likes, 0);
    const longComments = longs.reduce((sum, v) => sum + v.comments, 0);

    const result: YouTubeResponse = {
      videos,
      totalViews,
      totalLikes,
      totalComments,
      shortsViews,
      shortsLikes,
      shortsComments,
      longVideosViews,
      longLikes,
      longComments,
      shortsCount: shorts.length,
      longCount: longs.length,
      avgViewsPerVideo: videos.length > 0 ? Math.round(totalViews / videos.length) : 0,
      officialChannel: channelHandle || undefined,
      fromCache: false,
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400",
      },
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
