// backend/routes/stripe.js

require('dotenv').config();

console.log("→ JWT_SECRET EN backend/stripe.js =", process.env.JWT_SECRET);
console.log("→ STRIPE_SECRET_KEY EN backend/stripe.js =", process.env.STRIPE_SECRET_KEY);
console.log("→ STRIPE_CLIENT_ID EN backend/stripe.js =", process.env.STRIPE_CLIENT_ID);
console.log("→ BACKEND_URL EN backend/stripe.js =", process.env.BACKEND_URL);
console.log("→ FRONTEND_URL EN backend/stripe.js =", process.env.FRONTEND_URL);

const express = require('express');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool    = require('../db');
const jwt     = require('jsonwebtoken');

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * 1) GET /api/stripe/oauth/connect
 *    Redirige al usuario al flujo OAuth de Stripe con estado=JWT
 */
router.get('/oauth/connect', (req, res) => {
  const token = req.query.state;
  if (!token) {
    return res.status(400).send('Missing state');
  }
  // verificamos que sea un JWT válido
  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error('State JWT inválido:', err.message);
    return res.status(400).send('Invalid state');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    scope:         'read_write',
    client_id:     process.env.STRIPE_CLIENT_ID,
    redirect_uri:  `${process.env.BACKEND_URL}/api/stripe/oauth/callback`,
    state:         token
  });
  // redirigimos al usuario a Stripe
  res.redirect(`https://connect.stripe.com/oauth/authorize?${params.toString()}`);
});

/**
 * 2) GET /api/stripe/oauth/callback
 *    Stripe redirige aquí con ?code & state.
 *    Intercambiamos code por stripe_user_id y lo guardamos.
 */
router.get('/oauth/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).send('Missing code or state');
  }

  // verificamos y extraemos userId del state JWT
  let payload;
  try {
    payload = jwt.verify(state, JWT_SECRET);
  } catch (err) {
    console.error('State JWT inválido en callback:', err.message);
    return res.status(400).send('Invalid state');
  }
  const userId = payload.id;

  try {
    // intercambiamos el code por stripe_user_id
    const tokenResponse = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code
    });
    const stripeAccountId = tokenResponse.stripe_user_id;

    // guardamos en la BD
    await pool.query(
      `UPDATE users
         SET stripe_account_id    = $1,
             stripe_account_status = 'pending_information'
       WHERE id = $2`,
      [stripeAccountId, userId]
    );

    // redirigir de vuelta al perfil
    res.redirect(`${process.env.FRONTEND_URL}/profile/${userId}`);
  } catch (err) {
    console.error('Error en /oauth/callback:', err);
    res.status(500).send('Error connecting Stripe account');
  }
});

/**
 * Webhook handler (seguimos manejando account.updated si quieres)
 */
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
async function webhookHandler(req, res) {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      endpointSecret
    );
  } catch (err) {
    console.error('⚠️ Error de firma en webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const acct = event.data.object;
  const acctId = acct.id;

  // Puedes seguir procesando account.updated si lo deseas...
  if (event.type === 'account.updated') {
    console.log('→ account.updated para cuenta', acctId);
    const { rows } = await pool.query(
      `SELECT id FROM users WHERE stripe_account_id = $1`,
      [acctId]
    );
    if (rows.length) {
      const uId = rows[0].id;
      const newStatus = acct.payouts_enabled
        ? 'verified'
        : acct.requirements?.currently_due?.length
          ? 'requirements_incomplete'
          : 'pending_review';
      await pool.query(
        `UPDATE users
           SET stripe_account_status = $1,
               stripe_payout_ready   = $2
         WHERE id = $3`,
        [ newStatus, Boolean(acct.payouts_enabled), uId ]
      );
      console.log(`→ Usuario ${uId} marcado como ${newStatus}`);
    }
  }

  res.json({ received: true });
}

// rutas exportadas
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  webhookHandler
);

module.exports = router;