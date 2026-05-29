const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../db/connection');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new AppError('Stripe is not configured', 503);
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

const PLAN_PRICE_IDS = () => ({
  pro:      process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
});

function planFromPriceId(priceId) {
  const map = PLAN_PRICE_IDS();
  if (priceId === map.pro)       return 'pro';
  if (priceId === map.business)  return 'business';
  return 'free';
}

// POST /api/v1/billing/checkout
router.post('/checkout', authenticate, async (req, res, next) => {
  try {
    const stripe = getStripe();
    const { plan } = req.body;
    if (!['pro', 'business'].includes(plan)) throw new AppError('Invalid plan', 400);

    const priceId = PLAN_PRICE_IDS()[plan];
    if (!priceId) throw new AppError(`Price ID for ${plan} plan not configured`, 503);

    const [rows] = await query('SELECT stripe_customer_id FROM users WHERE id = ?', [req.user.id]);
    let customerId = rows[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name:  req.user.name || undefined,
        metadata: { userId: String(req.user.id) },
      });
      customerId = customer.id;
      await query('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customerId, req.user.id]);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/dashboard?upgrade=success`,
      cancel_url:  `${frontendUrl}/dashboard`,
      subscription_data: { metadata: { userId: String(req.user.id), plan } },
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/billing/portal  — manage existing subscription
router.post('/portal', authenticate, async (req, res, next) => {
  try {
    const stripe = getStripe();
    const [rows] = await query('SELECT stripe_customer_id FROM users WHERE id = ?', [req.user.id]);
    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) throw new AppError('No billing account found', 404);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${frontendUrl}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/billing/webhook  — called with raw body by app.js
async function handleWebhook(req, res) {
  const stripe = getStripe();
  const sig    = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Stripe webhook signature failed', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription') break;
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = sub.items.data[0]?.price?.id;
        const plan = planFromPriceId(priceId);
        await query(
          'UPDATE users SET plan = ?, stripe_subscription_id = ? WHERE stripe_customer_id = ?',
          [plan, session.subscription, session.customer]
        );
        logger.info('Plan activated', { plan, customer: session.customer });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const priceId = sub.items.data[0]?.price?.id;
        const plan    = planFromPriceId(priceId);
        const active  = ['active', 'trialing'].includes(sub.status);
        await query(
          'UPDATE users SET plan = ? WHERE stripe_customer_id = ?',
          [active ? plan : 'free', sub.customer]
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await query(
          "UPDATE users SET plan = 'free', stripe_subscription_id = NULL WHERE stripe_customer_id = ?",
          [sub.customer]
        );
        logger.info('Subscription cancelled — downgraded to free', { customer: sub.customer });
        break;
      }

      case 'invoice.payment_failed': {
        logger.warn('Payment failed', { customer: event.data.object.customer });
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Webhook handler error', { error: err.message, type: event.type });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

module.exports = { router, handleWebhook };
