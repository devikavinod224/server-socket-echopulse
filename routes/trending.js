const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

// GET /api/v1/trending
router.get('/trending', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;
    const from = page * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('songs')
      .select('*', { count: 'exact' })
      .order('trending_score', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Mock fallback if DB is empty
    if (data.length === 0 && page === 0) {
      const mockTrending = [
        { id: 'mock-1', title: 'Trending Song A', artist: 'Artist X', image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300', trending_score: 100, source: 'Mock' },
        { id: 'mock-2', title: 'Trending Song B', artist: 'Artist Y', image_url: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300', trending_score: 90, source: 'Mock' }
      ];
      return res.json({
        items: mockTrending,
        total: 2,
        page: 0,
        hasMore: false
      });
    }

    res.json({
      items: data,
      total: count,
      page,
      hasMore: (from + data.length) < count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
