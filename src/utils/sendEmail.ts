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
    console.log(`📧 Attempting to send ${template} email to:`, variables.to_email);
    
    // 1️⃣ Choose template
    const templateFile =
      template === "user"
        ? "booking-confirm-user.html"
        : "booking-confirm-admin.html";

    const templatePath = path.join(process.cwd(), "src/templates", templateFile);
    let html = fs.readFileSync(templatePath, "utf-8");

    // 2️⃣ Replace placeholders
    console.log("📧 Template variables:", variables);
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      const oldValue = html.match(regex);
      html = html.replace(regex, variables[key] ?? "");
      if (oldValue) {
        console.log(`📧 Replaced {{${key}}} with:`, variables[key]);
      }
    });

    // 3️⃣ Check environment variables
    if (!process.env.GMAIL_APP_PASS || !process.env.GMAIL_USER) {
      console.error("❌ Missing email environment variables:", {
        GMAIL_APP_PASS: !!process.env.GMAIL_APP_PASS,
        GMAIL_USER: !!process.env.GMAIL_USER
      });
      return false;
    }

    // 4️⃣ Send email via SMTP2GO API
    const emailPayload = {
      api_key: process.env.GMAIL_APP_PASS,
      to: [variables.to_email],
      sender: process.env.GMAIL_USER,
      subject: variables.subject || "Booking Notification",
      html_body: html,
      text_body: variables.text_body || "",
    };

    console.log("📧 Email payload:", {
      to: emailPayload.to,
      sender: emailPayload.sender,
      subject: emailPayload.subject,
      has_html: !!emailPayload.html_body
    });

    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailPayload),
    });

    const data = await response.json();
    console.log("📧 SMTP2GO Response:", data);

    // Check if email was sent successfully
    if (data.data && data.data.succeeded > 0) {
      console.log(`✅ Email sent via SMTP2GO API (${template}) - ${data.data.succeeded} succeeded`);
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
        api_key: process.env.GMAIL_APP_PASS, // your SMTP2GO API key from Render secrets
        to: [variables.to_email],
        sender: process.env.GMAIL_USER,
        subject: variables.subject || "Booking Cancelled",
        html_body: html,
        text_body: variables.text_body || "",
      }),
    });

    const data = await response.json();

    // Check if email was sent successfully
    if (data.data && data.data.succeeded > 0) {
      console.log(`✅ Cancellation email sent via SMTP2GO API (${template}) - ${data.data.succeeded} succeeded`);
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
