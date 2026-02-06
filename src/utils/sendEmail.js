import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const response = await resend.emails.send({
      from: "Google Drive <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    console.log("✅ Resend email sent:", response.id);
  } catch (error) {
    console.error("❌ Resend email error:", error);
    throw error;
  }
};
