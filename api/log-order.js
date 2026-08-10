// api/log-order.js
// Server-side Google Sheets logger — keeps the webhook URL out of client JS

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GOOGLE_SHEET_URL = process.env.GOOGLE_SHEET_URL; // NOT VITE_ prefix
    if (!GOOGLE_SHEET_URL) {
        // Silently skip if not configured — don't break checkout
        return res.status(200).json({ ok: true, skipped: true });
    }

    try {
        const payload = req.body;
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            sheaders: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('[log-order] Google Sheets sync failed:', err);
        return res.status(200).json({ ok: true, warning: 'Sheet sync failed' });
    }
}