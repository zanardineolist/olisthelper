import { google } from 'googleapis';
import bcrypt from 'bcryptjs';

const sheets = google.sheets('v4');

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { name, email, password } = req.body;

    try {
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

      // Gerar ID aleatório de 4 dígitos
      const id = Math.floor(1000 + Math.random() * 9000);

      // Criptografar a senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Inserir os dados do usuário na aba "Usuários"
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SHEET_ID,
        range: 'Usuários',
        valueInputOption: 'RAW',
        resource: {
          values: [[id, name, email, hashedPassword, 'user']],
        },
      });

      return res.status(200).json({ message: 'User registered successfully' });
    } catch (err) {
      console.error('Failed to register user:', err);
      return res.status(500).json({ error: 'Failed to register user.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
