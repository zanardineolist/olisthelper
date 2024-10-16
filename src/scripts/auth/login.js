// scripts/auth/login.js
const { getAuthUrl } = require('../../services/googleSheets');

module.exports = (req, res) => {
    const authUrl = getAuthUrl();
    res.redirect(authUrl);
};
