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

    // 3️⃣ Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
    });

    // 4️⃣ Send email
    await transporter.sendMail({
      from: `"Zen Healing" <${process.env.GMAIL_USER}>`,
      to: variables.to_email,
      subject: variables.subject || "Booking Notification",
      html,
    });

    console.log(`✅ Email sent via Nodemailer (${template})`);
    return true;
  } catch (err) {
    console.error("❌ Email sending failed", err);
    return false;
  }
}



/**
 * Send booking cancellation emails (user/admin) separately
 */
export async function sendCancelEmail(
  variables: Record<string, any>,
  template: "user" | "admin" = "user"
) {
  try {
    const templateFile =
      template === "user"
        ? "booking-cancel-temp-user.html"
        : "booking-cancel-temp-admin.html";

    const templatePath = path.join(process.cwd(), "src/templates", templateFile);
    let html = fs.readFileSync(templatePath, "utf-8");

    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      html = html.replace(regex, variables[key] ?? "");
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Zen Healing" <${process.env.GMAIL_USER}>`,
      to: variables.to_email,
      subject: variables.subject || "Booking Cancelled",
      html,
    });

    console.log(`✅ Cancellation email sent (${template})`);
    return true;
  } catch (err) {
    console.error("❌ Cancellation email sending failed", err);
    return false;
  }
}
