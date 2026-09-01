import { Resend } from "resend";

export class EmailConfigurationError extends Error {
  constructor(message = "Email service is not configured.") {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

export type PortfolioEmailMessage = {
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const to = process.env.CONTACT_EMAIL;

  if (!apiKey || !from || !to) {
    throw new EmailConfigurationError();
  }

  return { apiKey, from, to };
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendPortfolioEmail(message: PortfolioEmailMessage) {
  const { apiKey, from, to } = getEmailConfig();
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: message.replyTo,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  if (error) {
    throw new Error(error.message);
  }
}
