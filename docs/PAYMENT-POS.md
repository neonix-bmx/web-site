# Sanal POS Integration (Checklist)

This is a non-code checklist for integrating a POS provider.

## Required info
- Provider name
- Merchant ID / API key / Secret
- Test credentials
- Webhook callback URL
- HMAC or signature algorithm

## Suggested environment variables
```
POS_PROVIDER=
POS_MERCHANT_ID=
POS_API_KEY=
POS_API_SECRET=
POS_WEBHOOK_SECRET=
POS_WEBHOOK_URL=https://your-domain.com/api/pos/webhook
```

## Security notes
- Store secrets in `/var/berrymx` or your deployment secret manager.
- Verify webhook signature before marking payment as successful.
- Log transaction id, amount, currency, and status.

## Legal notes
- Show the distance sales contract and cancellation/return policy before payment.
- For digital products, require explicit consent for immediate delivery.
