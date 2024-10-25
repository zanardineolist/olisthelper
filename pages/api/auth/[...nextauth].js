// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import Providers from 'next-auth/providers';
import { google } from 'googleapis';
import Redis from 'ioredis';

// Configuração do Redis
const redis = new Redis(process.env.REDIS_URL);

export default NextAuth({
  providers: [
    Providers.Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { email } = credentials;

        if (!email) {
          throw new Error('E-mail é obrigatório.');
        }

        try {
          // Verificar se os dados do usuário já estão no cache
          let cachedUserData = await redis.get(`userAuth:${email}`);
          if (cachedUserData) {
            console.log('Cache hit for user authentication');
            return JSON.parse(cachedUserData);
          }

          console.log('Cache miss for user authentication, fetching from Google Sheets');

          // Autenticação com o Google Sheets API
          const auth = new google.auth.JWT(
            process.env.GOOGLE_CLIENT_EMAIL,
            null,
            process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            ['https://www.googleapis.com/auth/spreadsheets']
          );

          const sheets = google.sheets({ version: 'v4', auth });
          const sheetId = process.env.SHEET_ID;

          // Buscar dados da planilha de usuários
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Usuários!A:D', // Colunas A a D da aba "Usuários"
          });

          const rows = response.data.values;

          if (!rows) {
            throw new Error('Nenhum usuário encontrado.');
          }

          // Encontrar o usuário pelo e-mail
          const userRow = rows.find((row) => row[2].toLowerCase() === email.toLowerCase());
          if (!userRow) {
            throw new Error('Usuário não encontrado.');
          }

          // Estruturar os dados do usuário
          const user = {
            id: userRow[0], // Coluna A (ID)
            name: userRow[1], // Coluna B (Nome)
            email: userRow[2], // Coluna C (Email)
            role: userRow[3], // Coluna D (Função: user/analyst)
          };

          // Armazenar os dados do usuário no cache por 10 minutos
          await redis.set(`userAuth:${email}`, JSON.stringify(user), 'EX', 600);

          return user;
        } catch (error) {
          console.error('Erro ao autenticar usuário:', error);
          throw new Error('Erro ao autenticar usuário.');
        }
      },
    }),
  ],
  callbacks: {
    async session(session, user) {
      session.user = user;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});