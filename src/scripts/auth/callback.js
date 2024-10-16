// scripts/auth/callback.js
const { getUserDetails } = require('../../services/googleSheets');
const { google } = require('googleapis');

const sheets = google.sheets('v4');

module.exports = async (req, res) => {
    const code = req.query.code;

    try {
        const user = await getUserDetails(code);

        // Verifica se o usuário já existe na planilha
        const spreadsheetId = process.env.SPREADSHEET_ID;
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const client = await auth.getClient();
        const range = 'Usuários!A2:C';
        
        const response = await sheets.spreadsheets.values.get({
            auth: client,
            spreadsheetId,
            range,
        });

        const users = response.data.values || [];
        const isUserRegistered = users.some((row) => row[1] === user.email);

        if (!isUserRegistered) {
            // Registra o novo usuário
            await sheets.spreadsheets.values.append({
                auth: client,
                spreadsheetId,
                range: 'Usuários',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[Date.now(), user.email, user.name]],
                },
            });
        }

        // Autenticação bem-sucedida
        res.redirect('/dashboard.html');
    } catch (error) {
        console.error('Erro durante a autenticação:', error);
        res.status(500).send('Erro durante a autenticação');
    }
};
