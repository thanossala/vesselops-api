const { Router } = require('express')
const pool = require('../db/pool.js')

const router = Router();

// GET /api/watches?vessel_id=...&date=2024-01-15
router.get('/', async (req, res) => {
  const { vessel_id, date } = req.query;

  let query = `
    SELECT ws.*,
           cm.first_name, cm.last_name, cm.rank
    FROM watch_schedules ws
    JOIN crew_members cm ON ws.crew_member_id = cm.id
    WHERE 1=1
  `;
  const params = [];

  if (vessel_id) {
    params.push(vessel_id);
    query += ` AND ws.vessel_id = $${params.length}`;
  }
  if (date) {
    params.push(date);
    query += ` AND ws.schedule_date = $${params.length}`;
  }

  query += ' ORDER BY ws.schedule_date, ws.start_time';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/watches
router.post('/', async (req, res) => {
  const { vessel_id, crew_member_id, watch_type, start_time, end_time, schedule_date } = req.body;

  if (!vessel_id || !crew_member_id || !watch_type || !start_time || !end_time || !schedule_date) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO watch_schedules
         (vessel_id, crew_member_id, watch_type, start_time, end_time, schedule_date)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [vessel_id, crew_member_id, watch_type, start_time, end_time, schedule_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Schedule conflict: crew member already assigned at this time' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/watches/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM watch_schedules WHERE id = $1 RETURNING id', [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json({ message: 'Watch schedule removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

