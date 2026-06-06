const { Router } = require('express')
const pool = require('../db/pool.js')

const router = Router();

// GET /api/dashboard?vessel_id=...
// Returns aggregated stats for the dashboard
router.get('/', async (req, res) => {
  const { vessel_id } = req.query;

  try {
    const vesselFilter = vessel_id ? 'AND vessel_id = $1' : '';
    const params = vessel_id ? [vessel_id] : [];

    const [crewStats, certAlerts, logbookRecent] = await Promise.all([
      // Crew by status
      pool.query(
        `SELECT status, COUNT(*) as count
         FROM crew_members
         WHERE 1=1 ${vesselFilter}
         GROUP BY status`,
        params
      ),
      // Expiring certificates (next 30 days)
      pool.query(
        `SELECT c.cert_type, c.expiry_date, c.status,
                cm.first_name, cm.last_name, cm.rank
         FROM certificates c
         JOIN crew_members cm ON c.crew_member_id = cm.id
         WHERE c.status IN ('expiring_soon', 'expired')
         ${vessel_id ? 'AND cm.vessel_id = $1' : ''}
         ORDER BY c.expiry_date ASC
         LIMIT 10`,
        params
      ),
      // Last 5 logbook entries
      pool.query(
        `SELECT entry_time, weather, sea_state, latitude, longitude, speed_kn
         FROM logbook_entries
         WHERE 1=1 ${vesselFilter}
         ORDER BY entry_time DESC
         LIMIT 5`,
        params
      )
    ]);

    res.json({
      crew_summary: crewStats.rows,
      cert_alerts: certAlerts.rows,
      recent_logbook: logbookRecent.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

