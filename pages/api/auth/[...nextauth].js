import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { google } from 'googleapis';

async function getUserDetails(email) {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.SHEET_ID;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Usuários!A:D',
  });

  const rows = response.data.values;
  const userRow = rows.find((row) => row[2] === email);

  if (userRow) {
    return {
      id: userRow[0],  // ID de 4 dígitos
      role: userRow[3] // Papel do usuário (analyst ou user)
    };
  }

  return { id: null, role: 'user' };
}

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      const authorizedDomains = process.env.AUTHORIZED_DOMAINS?.split(",") || [];
      const cleanAuthorizedDomains = authorizedDomains.map(domain => domain.trim().replace(/^@/, ''));
      const userDomain = user.email.split("@")[1];

      if (cleanAuthorizedDomains.length > 0 && !cleanAuthorizedDomains.includes(userDomain)) {
        return false;
      }

      return true;
    },
    async session({ session, token }) {
      if (token) {
        session.id = token.id; // ID de 4 dígitos da planilha
        session.role = token.role; // Papel do usuário (analyst ou user)
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        const userDetails = await getUserDetails(user.email);
        token.id = userDetails.id; // Armazena o ID de 4 dígitos da planilha
        token.role = userDetails.role; // Armazena o papel do usuário
      }
      return token;
    },
  },
});