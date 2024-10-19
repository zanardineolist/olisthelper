import { google } from 'googleapis';
import bcrypt from 'bcryptjs';

const sheets = google.sheets('v4');

export default async function handler(req, res) {
  const { method } = req;

  try {
    // Configurar autenticação com Google Sheets
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

    if (method === 'POST') {
      const { action, email, password, name } = req.body;

      if (action === 'register') {
        // Rota para Registro de Usuário

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

      } else if (action === 'login') {
        // Rota para Login de Usuário

        // Ler os dados da aba "Usuários" do Google Sheets
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.SHEET_ID,
          range: 'Usuários!A:E',
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
          return res.status(404).json({ error: 'No users found.' });
        }

        // Encontrar o usuário pelo email
        const user = rows.find((row) => row[2] === email);
        if (!user) {
          return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Verificar a senha
        const hashedPassword = user[3];
        const passwordMatch = await bcrypt.compare(password, hashedPassword);
        if (!passwordMatch) {
          return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Login bem-sucedido
        return res.status(200).json({ message: 'Login successful', user: { id: user[0], name: user[1], email: user[2] } });

      } else {
        return res.status(400).json({ error: 'Invalid action specified.' });
      }

    } else {
      // Método HTTP não permitido
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Method ${method} Not Allowed`);
    }

  } catch (err) {
    console.error('Failed to process request:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
