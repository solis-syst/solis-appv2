# Solis Brevo Backend

Vercel serverless backend for sending email through the Brevo API.

## Environment variables

Configure these in Vercel:

- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME` (optional)

Never commit the Brevo API key.

## Endpoint

`POST /api/send-email`

Example JSON body:

```json
{
  "to": "recipient@example.com",
  "subject": "Test email",
  "htmlContent": "<h1>Hello from Solis</h1>"
}
```

The endpoint also accepts an array of recipient addresses in `to`.
