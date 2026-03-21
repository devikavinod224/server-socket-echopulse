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
