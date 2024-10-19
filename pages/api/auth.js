import { google } from 'googleapis';
import bcrypt from 'bcryptjs';

const sheets = google.sheets('v4');

export default async function handler(req, res) {
  console.log(`[LOGIN API] - Method: ${req.method}`);
  console.log(`[LOGIN API] - URL: ${req.url}`);

  if (req.method === 'POST') {
    const { email, password } = req.body;
    console.log(`[LOGIN API] - Received Data: email=${email}`);

    try {
      // Autenticação no Google Sheets
      const auth = new google.auth.GoogleAuth({
        credentials: {
          type: process.env.GOOGLE_CREDENTIALS_TYPE,
          project_id: process.env.GOOGLE_PROJECT_ID,
          private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          client_id: process.env.GOOGLE_CLIENT_ID,
          auth_uri: process.env.GOOGLE_AUTH_URI,
          token_uri: process.env.GOOGLE_TOKEN_URI,
          auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
          client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const client = await auth.getClient();
      google.options({ auth: client });

      // Ler os dados da aba "Usuários" do Google Sheets
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID,
        range: 'Usuários!A:E',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('[LOGIN API] - No users found in the spreadsheet.');
        return res.status(404).json({ error: 'No users found.' });
      }

      // Encontrar o usuário pelo email
      const user = rows.find((row) => row[2] === email);
      if (!user) {
        console.log('[LOGIN API] - Email not found.');
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Verificar a senha
      const hashedPassword = user[3];
      const passwordMatch = await bcrypt.compare(password, hashedPassword);
      if (!passwordMatch) {
        console.log('[LOGIN API] - Password does not match.');
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Login bem-sucedido
      console.log(`[LOGIN API] - Login successful for user: ${user[1]}`);
      res.status(200).json({ message: 'Login successful', user: { id: user[0], name: user[1], email: user[2] } });

    } catch (err) {
      console.error('[LOGIN API] - Failed to login:', err);
      res.status(500).json({ error: 'Failed to login.' });
    }
  } else {
    console.log(`[LOGIN API] - Method ${req.method} Not Allowed`);
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
