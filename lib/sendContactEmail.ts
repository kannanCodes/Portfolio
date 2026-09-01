"use server";

import { sendPortfolioEmail } from "@/lib/email";

export type ContactFormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export async function sendContactEmail(
  data: ContactFormData
): Promise<{ success: boolean; error?: string }> {
  // Server-side validation
  if (!data.name?.trim()) return { success: false, error: "Name is required." };
  if (!data.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { success: false, error: "Valid email is required." };
  }
  if (!data.subject?.trim()) return { success: false, error: "Subject is required." };
  if (!data.message?.trim() || data.message.trim().length < 10) {
    return { success: false, error: "Message must be at least 10 characters." };
  }

  try {
    await sendPortfolioEmail({
      replyTo: data.email,
      subject: `[Portfolio] ${data.subject}`,
      text: `Name: ${data.name}\nEmail: ${data.email}\n\n${data.message}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111;">New message from your portfolio</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #555; font-weight: 600; width: 80px;">Name</td>
              <td style="padding: 8px 0;">${data.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #555; font-weight: 600;">Email</td>
              <td style="padding: 8px 0;"><a href="mailto:${data.email}">${data.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #555; font-weight: 600;">Subject</td>
              <td style="padding: 8px 0;">${data.subject}</td>
            </tr>
          </table>
          <div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 6px;">
            <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Contact email send error:", error);
    return { success: false, error: "Failed to send message. Please try again." };
  }
}
