import { google } from 'googleapis';
import bcrypt from 'bcryptjs';

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
      console.log('Google Credentials:', process.env.GOOGLE_CREDENTIALS);
        const auth = new google.auth.GoogleAuth({
          credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
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
