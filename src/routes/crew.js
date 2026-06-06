const { Router } = require('express')
const pool = require('../db/pool.js')

const router = Router();

// GET /api/crew?vessel_id=...&status=active
router.get('/', async (req, res) => {
  const { vessel_id, status } = req.query;

  let query = 'SELECT * FROM crew_members WHERE 1=1';
  const params = [];

  if (vessel_id) {
    params.push(vessel_id);
    query += ` AND vessel_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    query += ` AND status = $${params.length}`;
  }

  query += ' ORDER BY last_name, first_name';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/crew/:id  (includes their certificates)
router.get('/:id', async (req, res) => {
  try {
    const crew = await pool.query(
      'SELECT * FROM crew_members WHERE id = $1', [req.params.id]
    );
    if (crew.rows.length === 0) {
      return res.status(404).json({ error: 'Crew member not found' });
    }

    const certs = await pool.query(
      'SELECT * FROM certificates WHERE crew_member_id = $1 ORDER BY expiry_date',
      [req.params.id]
    );

    res.json({ ...crew.rows[0], certificates: certs.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/crew
router.post('/', async (req, res) => {
  const {
    vessel_id, first_name, last_name,
    rank, nationality, contract_start, contract_end
  } = req.body;

  if (!vessel_id || !first_name || !last_name || !rank) {
    return res.status(400).json({ error: 'vessel_id, first_name, last_name, rank are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO crew_members
         (vessel_id, first_name, last_name, rank, nationality, contract_start, contract_end)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [vessel_id, first_name, last_name, rank, nationality, contract_start, contract_end]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/crew/:id
router.put('/:id', async (req, res) => {
  const {
    first_name, last_name, rank,
    nationality, contract_start, contract_end, status
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE crew_members SET
         first_name     = COALESCE($1, first_name),
         last_name      = COALESCE($2, last_name),
         rank           = COALESCE($3, rank),
         nationality    = COALESCE($4, nationality),
         contract_start = COALESCE($5, contract_start),
         contract_end   = COALESCE($6, contract_end),
         status         = COALESCE($7, status)
       WHERE id = $8
       RETURNING *`,
      [first_name, last_name, rank, nationality, contract_start, contract_end, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crew member not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/crew/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM crew_members WHERE id = $1 RETURNING id', [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crew member not found' });
    }
    res.json({ message: 'Crew member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

