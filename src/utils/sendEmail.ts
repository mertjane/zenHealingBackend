import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();


/**
 * Send booking confirmation (user/admin) emails
 */

export async function sendEmail(
  variables: Record<string, any>,
  template: "user" | "admin" = "user"
) {
  try {
    // 1️⃣ Choose template
    const templateFile =
      template === "user"
        ? "booking-confirm-user.html"
        : "booking-confirm-admin.html";

    const templatePath = path.join(process.cwd(), "src/templates", templateFile);
    let html = fs.readFileSync(templatePath, "utf-8");

    // 2️⃣ Replace placeholders
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      html = html.replace(regex, variables[key] ?? "");
    });

    // 3️⃣ Send email via SMTP2GO API
    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.GMAIL_APP_PASS, // put your API key in Render secrets
        to: [variables.to_email],
        sender: process.env.GMAIL_USER,
        subject: variables.subject || "Booking Notification",
        html_body: html,
        text_body: variables.text_body || "",
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Email sent via SMTP2GO API (${template})`);
      return true;
    } else {
      console.error("❌ SMTP2GO API error:", data);
      return false;
    }
  } catch (err) {
    console.error("❌ Email sending failed", err);
    return false;
  }
}


/**
 * Send booking cancellation emails (user/admin) via SMTP2GO API
 */
export async function sendCancelEmail(
  variables: Record<string, any>,
  template: "user" | "admin" = "user"
) {
  try {
    // 1️⃣ Choose template
    const templateFile =
      template === "user"
        ? "booking-cancel-temp-user.html"
        : "booking-cancel-temp-admin.html";

    const templatePath = path.join(process.cwd(), "src/templates", templateFile);
    let html = fs.readFileSync(templatePath, "utf-8");

    // 2️⃣ Replace placeholders
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      html = html.replace(regex, variables[key] ?? "");
    });

    // 3️⃣ Send email via SMTP2GO API
    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.SMTP2GO_API_KEY, // your SMTP2GO API key from Render secrets
        to: [variables.to_email],
        sender: process.env.GMAIL_USER,
        subject: variables.subject || "Booking Cancelled",
        html_body: html,
        text_body: variables.text_body || "",
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Cancellation email sent via SMTP2GO API (${template})`);
      return true;
    } else {
      console.error("❌ SMTP2GO API error:", data);
      return false;
    }
  } catch (err) {
    console.error("❌ Cancellation email sending failed", err);
    return false;
  }
}
