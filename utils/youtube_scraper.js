const axios = require('axios');

/**
 * Node.js port of the Flutter YouTube Music scraper.
 * Fetches and parses content from https://www.youtube.com/music
 */
async function getMusicHome(countryCode = 'IN') {
  try {
    const url = `https://www.youtube.com/music`;
    const response = await axios.get(url, {
      params: { hl: 'en', gl: countryCode },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (response.status !== 200) return null;

    const html = response.data;
    const match = html.match(/ytInitialData = ({[\s\S]*?});\s*<\/script>/);
    if (!match) return null;

    const data = JSON.parse(match[1]);

    // Extract Header (Carousel)
    const headRaw = data.header?.carouselHeaderRenderer?.contents?.[0]?.carouselItemRenderer?.carouselItems || [];
    const head = formatHeadItems(headRaw);

    // Extract Sections (Body)
    const contents = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.richGridRenderer?.contents || [];
    
    const sections = [];
    for (const item of contents) {
      const shelf = item.richSectionRenderer?.content?.richShelfRenderer;
      if (!shelf) continue;

      const title = shelf.title?.runs?.[0]?.text || shelf.title?.simpleText || 'Unknown';
      const items = await formatHomeSections(shelf.contents || []);

      if (items.length > 0) {
        sections.push({ title, items });
      }
    }

    return { head, body: sections };
  } catch (error) {
    console.error('Error in YouTube Scraper:', error.message);
    return null;
  }
}

function formatHeadItems(itemsList) {
  return itemsList.map(e => {
    const renderer = e.defaultPromoPanelRenderer;
    if (!renderer) return null;

    const videoId = renderer.navigationEndpoint?.watchEndpoint?.videoId;
    const thumbnails = renderer.largeFormFactorBackgroundThumbnail?.thumbnailLandscapePortraitRenderer?.landscape?.thumbnails || [];

    return {
      id: `youtube${videoId}`,
      title: renderer.title?.runs?.[0]?.text || 'Unknown',
      artist: (renderer.description?.runs || []).map(r => r.text).join('') || 'YouTube Music',
      image_url: thumbnails[thumbnails.length - 1]?.url,
      streaming_url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
      source: 'YouTube',
      type: 'video'
    };
  }).filter(Boolean);
}

async function formatHomeSections(items) {
  const result = [];
  for (const v of items) {
    const e = v.richItemRenderer?.content;
    if (!e) continue;

    if (e.lockupViewModel) {
      const model = e.lockupViewModel;
      const metadata = model.metadata?.lockupMetadataViewModel;
      const imageSources = model.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image?.sources || [];

      result.push({
        id: `youtube${model.contentId}`,
        title: metadata?.title?.content || 'Unknown',
        artist: metadata?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || 'Various Artists',
        image_url: imageSources[imageSources.length - 1]?.url,
        streaming_url: null, // Usually a playlist/album
        source: 'YouTube',
        type: 'playlist'
      });
    } else if (e.gridPlaylistRenderer) {
      const renderer = e.gridPlaylistRenderer;
      const thumbnails = renderer.thumbnail?.thumbnails || [];
      result.push({
        id: `youtube${renderer.navigationEndpoint?.watchEndpoint?.playlistId}`,
        title: renderer.title?.runs?.[0]?.text || 'Unknown',
        artist: renderer.shortBylineText?.runs?.[0]?.text || 'YouTube Music',
        image_url: thumbnails[thumbnails.length - 1]?.url,
        streaming_url: null,
        source: 'YouTube',
        type: 'playlist'
      });
    } else if (e.gridVideoRenderer) {
      const renderer = e.gridVideoRenderer;
      result.push({
        id: `youtube${renderer.videoId}`,
        title: renderer.title?.simpleText || 'Unknown',
        artist: renderer.shortBylineText?.runs?.[0]?.text || 'Unknown Artist',
        image_url: renderer.thumbnail?.thumbnails?.[renderer.thumbnail?.thumbnails.length - 1]?.url,
        streaming_url: `https://www.youtube.com/watch?v=${renderer.videoId}`,
        source: 'YouTube',
        type: 'video'
      });
    }
  }
  return result;
}

module.exports = { getMusicHome };
