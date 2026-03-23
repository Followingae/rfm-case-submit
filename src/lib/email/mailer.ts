import nodemailer from "nodemailer";
import type { ReactElement } from "react";
import { render } from "@react-email/components";

// SMTP config from environment — user provides later
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "RFM Portal <no-reply@rfmloyalty.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export function isEmailConfigured(): boolean {
  return !!SMTP_HOST;
}

export async function sendEmail({
  to,
  subject,
  template,
}: {
  to: string | string[];
  subject: string;
  template: ReactElement;
}) {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[Email] SMTP not configured. Would send to ${to}: ${subject}`);
    return false;
  }

  try {
    const html = await render(template);
    const text = await render(template, { plainText: true });

    await transport.sendMail({
      from: SMTP_FROM,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
      text,
    });

    console.log(`[Email] Sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err);
    return false;
  }
}

export { APP_URL };
