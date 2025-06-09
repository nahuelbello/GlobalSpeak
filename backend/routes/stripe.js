// backend/routes/stripe.js

require('dotenv').config();

console.log("→ JWT_SECRET EN backend/stripe.js =", process.env.JWT_SECRET);
console.log("→ STRIPE_SECRET_KEY EN backend/stripe.js =", process.env.STRIPE_SECRET_KEY);
console.log("→ FRONTEND_URL EN backend/stripe.js =", process.env.FRONTEND_URL);

const express = require('express');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool    = require('../db');
const jwt     = require('jsonwebtoken');

const router         = express.Router();
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const JWT_SECRET     = process.env.JWT_SECRET;

/**
 * Mapa de nacionalidades hispanohablantes a código ISO-3166-1 alpha-2.
 */
const SPANISH_SPEAKING_CODES = {
  "Argentina":            "AR",
  "Bolivia":              "BO",
  "Chile":                "CL",
  "Colombia":             "CO",
  "Costa Rica":           "CR",
  "Cuba":                 "CU",
  "Ecuador":              "EC",
  "El Salvador":          "SV",
  "España":               "ES",
  "Guatemala":            "GT",
  "Guinea Ecuatorial":    "GQ",
  "Honduras":             "HN",
  "México":               "MX",
  "Nicaragua":            "NI",
  "Panamá":               "PA",
  "Paraguay":             "PY",
  "Perú":                 "PE",
  "Puerto Rico":          "PR",
  "República Dominicana": "DO",
  "Uruguay":              "UY",
  "Venezuela":            "VE"
};

/**
 * POST /api/stripe/create-account
 * Crea o recupera la cuenta Express de Stripe y devuelve el Account Link.
 */
async function createAccountHandler(req, res) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let payload;
  try {
    payload = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch (err) {
    console.error('jwt.verify falló:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
  const userId = payload.id;

  try {
    const { rows } = await pool.query(
      `SELECT id, email, role, nationality, stripe_account_id
         FROM users
        WHERE id = $1`,
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = rows[0];

    if (user.role !== 'profesor') {
      return res.status(403).json({ error: 'Only tutors can create a Stripe account' });
    }

    let accountId = user.stripe_account_id;
    if (!accountId) {
      const isoCountry = SPANISH_SPEAKING_CODES[user.nationality] || 'US';
      console.log(`→ Traduciendo nacionalidad "${user.nationality}" a "${isoCountry}"`);

      const account = await stripe.accounts.create({
        type:    'express',
        country: isoCountry,
        email:   user.email,
      });
      accountId = account.id;

      await pool.query(
        `UPDATE users
            SET stripe_account_id = $1,
                stripe_account_status = 'new'
          WHERE id = $2`,
        [accountId, userId]
      );
    }

    const accountLink = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${process.env.FRONTEND_URL}/profile/${userId}`,
      return_url:  `${process.env.FRONTEND_URL}/profile/${userId}`,
      type:        'account_onboarding',
    });

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
}

/**
 * Manejador de webhook de Stripe.
 * Debe montarse con express.raw() antes de express.json().
 */
async function webhookHandler(req, res) {
  console.log('→ LLEGÓ UN POST A /api/stripe/webhook');
  console.log('→ stripe-signature:', req.headers['stripe-signature']);
  console.log('→ raw body length:', req.body.length);
  console.log('→ endpointSecret:', endpointSecret);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      endpointSecret
    );
    console.log('   → Evento recibido:', event.type);
  } catch (err) {
    console.error('⚠️  Error de firma en webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const acct = event.data.object;
  const acctId = acct.id;

  // 1) Tutor autorizó la app en Stripe
  if (event.type === 'account.application.authorized') {
    console.log('   → application.authorized para cuenta', acctId);
    await pool.query(
      `UPDATE users
         SET stripe_account_status = 'pending_information',
             stripe_payout_ready   = FALSE
       WHERE stripe_account_id = $1`,
      [acctId]
    );
    console.log(`   → Usuario con account ${acctId} marcado como pending_information`);
  }

  // 2) Estado completo de la cuenta
  if (event.type === 'account.updated') {
    console.log('   → account.updated para cuenta', acctId, 'payouts_enabled=', acct.payouts_enabled);

    try {
      const { rows } = await pool.query(
        `SELECT id FROM users WHERE stripe_account_id = $1`,
        [acctId]
      );
      if (rows.length === 0) {
        console.log(`   → No se encontró user con stripe_account_id=${acctId}`);
      } else {
        const userId = rows[0].id;

        if (acct.payouts_enabled) {
          await pool.query(
            `UPDATE users
               SET stripe_account_status = 'verified',
                   stripe_payout_ready   = TRUE
             WHERE id = $1`,
            [userId]
          );
          console.log(`   → Usuario ${userId} marcado como verified`);

        } else if (
          Array.isArray(acct.requirements.currently_due) &&
          acct.requirements.currently_due.length > 0
        ) {
          await pool.query(
            `UPDATE users
               SET stripe_account_status = 'requirements_incomplete',
                   stripe_payout_ready   = FALSE
             WHERE id = $1`,
            [userId]
          );
          console.log(`   → Usuario ${userId} marcado como requirements_incomplete`);

        } else {
          await pool.query(
            `UPDATE users
               SET stripe_account_status = 'pending_review',
                   stripe_payout_ready   = FALSE
             WHERE id = $1`,
            [userId]
          );
          console.log(`   → Usuario ${userId} marcado como pending_review`);
        }
      }
    } catch (dbErr) {
      console.error('Error actualizando user desde webhook:', dbErr);
    }
  }

  // Responder 200 rápidamente
  res.json({ received: true });
}

// Solo montamos create-account en este router,
// el webhookHandler se expone y se conecta con express.raw() en index.js
router.post('/create-account', createAccountHandler);

module.exports = {
  router,
  webhookHandler
};