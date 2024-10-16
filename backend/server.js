const express = require('express');
const { google } = require('googleapis');
require('dotenv').config();
const app = express();

app.use(express.json());

const sheets = google.sheets({ version: 'v4' });
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const spreadsheetId = process.env.SPREADSHEET_ID;

app.get('/api/google-client-id', (req, res) => {
    res.json({ clientId: process.env.GOOGLE_CLIENT_ID });
});

app.post('/api/checkUser', async (req, res) => {
    try {
        const client = await auth.getClient();
        const result = await sheets.spreadsheets.values.get({
            auth: client,
            spreadsheetId,
            range: 'Usuários!A:E'
        });
        
        const rows = result.data.values;
        const userEmail = req.body.email;
        
        const userExists = rows.some(row => row[2] === userEmail);
        
        res.json({ exists: userExists });
    } catch (error) {
        console.error('Error checking user:', error);
        res.status(500).send('Error checking user');
    }
});

app.post('/api/registerUser', async (req, res) => {
    try {
        const client = await auth.getClient();
        const { id, name, email, isAnalyst, isUser } = req.body;
        
        const values = [
            [id, name, email, isAnalyst ? 'TRUE' : 'FALSE', isUser ? 'TRUE' : 'FALSE']
        ];
        
        await sheets.spreadsheets.values.append({
            auth: client,
            spreadsheetId,
            range: 'Usuários!A:E',
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Error registering user');
    }
});

app.listen(3000, () => console.log('Server started on port 3000'));
