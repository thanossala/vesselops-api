const { Router } = require('express')
const pool = require('../db/pool.js')

const router = Router();

// GET /api/certificates?crew_member_id=...&status=expiring_soon
router.get('/', async (req, res) => {
  const { crew_member_id, status, vessel_id } = req.query;

  let query = `
    SELECT c.*,
           cm.first_name, cm.last_name, cm.rank,
           cm.vessel_id
    FROM certificates c
    JOIN crew_members cm ON c.crew_member_id = cm.id
    WHERE 1=1
  `;
  const params = [];

  if (crew_member_id) {
    params.push(crew_member_id);
    query += ` AND c.crew_member_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    query += ` AND c.status = $${params.length}`;
  }
  if (vessel_id) {
    params.push(vessel_id);
    query += ` AND cm.vessel_id = $${params.length}`;
  }

  query += ' ORDER BY c.expiry_date ASC';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/certificates
router.post('/', async (req, res) => {
  const { crew_member_id, cert_type, cert_number, issue_date, expiry_date } = req.body;

  if (!crew_member_id || !cert_type || !expiry_date) {
    return res.status(400).json({ error: 'crew_member_id, cert_type, expiry_date are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO certificates (crew_member_id, cert_type, cert_number, issue_date, expiry_date)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [crew_member_id, cert_type, cert_number, issue_date, expiry_date]
    );
    // Status is set automatically by the DB trigger
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/certificates/:id
router.put('/:id', async (req, res) => {
  const { cert_type, cert_number, issue_date, expiry_date } = req.body;

  try {
    const result = await pool.query(
      `UPDATE certificates SET
         cert_type   = COALESCE($1, cert_type),
         cert_number = COALESCE($2, cert_number),
         issue_date  = COALESCE($3, issue_date),
         expiry_date = COALESCE($4, expiry_date)
       WHERE id = $5
       RETURNING *`,
      [cert_type, cert_number, issue_date, expiry_date, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/certificates/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM certificates WHERE id = $1 RETURNING id', [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    res.json({ message: 'Certificate deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

