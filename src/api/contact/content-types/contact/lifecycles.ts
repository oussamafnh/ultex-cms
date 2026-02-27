import { google } from "googleapis";

const processing = new Set<string>();

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
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => { processing.delete(key); }, 3000);
    }
  },
};