// backend/routes/slots.js
const express = require('express');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
require('dotenv').config();

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * GET /api/slots?teacherId=…&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Genera slots de 1h (o intervalo fijo) según reglas semanales,
 * entre from y to, excluyendo los ya reservados (status≠cancelled).
 */
router.get('/', async (req, res) => {
  const { teacherId, from, to } = req.query;
  if (!teacherId || !from || !to) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    // 1) Traer reglas del profe
    const rulesRes = await pool.query(
      `SELECT weekday, start_time, end_time
       FROM weekly_availability
       WHERE user_id = $1`,
      [teacherId]
    );
    const rules = rulesRes.rows;

    // 2) Traer bookings existentes
    const bookingsRes = await pool.query(
      `SELECT start_time, end_time
       FROM bookings
       WHERE profesor_id = $1
         AND status != 'cancelled'
         AND start_time::date BETWEEN $2 AND $3`,
      [teacherId, from, to]
    );
    const booked = bookingsRes.rows.map(r => ({
      start: new Date(r.start_time).getTime(),
      end:   new Date(r.end_time).getTime()
    }));

    // 3) Iterar días
    const slots = [];
    const startDate = new Date(from);
    const endDate   = new Date(to);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate()+1)) {
      const dow = (d.getDay()+6) % 7; // JS: 0=domingo, queremos 0=lunes
      for (const rule of rules.filter(r => r.weekday === dow)) {
        const [h0, m0] = rule.start_time.split(':').map(Number);
        const [h1, m1] = rule.end_time.split(':').map(Number);
        const dayStart = new Date(d);
        dayStart.setHours(h0, m0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(h1, m1, 0, 0);

        // generar sub-slots de 1h
        let slotStart = new Date(dayStart);
        while (slotStart.getTime()+3600000 <= dayEnd.getTime()) {
          const slotEnd = new Date(slotStart.getTime()+3600000);
          // excluir si colisiona con booking existente
          const collision = booked.some(b =>
            !(slotEnd.getTime() <= b.start || slotStart.getTime() >= b.end)
          );
          if (!collision) {
            slots.push({
              start: slotStart.toISOString(),
              end:   slotEnd.toISOString()
            });
          }
          slotStart = new Date(slotStart.getTime()+3600000);
        }
      }
    }

    res.json({ slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating slots' });
  }
});

module.exports = router;