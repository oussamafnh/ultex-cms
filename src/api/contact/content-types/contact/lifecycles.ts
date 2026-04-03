import { google } from "googleapis";
import nodemailer from "nodemailer";

const processing = new Set<string>();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export default {
  async beforeCreate(event: any) {
    const data = event.params.data;

    if (!data.nom || !data.email) return;

    const key = `${data.nom}|${data.email}|${data.telephone}|${data.message}`;

    if (processing.has(key)) return;
    processing.add(key);

    try {
      const auth = new google.auth.JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const sheets = google.sheets({ version: "v4", auth });

      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "Feuille 1!A1",
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              data.nom,
              data.secteur,
              data.telephone,
              data.email,
              data.pays_ville,
              data.sujet,
              data.message,
              new Date().toISOString().replace("T", " ").slice(0, 16),
            ],
          ],
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: process.env.ADMIN_EMAIL,
        subject: `Nouveau message de contact – ${data.sujet || "Sans sujet"}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <div style="background:#1d4ed8;padding:24px 32px;">
              <h1 style="color:#fff;margin:0;font-size:20px;">Nouveau message de contact</h1>
            </div>
            <div style="padding:32px;background:#fff;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;width:140px;">Nom</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">${data.nom}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;">Email</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                    <a href="mailto:${data.email}" style="color:#1d4ed8;">${data.email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;">Téléphone</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">${data.telephone || "—"}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;">Secteur</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">${data.secteur || "—"}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;">Pays / Ville</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">${data.pays_ville || "—"}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;">Sujet</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">${data.sujet || "—"}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;font-weight:600;vertical-align:top;">Message</td>
                  <td style="padding:10px 0;white-space:pre-wrap;">${data.message || "—"}</td>
                </tr>
              </table>
            </div>
            <div style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#9ca3af;text-align:center;">
              Reçu le ${new Date().toLocaleString("fr-FR", { timeZone: "Africa/Casablanca" })}
            </div>
          </div>
        `,
      });
    } catch (err) {
      console.error("Contact lifecycle error:", err);
    } finally {
      setTimeout(() => { processing.delete(key); }, 3000);
    }
  },
};