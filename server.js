import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/inbound-email', async (req, res) => {
    try {
        const { recipient, emailBody, emailSubject } = req.body;
        const userToken = recipient.split('@')[0];

      const { data: user, error } = await supabase
            .from('threadkeeper_users')
            .select('*')
            .eq('token', userToken)
            .single();

        if (error || !user) {
            console.error("Supabase lookup error:", error); // <-- Add this line
            return res.status(401).json({ error: "Unauthorized: Invalid token", details: error });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Extract the exact deadline timestamp from this email text. Return ONLY a valid ISO timestamp format (e.g. 2026-09-10T15:00:00Z):\n\n${emailBody}`;
        
        const aiResult = await model.generateContent(prompt);
        const targetTimestamp = aiResult.response.text().trim();

        const finalTime = new Date(new Date(targetTimestamp).getTime() - (user.buffer_offset_hours * 60 * 60 * 1000));

        await supabase.from('reminders').insert({
            user_token: userToken,
            subject: emailSubject,
            target_time: finalTime.toISOString()
        });

        return res.status(200).json({ success: true, message: "Reminder locked in." });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error processing email." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
