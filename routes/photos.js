const express = require('express');
const router = express.Router();
const { getAlbumPhotos } = require('../lib/icloud');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5分キャッシュしてiCloudへの負荷を抑える
let cache = { data: null, fetchedAt: 0 };

router.get('/photos', async (req, res) => {
  const albumUrl = process.env.ICLOUD_ALBUM_URL;
  if (!albumUrl) {
    return res.status(500).json({
      error: 'ICLOUD_ALBUM_URL が設定されていません。.env に共有アルバムのURLを設定してください。',
    });
  }

  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    return res.json(cache.data);
  }

  try {
    const result = await getAlbumPhotos(albumUrl);
    cache = { data: result, fetchedAt: now };
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
