import dotenv from "dotenv";

dotenv.config();

export async function sendEmail(
  variables: Record<string, any>
) {
  const url = "https://api.emailjs.com/api/v1.0/email/send";

  const payload = {
    service_id: process.env.EMAILJS_SERVICE_ID,
    template_id: process.env.EMAILJS_TEMPLATE_ID,
    user_id: process.env.EMAILJS_PUBLIC_KEY, // ✅ must be private key
    template_params: variables,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`EmailJS error: ${errorText}`);
    }

    console.log("✅ Email sent via EmailJS");
    return true;
  } catch (err) {
    console.error("❌ Email sending failed", err);
    return false;
  }
}