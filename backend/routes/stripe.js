// backend/routes/stripe.js

const express = require('express');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool    = require('../db');
const jwt     = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;

// ————————————————————————————————
// POST /api/stripe/create-account
//    Crea (si no existe) la cuenta Express de Stripe para el tutor
//    y devuelve un Account Link para completar el onboarding.
//    Requiere: header Authorization: Bearer <token>.
// ————————————————————————————————
router.post('/create-account', async (req, res) => {
  // 1) Verificar token y extraer userId
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let payload;
  try {
    payload = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const userId = payload.id;

  try {
    // 2) Obtener usuario de la base
    const userRes = await pool.query(
      `SELECT id, email, role, nationality, stripe_account_id
         FROM users
         WHERE id = $1`,
      [userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    // 3) Solo los “profesor” pueden hacer onboarding
    if (user.role !== 'profesor') {
      return res.status(403).json({ error: 'Only tutors can create a Stripe account' });
    }

    let accountId = user.stripe_account_id;

    // 4) Si no tiene accountId, creamos la cuenta Express
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: user.nationality || 'US',
        email: user.email,
      });
      accountId = account.id;

      // Guardar en users
      await pool.query(
        `UPDATE users
           SET stripe_account_id = $1,
               stripe_account_status = 'new'
         WHERE id = $2`,
        [accountId, userId]
      );
    }

    // 5) Generar un Account Link para onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.FRONTEND_URL}/profile/${userId}`,
      return_url:  `${process.env.FRONTEND_URL}/profile/${userId}`,
      type: 'account_onboarding',
    });

    // 6) Actualizar requested_account_link_at
    await pool.query(
      `UPDATE users
         SET requested_account_link_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    return res.json({ url: accountLink.url });
  } catch (err) {
    console.error('Error in /api/stripe/create-account:', err);
    return res.status(500).json({ error: 'Server error while creating Stripe account' });
  }
});


// ————————————————————————————————
// POST /api/stripe/webhook
//    Recibe eventos de Stripe (principalmente “account.updated”)
//    para actualizar estado del usuario en la tabla users.
//    NO parsear JSON con express.json(), debe ser raw body.
// ————————————————————————————————
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('⚠️  Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Solo manejamos “account.updated”
    if (event.type === 'account.updated') {
      const account = event.data.object;
      const acctId  = account.id;

      try {
        // 1) Buscar user por stripe_account_id
        const userRes = await pool.query(
          `SELECT id FROM users WHERE stripe_account_id = $1`,
          [acctId]
        );
        if (userRes.rows.length) {
          const userId = userRes.rows[0].id;

          // 2) Si payouts_enabled === true, marcamos verified
          if (account.payouts_enabled) {
            await pool.query(
              `UPDATE users
                 SET stripe_account_status = 'verified',
                     stripe_payout_ready = TRUE
               WHERE id = $1`,
              [userId]
            );
          }
          // 3) Si hay campos pendientes en requirements, marcamos incomplete
          else if (Array.isArray(account.requirements.currently_due)
            && account.requirements.currently_due.length > 0) {
            await pool.query(
              `UPDATE users
                 SET stripe_account_status = 'requirements_incomplete'
               WHERE id = $1`,
              [userId]
            );
          }
        }
      } catch (dbErr) {
        console.error('Error updating user from webhook:', dbErr);
        // Continuar para que Stripe responda 200
      }
    }

    // A Stripe hay que devolver 200 rápido
    res.json({ received: true });
  }
);

module.exports = router;