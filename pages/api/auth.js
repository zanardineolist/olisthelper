import { google } from 'googleapis';
import bcrypt from 'bcryptjs';

// Definindo cada parte das credenciais do Google separadamente
const GOOGLE_CREDENTIALS_TYPE = process.env.GOOGLE_CREDENTIALS_TYPE;
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const GOOGLE_PRIVATE_KEY_ID = process.env.GOOGLE_PRIVATE_KEY_ID;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_AUTH_URI = process.env.GOOGLE_AUTH_URI;
const GOOGLE_TOKEN_URI = process.env.GOOGLE_TOKEN_URI;
const GOOGLE_AUTH_PROVIDER_X509_CERT_URL = process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL;
const GOOGLE_CLIENT_X509_CERT_URL = process.env.GOOGLE_CLIENT_X509_CERT_URL;

const sheets = google.sheets('v4');

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { name, email, password } = req.body;

    // Gerar ID aleatório de 4 dígitos
    const id = Math.floor(1000 + Math.random() * 9000);

    // Criptografar a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // Autenticação no Google Sheets
      const auth = new google.auth.GoogleAuth({
        credentials: {
          type: GOOGLE_CREDENTIALS_TYPE,
          project_id: GOOGLE_PROJECT_ID,
          private_key_id: GOOGLE_PRIVATE_KEY_ID,
          private_key: GOOGLE_PRIVATE_KEY,
          client_email: GOOGLE_CLIENT_EMAIL,
          client_id: GOOGLE_CLIENT_ID,
          auth_uri: GOOGLE_AUTH_URI,
          token_uri: GOOGLE_TOKEN_URI,
          auth_provider_x509_cert_url: GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
          client_x509_cert_url: GOOGLE_CLIENT_X509_CERT_URL,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const client = await auth.getClient();
      google.options({ auth: client });

      // Inserir os dados do usuário na aba "Usuários"
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SHEET_ID,
        range: 'Usuários',
        valueInputOption: 'RAW',
        resource: {
          values: [[id, name, email, hashedPassword, 'user']],
        },
      });

      res.status(200).json({ message: 'User registered successfully' });
    } catch (err) {
      console.error('Failed to register user:', err);
      res.status(500).json({ error: 'Failed to register user' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}