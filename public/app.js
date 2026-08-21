document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const dateCards = document.querySelectorAll('.date-card');
    const slotsContainer = document.getElementById('slotsContainer');
    const tabs = document.querySelectorAll('.tab');
    const slotsSubtitle = document.getElementById('slotsSubtitle');
    
    // Form Elements
    const bookingForm = document.getElementById('bookingForm');
    const dateInput = document.getElementById('date');
    const timeSlotInput = document.getElementById('timeSlot');
    const nameInput = document.getElementById('name');
    const ageInput = document.getElementById('age');
    const phoneInput = document.getElementById('phone');
    const submitBtn = document.getElementById('submitBtn');
    
    // UI Elements
    const warningBanner = document.getElementById('warningBanner');
    const selectedSlotPill = document.getElementById('selectedSlotPill');
    const messageDiv = document.getElementById('message');
    
    // State
    let currentDate = null;
    let allCurrentSlots = [];
    let currentFilter = 'all';

    // Helper: Show Message
    const showMessage = (msg, type) => {
        messageDiv.innerHTML = msg;
        messageDiv.className = `message ${type}`;
        if (type === 'success') {
            setTimeout(() => { messageDiv.className = 'message hidden'; }, 5000);
        }
    };

    // Helper: Format Time (e.g. 09:00 -> 9:00 AM)
    const formatTime = (time24) => {
        const [hourStr, min] = time24.split(':');
        let hour = parseInt(hourStr);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${min} ${ampm}`;
    };

    // Helper: Calculate End Time (+15 mins)
    const getEndTime = (time24) => {
        const [hourStr, minStr] = time24.split(':');
        let h = parseInt(hourStr);
        let m = parseInt(minStr) + 15;
        if (m >= 60) {
            h += 1;
            m -= 60;
        }
        const hour24 = h.toString().padStart(2, '0');
        const min24 = m.toString().padStart(2, '0');
        return formatTime(`${hour24}:${min24}`);
    };

    // Categorize Slot
    const getCategory = (time24) => {
        const hour = parseInt(time24.split(':')[0]);
        if (hour < 12) return 'morning';
        if (hour < 16) return 'afternoon';
        return 'evening';
    };

    // Enable/Disable Form
    const toggleForm = (enabled) => {
        nameInput.disabled = !enabled;
        ageInput.disabled = !enabled;
        phoneInput.disabled = !enabled;
        submitBtn.disabled = !enabled;
        
        if (enabled) {
            warningBanner.style.display = 'none';
        } else {
            warningBanner.style.display = 'flex';
        }
    };

    // Render Slots based on filter
    const renderSlots = () => {
        if (!currentDate) return;
        
        slotsContainer.innerHTML = '';
        
        // Filter slots
        const filteredSlots = allCurrentSlots.filter(slot => {
            if (currentFilter === 'all') return true;
            return slot.category === currentFilter;
        });

        if (filteredSlots.length === 0) {
            slotsContainer.innerHTML = `<div class="placeholder-text">No slots available for this category.</div>`;
            return;
        }

        filteredSlots.forEach(slotObj => {
            const slotEl = document.createElement('div');
            // Booked slots logic is removed: All slots are available, but some are marked as 'Free'
            const isFree = slotObj.isFree;
            
            slotEl.className = `slot-card ${isFree ? 'free' : ''}`;
            if (timeSlotInput.value === slotObj.time24) {
                slotEl.classList.add('selected');
            }

            slotEl.innerHTML = `
                <div class="slot-time">${formatTime(slotObj.time24)}</div>
            `;
            
            slotEl.addEventListener('click', () => {
                document.querySelectorAll('.slot-card').forEach(el => el.classList.remove('selected'));
                slotEl.classList.add('selected');
                
                timeSlotInput.value = slotObj.time24;
                selectedSlotPill.textContent = `${formatTime(slotObj.time24)} to ${getEndTime(slotObj.time24)}`;
                selectedSlotPill.classList.add('active');
                
                toggleForm(true);
            });
            
            slotsContainer.appendChild(slotEl);
        });
    };

    // Update Tab Counts
    const updateTabCounts = () => {
        let counts = { all: 0, morning: 0, afternoon: 0, evening: 0 };
        let total = { all: allCurrentSlots.length, morning: 0, afternoon: 0, evening: 0 };

        allCurrentSlots.forEach(slot => {
            total[slot.category]++;
            // All slots are available, so count matches total
            counts.all++;
            counts[slot.category]++;
        });

        tabs.forEach(tab => {
            const filter = tab.dataset.filter;
            const countSpan = tab.querySelector('.count');
            if (filter === 'all') {
                countSpan.textContent = `(${counts.all})`;
            } else {
                countSpan.textContent = `(${counts[filter]}/${total[filter]})`;
            }
        });
    };

    // Fetch Slots
    const fetchSlots = async (date) => {
        slotsContainer.innerHTML = '<div class="placeholder-text">Loading slots...</div>';
        
        try {
            const response = await fetch(`/api/slots?date=${date}`);
            const data = await response.json();
            
            // Generate all 36 slots
            allCurrentSlots = [];
            let startHour = 9, endHour = 18;
            
            // Hardcoded slots to demonstrate FREE (Green) slots vs Paid (White) slots
            const demoFreeSlots = ['09:15', '10:30', '11:45', '13:00', '14:30', '15:15', '16:00', '17:30'];
            
            for (let h = startHour; h < endHour; h++) {
                for (let m = 0; m < 60; m += 15) {
                    const hour = h.toString().padStart(2, '0');
                    const min = m.toString().padStart(2, '0');
                    const time24 = `${hour}:${min}`;
                    
                    allCurrentSlots.push({
                        time24,
                        category: getCategory(time24),
                        available: true, // All slots are available
                        isFree: demoFreeSlots.includes(time24)
                    });
                }
            }

            updateTabCounts();
            renderSlots();

            // Update header count
            const availableCount = allCurrentSlots.filter(s => s.available).length;
            document.getElementById(`count-${date}`).textContent = `${availableCount} slots open`;

        } catch (err) {
            slotsContainer.innerHTML = '<div class="placeholder-text error">Failed to load slots. Please try again.</div>';
        }
    };

    // Date Card Click
    dateCards.forEach(card => {
        card.addEventListener('click', () => {
            dateCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            
            currentDate = card.dataset.date;
            dateInput.value = currentDate;
            
            // Reset selection
            timeSlotInput.value = '';
            selectedSlotPill.textContent = 'No slot chosen yet';
            selectedSlotPill.classList.remove('active');
            toggleForm(false);
            
            // Update subtitle
            const formattedDate = card.querySelector('h3').textContent.replace(/\(.*?\)/, '').trim();
            const yearText = card.querySelector('.year').textContent.replace(/[()]/g, '');
            slotsSubtitle.textContent = `Showing available 15-minute consultations for ${formattedDate}, ${yearText}.`;
            
            fetchSlots(currentDate);
        });
    });

    // Tab Click
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderSlots();
        });
    });

    // Form Submit
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!timeSlotInput.value) {
            showMessage('Please select a time slot.', 'error');
            return;
        }

        const formData = {
            name: nameInput.value,
            age: ageInput.value,
            phone: phoneInput.value,
            date: dateInput.value,
            timeSlot: timeSlotInput.value
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Confirming...';
        messageDiv.className = 'message hidden';

        try {
            const response = await fetch('/api/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('Appointment booked successfully! We will contact you soon.', 'success');
                bookingForm.reset();
                timeSlotInput.value = '';
                selectedSlotPill.textContent = 'No slot chosen yet';
                selectedSlotPill.classList.remove('active');
                toggleForm(false);
                
                // Refresh slots
                fetchSlots(currentDate);
            } else {
                showMessage(data.error || 'Failed to book appointment', 'error');
                fetchSlots(currentDate);
            }
        } catch (error) {
            showMessage('Network error. Please try again.', 'error');
        } finally {
            submitBtn.textContent = 'Confirm Booking';
        }
    });
});
