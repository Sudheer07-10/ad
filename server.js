const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite Database (use /tmp on Vercel to avoid Read-Only file system errors)
const dbPath = process.env.VERCEL ? '/tmp/appointments.db' : './appointments.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patientName TEXT NOT NULL,
            phoneNumber TEXT NOT NULL,
            date TEXT NOT NULL,
            timeSlot TEXT NOT NULL,
            UNIQUE(date, timeSlot)
        )`, (err) => {
            if (err) {
                console.error('Error creating table', err.message);
            }
        });
    }
});

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

    db.all(`SELECT timeSlot FROM appointments WHERE date = ?`, [date], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const bookedSlots = rows.map(row => row.timeSlot);
        const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
        
        res.json({ date, availableSlots });
    });
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

    const sql = `INSERT INTO appointments (patientName, phoneNumber, date, timeSlot) VALUES (?, ?, ?, ?)`;
    
    db.run(sql, [name, phone, date, timeSlot], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'This time slot is already booked. Please choose another.' });
            }
            return res.status(500).json({ error: err.message });
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

        res.json({ message: 'Appointment booked successfully!', id: this.lastID });
    });
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
