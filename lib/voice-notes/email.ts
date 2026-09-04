import { escapeHtml, sendPortfolioEmail } from "@/lib/email";

export async function sendVoiceNoteNotification(input: {
  id?: string;
  name: string;
  email: string;
  duration: number;
  createdAt: Date;
  signedUrl: string;
}) {
  const safeName = escapeHtml(input.name);
  const safeEmail = escapeHtml(input.email);
  const safeId = input.id ? escapeHtml(input.id) : null;
  const duration = `${Math.round(input.duration)}s`;
  const dateTime = input.createdAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  await sendPortfolioEmail({
    replyTo: input.email,
    subject: `[Portfolio] New voice note from ${input.name}`,
    text: [
      "New voice note from your portfolio",
      "",
      `ID: ${input.id ?? "n/a"}`,
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Duration: ${duration}`,
      `Date/time: ${dateTime}`,
      "",
      `Listen: ${input.signedUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #111;">New voice note from your portfolio</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #555; font-weight: 600; width: 110px;">Name</td>
            <td style="padding: 8px 0;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #555; font-weight: 600;">Email</td>
            <td style="padding: 8px 0;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #555; font-weight: 600;">Duration</td>
            <td style="padding: 8px 0;">${duration}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #555; font-weight: 600;">Date/time</td>
            <td style="padding: 8px 0;">${escapeHtml(dateTime)}</td>
          </tr>
        </table>
        <p style="margin-top: 18px;">
          <a href="${escapeHtml(input.signedUrl)}" style="color: #111; font-weight: 600;">
            Listen to the voice note
          </a>
        </p>
        <p style="color: #777; font-size: 12px;">
          This private signed link expires automatically.
        </p>
      </div>
    `,
  });
}
