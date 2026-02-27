import { google } from "googleapis";

export default {
  async afterCreate(event: any) {
    const { result } = event;

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
              result.nom,
              result.secteur,
              result.telephone,
              result.email,
              result.pays_ville,
              result.sujet,
              result.message,
              new Date(result.createdAt).toISOString().replace("T", " ").slice(0, 16),
            ],
          ],
        },
      });

      console.log("✅ Google Sheets updated");
    } catch (err) {
      console.error("❌ Google Sheets error:", err);
    }
  },
};