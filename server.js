const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Generate all possible 15-minute slots between 9 AM and 6 PM
function generateAllSlots() {
    const slots = [];
    let startHour = 9;
    let endHour = 18; // 6 PM
    
    for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += 15) {
            const hour = h.toString().padStart(2, '0');
            const min = m.toString().padStart(2, '0');
            slots.push(`${hour}:${min}`);
        }
    }
    return slots;
}

const allSlots = generateAllSlots();

// API to get available slots for a specific date
app.get('/api/slots', (req, res) => {
    const { date } = req.query;
    
    if (!date) {
        return res.status(400).json({ error: 'Date is required' });
    }

    // Since we are no longer using SQLite, just return all slots.
    // (You can filter them out later if you decide to implement a database again)
    res.json({ date, availableSlots: allSlots });
});

// API to book an appointment
app.post('/api/book', (req, res) => {
    const { name, phone, date, timeSlot } = req.body;
    
    if (!name || !phone || !date || !timeSlot) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if valid date
    if (date !== '2026-08-22' && date !== '2026-08-23') {
        return res.status(400).json({ error: 'Appointments only available on Aug 22 or 23, 2026' });
    }
    
    if (!allSlots.includes(timeSlot)) {
        return res.status(400).json({ error: 'Invalid time slot' });
    }

    // Forward data to Google Sheets via Apps Script Web App
    const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbyBD8TdMWxsCk0xqlSBSJFWbi-iwB_5qchyKiwELpOKFb1viN9SO6vpi5UN0bor7SGmXQ/exec';
    
    // Fire and forget request to Google Sheets
    fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, date, timeSlot })
    })
    .then(response => response.text())
    .then(result => console.log('Google Sheets Update:', result))
    .catch(err => console.error('Failed to update Google Sheets', err));

    res.json({ message: 'Appointment booked successfully!' });
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
