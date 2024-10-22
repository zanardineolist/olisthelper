import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { google } from 'googleapis';

async function getUserRole(email) {
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

  return userRow ? userRow[3] : 'user';
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
        session.id = token.id;
        session.role = token.role || 'user';
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = await getUserRole(user.email);
      }
      return token;
    },
  },
});
