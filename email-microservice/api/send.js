const nodemailer = require('nodemailer');

const API_KEY = process.env.EMAIL_API_KEY;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = (process.env.SMTP_PASS || '').replace(/"/g, '');

if (!API_KEY || !SMTP_USER || !SMTP_PASS) {
    console.error("WARNING: Missing required environment variables (EMAIL_API_KEY, SMTP_USER, SMTP_PASS) for the email microservice!");
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: SMTP_USER || '',
        pass: SMTP_PASS || ''
    }
});

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const authHeader = req.headers['x-api-key'] || req.headers['authorization'] || req.query?.apiKey;
    if (authHeader !== API_KEY && authHeader !== `Bearer ${API_KEY}`) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    try {
        let payload = req.body;
        if (typeof payload === 'string') {
            try {
                payload = JSON.parse(payload);
            } catch (e) {}
        }
        if (!payload || Object.keys(payload).length === 0) {
            payload = req.query || {};
        }

        const { to, subject, html, text, from } = payload;

        if (!to || !subject || (!html && !text)) {
            return res.status(400).json({ error: 'Missing required fields: to, subject, and html/text' });
        }

        const mailOptions = {
            from: from || `"VOICE Gurukul" <${SMTP_USER}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            html: html,
            text: text
        };

        const info = await transporter.sendMail(mailOptions);

        return res.status(200).json({
            success: true,
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted
        });
    } catch (error) {
        console.error('Email sending error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal Server Error'
        });
    }
};
