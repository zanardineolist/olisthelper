// services/googleSheets.js
const { google } = require('googleapis');
require('dotenv').config();

console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET);
console.log("GOOGLE_REDIRECT_URI:", process.env.GOOGLE_REDIRECT_URI);

const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

function getAuthUrl() {
    const scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ];
    return auth.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI // Incluindo explicitamente o redirect_uri
    });
}

async function getUserDetails(code) {
    console.log("Código recebido para autenticação:", code);
    const { tokens } = await auth.getToken(code);
    auth.setCredentials(tokens);

    const oauth2 = google.oauth2({
        auth,
        version: 'v2',
    });
    const { data } = await oauth2.userinfo.get();
    return data; // Retorna o perfil do usuário
}

module.exports = { getAuthUrl, getUserDetails };