const { Router } = require('express')
const pool = require('../db/pool.js')

const router = Router();

// GET /api/vessels
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vessels ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/vessels/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vessels WHERE id = $1', [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vessel not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/vessels
router.post('/', async (req, res) => {
  const { name, imo_number, flag, vessel_type } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Vessel name is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO vessels (name, imo_number, flag, vessel_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, imo_number, flag, vessel_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'IMO number already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/vessels/:id
router.put('/:id', async (req, res) => {
  const { name, imo_number, flag, vessel_type } = req.body;

  try {
    const result = await pool.query(
      `UPDATE vessels
       SET name = COALESCE($1, name),
           imo_number = COALESCE($2, imo_number),
           flag = COALESCE($3, flag),
           vessel_type = COALESCE($4, vessel_type)
       WHERE id = $5
       RETURNING *`,
      [name, imo_number, flag, vessel_type, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vessel not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/vessels/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM vessels WHERE id = $1 RETURNING id', [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vessel not found' });
    }
    res.json({ message: 'Vessel deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

