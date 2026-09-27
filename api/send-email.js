export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Solis";

  if (!apiKey || !senderEmail) {
    return res.status(500).json({ error: "Brevo environment variables are not configured" });
  }

  const { to, subject, htmlContent, textContent } = req.body || {};

  if (!to || !subject || (!htmlContent && !textContent)) {
    return res.status(400).json({
      error: "Required fields: to, subject, and htmlContent or textContent"
    });
  }

  const recipients = Array.isArray(to)
    ? to.map(email => ({ email }))
    : [{ email: to }];

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName
      },
      to: recipients,
      subject,
      ...(htmlContent ? { htmlContent } : {}),
      ...(textContent ? { textContent } : {})
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return res.status(response.status).json({
      error: "Brevo request failed",
      details: data
    });
  }

  return res.status(200).json({
    success: true,
    messageId: data.messageId || null
  });
}
