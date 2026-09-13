// iCloud共有アルバム(公開リンク)から写真一覧を取得する。
// 非公式のプロトコルだが、共有アルバムのWebビューア (www.icloud.com/sharedalbum) が
// 内部で使っているのと同じエンドポイントを叩いているだけで、認証は不要。

const INITIAL_HOST = 'p23-sharedstreams.icloud.com';

function extractToken(albumUrl) {
  const hashMatch = albumUrl.match(/#(.+)$/);
  if (hashMatch) return hashMatch[1];

  const pathMatch = albumUrl.match(/\/photos\/([^/?#]+)/);
  if (pathMatch) return pathMatch[1];

  throw new Error(
    `iCloud共有アルバムのURLからトークンを取得できませんでした: ${albumUrl}`
  );
}

async function postJSON(host, token, path, body) {
  const res = await fetch(`https://${host}/${token}/sharedstreams/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

async function fetchWebstream(token) {
  let host = INITIAL_HOST;
  let res = await postJSON(host, token, 'webstream', { streamCtag: null });

  // アルバムが実際にホストされているパーティションと最初の推測が違う場合、
  // 330番台のステータスと X-Apple-MMe-Host ヘッダーでリダイレクト先が返る。
  if (res.status === 330) {
    const redirectHost = res.headers.get('x-apple-mme-host');
    if (!redirectHost) {
      throw new Error('iCloudからリダイレクト先ホストを取得できませんでした');
    }
    host = redirectHost;
    res = await postJSON(host, token, 'webstream', { streamCtag: null });
  }

  if (!res.ok) {
    throw new Error(
      `iCloud webstream取得に失敗しました (status: ${res.status})。URLが正しい共有アルバムのリンクか確認してください。`
    );
  }

  const data = await res.json();
  return { host, data };
}

async function fetchAssetUrls(host, token, photoGuids) {
  const res = await postJSON(host, token, 'webasseturls', { photoGuids });
  if (!res.ok) {
    throw new Error(`iCloud webasseturls取得に失敗しました (status: ${res.status})`);
  }
  const data = await res.json();
  return data.items || {};
}

function pickBestDerivative(derivatives) {
  const candidates = Object.values(derivatives || {});
  if (candidates.length === 0) return null;
  return candidates.reduce((best, d) => {
    const size = (d.width || 0) * (d.height || 0);
    const bestSize = (best.width || 0) * (best.height || 0);
    return size > bestSize ? d : best;
  });
}

async function getAlbumPhotos(albumUrl) {
  const token = extractToken(albumUrl);
  const { host, data } = await fetchWebstream(token);

  // 共有アルバムには動画(mediaAssetType: "video")も混在しうるが、
  // 写真ギャラリーなので静止画のみを対象にする。
  const photos = (data.photos || []).filter((p) => p.mediaAssetType !== 'video');
  if (photos.length === 0) {
    return { title: data.streamName || null, photos: [] };
  }

  const guids = photos.map((p) => p.photoGuid);
  const items = await fetchAssetUrls(host, token, guids);

  const checksumToUrl = (checksum) => {
    const item = items[checksum];
    if (!item) return null;
    return `https://${item.url_location}${item.url_path}`;
  };

  const result = photos.map((p) => {
    const best = pickBestDerivative(p.derivatives);
    const url = best ? checksumToUrl(best.checksum) : null;
    return {
      guid: p.photoGuid,
      url,
      width: best ? best.width : p.width,
      height: best ? best.height : p.height,
      caption: p.caption || '',
      dateCreated: p.dateCreated || null,
    };
  }).filter((p) => p.url);

  return { title: data.streamName || null, photos: result };
}

module.exports = { getAlbumPhotos, extractToken };
