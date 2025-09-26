import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

/**
 * Multiple SMTP configurations to try
 */
const smtpConfigs = [
  // Gmail with different ports and security settings
  {
    name: "Gmail SMTP (587 STARTTLS)",
    config: {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    }
  },
  {
    name: "Gmail SMTP (465 SSL)",
    config: {
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    }
  },
  {
    name: "Gmail Service",
    config: {
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    }
  },
  // Alternative: Outlook/Hotmail SMTP (if you have an outlook account)
  {
    name: "Outlook SMTP",
    config: {
      host: "smtp-mail.outlook.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.OUTLOOK_USER, // Add this to your .env if using Outlook
        pass: process.env.OUTLOOK_PASS,
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      }
    }
  }
];

/**
 * Try multiple SMTP configurations until one works
 */
async function createWorkingTransporter() {
  for (const smtp of smtpConfigs) {
    try {
      console.log(`🔧 Trying ${smtp.name}...`);
      
      // Skip configs with missing credentials
      if (smtp.name === "Outlook SMTP" && (!process.env.OUTLOOK_USER || !process.env.OUTLOOK_PASS)) {
        console.log(`⏭️ Skipping ${smtp.name} - no credentials`);
        continue;
      }
      
      const transporter = nodemailer.createTransport(smtp.config);
      
      // Test connection with timeout
      await Promise.race([
        transporter.verify(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection test timeout')), 15000)
        )
      ]);
      
      console.log(`✅ ${smtp.name} connected successfully!`);
      return { transporter, name: smtp.name };
      
    } catch (error: any) {
      console.log(`❌ ${smtp.name} failed:`, error.message);
      continue;
    }
  }
  
  throw new Error('All SMTP configurations failed');
}

/**
 * Send email with fallback configurations
 */
export async function sendEmail(
  variables: Record<string, any>,
  template: "user" | "admin" = "user"
) {
  console.log(`🔄 Starting email send with fallback (${template})`);
  
  try {
    // 1️⃣ Load template
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
    
    // 3️⃣ Get working transporter
    const { transporter, name } = await createWorkingTransporter();
    console.log(`📤 Using ${name} to send email`);
    
    // 4️⃣ Send email
    await Promise.race([
      transporter.sendMail({
        from: `"Zen Healing" <${process.env.GMAIL_USER}>`,
        to: variables.to_email,
        subject: variables.subject || "Booking Notification",
        html,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Send timeout')), 30000)
      )
    ]);
    
    console.log(`✅ Email sent successfully via ${name} (${template})`);
    return true;
    
  } catch (err: any) {
    console.error("❌ All email sending attempts failed:", err);
    
    // Log to file for later retry (optional)
    const failedEmail = {
      timestamp: new Date().toISOString(),
      variables,
      template,
      error: err.message
    };
    
    try {
      const logPath = path.join(process.cwd(), "failed-emails.json");
      let failedEmails = [];
      
      if (fs.existsSync(logPath)) {
        failedEmails = JSON.parse(fs.readFileSync(logPath, "utf-8"));
      }
      
      failedEmails.push(failedEmail);
      fs.writeFileSync(logPath, JSON.stringify(failedEmails, null, 2));
      console.log("📝 Failed email logged for later retry");
    } catch (logError) {
      console.error("❌ Could not log failed email:", logError);
    }
    
    return false;
  }
}

/**
 * Send cancellation email with fallback
 */
export async function sendCancelEmail(
  variables: Record<string, any>,
  template: "user" | "admin" = "user"
) {
  console.log(`🔄 Starting cancellation email with fallback (${template})`);
  
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
    
    const { transporter, name } = await createWorkingTransporter();
    
    await Promise.race([
      transporter.sendMail({
        from: `"Zen Healing" <${process.env.GMAIL_USER}>`,
        to: variables.to_email,
        subject: variables.subject || "Booking Cancelled",
        html,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Send timeout')), 30000)
      )
    ]);
    
    console.log(`✅ Cancellation email sent via ${name} (${template})`);
    return true;
    
  } catch (err: any) {
    console.error("❌ Cancellation email sending failed:", err);
    return false;
  }
}

/**
 * Test all SMTP configurations
 */
export async function testAllSMTP() {
  console.log("🧪 Testing all SMTP configurations...");
  
  const results = [];
  
  for (const smtp of smtpConfigs) {
    try {
      // Skip configs with missing credentials
      if (smtp.name === "Outlook SMTP" && (!process.env.OUTLOOK_USER || !process.env.OUTLOOK_PASS)) {
        results.push({ name: smtp.name, status: "SKIPPED", reason: "No credentials" });
        continue;
      }
      
      console.log(`Testing ${smtp.name}...`);
      const transporter = nodemailer.createTransport(smtp.config);
      
      await Promise.race([
        transporter.verify(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 15000)
        )
      ]);
      
      results.push({ name: smtp.name, status: "SUCCESS" });
      console.log(`✅ ${smtp.name}: SUCCESS`);
      
    } catch (error: any) {
      results.push({ name: smtp.name, status: "FAILED", error: error.message });
      console.log(`❌ ${smtp.name}: ${error.message}`);
    }
  }
  
  console.log("\n📊 SMTP Test Results:");
  results.forEach(result => {
    console.log(`  ${result.name}: ${result.status}${result.error ? ` (${result.error})` : ''}${result.reason ? ` (${result.reason})` : ''}`);
  });
  
  return results;
}

/**
 * Retry failed emails from log file
 */
export async function retryFailedEmails() {
  const logPath = path.join(process.cwd(), "failed-emails.json");
  
  if (!fs.existsSync(logPath)) {
    console.log("📭 No failed emails to retry");
    return;
  }
  
  try {
    const failedEmails = JSON.parse(fs.readFileSync(logPath, "utf-8"));
    console.log(`🔄 Retrying ${failedEmails.length} failed emails...`);
    
    const successful = [];
    const stillFailed = [];
    
    for (const email of failedEmails) {
      try {
        if (email.template && email.variables) {
          const success = await sendEmail(email.variables, email.template);
          if (success) {
            successful.push(email);
            console.log(`✅ Retry successful for email to ${email.variables.to_email}`);
          } else {
            stillFailed.push(email);
          }
        }
      } catch (error: any) {
        stillFailed.push(email);
        console.log(`❌ Retry failed for email to ${email.variables?.to_email}`);
      }
    }
    
    // Update failed emails log
    fs.writeFileSync(logPath, JSON.stringify(stillFailed, null, 2));
    
    console.log(`📊 Retry results: ${successful.length} successful, ${stillFailed.length} still failed`);
    
  } catch (error) {
    console.error("❌ Error retrying failed emails:", error);
  }
}