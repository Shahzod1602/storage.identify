import nodemailer from "nodemailer";
import { getConfig } from "@storagedb/config";

// SMTP yo'q bo'lsa, jsonTransport ishlatiladi (email yuborilmaydi, faqat loglanadi) —
// dev'da email oqimini sinash uchun qulay.
let transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (transport) return transport;
  const cfg = getConfig();
  if (cfg.SMTP_HOST) {
    transport = nodemailer.createTransport({
      host: cfg.SMTP_HOST,
      port: cfg.SMTP_PORT,
      secure: cfg.SMTP_SECURE,
      auth:
        cfg.SMTP_USER && cfg.SMTP_PASS
          ? { user: cfg.SMTP_USER, pass: cfg.SMTP_PASS }
          : undefined,
    });
  } else {
    transport = nodemailer.createTransport({ jsonTransport: true });
  }
  return transport;
}

/** SMTP sozlanganmi? (false bo'lsa email faqat loglanadi) */
export function smtpConfigured(): boolean {
  return Boolean(getConfig().SMTP_HOST);
}

export async function sendMail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const cfg = getConfig();
  const info = await getTransport().sendMail({
    from: cfg.SMTP_FROM,
    to,
    subject,
    html,
  });
  if (!smtpConfigured()) {
    // Dev: emailni konsolga chiqaramiz (havola ko'rinadi).
    console.log(`[mailer] (SMTP yo'q) ${subject} -> ${to}\n${html}`);
  }
  void info;
}

export function confirmEmailHtml(link: string): string {
  return `<h2>Email'ingizni tasdiqlang</h2>
<p>Ro'yxatdan o'tganingiz uchun rahmat. Tasdiqlash uchun bosing:</p>
<p><a href="${link}">${link}</a></p>`;
}

export function recoveryEmailHtml(link: string): string {
  return `<h2>Parolni tiklash</h2>
<p>Yangi parol o'rnatish uchun bosing (1 soat amal qiladi):</p>
<p><a href="${link}">${link}</a></p>`;
}
