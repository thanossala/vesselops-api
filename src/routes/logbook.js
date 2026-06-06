const { Router } = require('express')
const pool = require('../db/pool.js')

const router = Router();

// GET /api/logbook?vessel_id=...&limit=20
router.get('/', async (req, res) => {
  const { vessel_id, limit = 20, offset = 0 } = req.query;

  let query = `
    SELECT le.*,
           u.email AS created_by_email
    FROM logbook_entries le
    JOIN users u ON le.created_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (vessel_id) {
    params.push(vessel_id);
    query += ` AND le.vessel_id = $${params.length}`;
  }

  params.push(limit, offset);
  query += ` ORDER BY le.entry_time DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/logbook
router.post('/', async (req, res) => {
  const {
    vessel_id, latitude, longitude,
    weather, sea_state, speed_kn, course_deg, notes
  } = req.body;

  if (!vessel_id) {
    return res.status(400).json({ error: 'vessel_id is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO logbook_entries
         (vessel_id, created_by, latitude, longitude, weather, sea_state, speed_kn, course_deg, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [vessel_id, req.user.id, latitude, longitude, weather, sea_state, speed_kn, course_deg, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

