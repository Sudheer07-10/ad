document.addEventListener('DOMContentLoaded', () => {
    const dateSelect = document.getElementById('date');
    const slotsContainer = document.getElementById('slotsContainer');
    const timeSlotInput = document.getElementById('timeSlot');
    const bookingForm = document.getElementById('bookingForm');
    const submitBtn = document.getElementById('submitBtn');
    const messageDiv = document.getElementById('message');

    // Function to show messages
    const showMessage = (msg, type) => {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        
        // Hide after 5 seconds if success
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.className = 'message hidden';
            }, 5000);
        }
    };

    // Format time (e.g. 09:00 to 9:00 AM)
    const formatTime = (time24) => {
        const [hourStr, min] = time24.split(':');
        let hour = parseInt(hourStr);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${min} ${ampm}`;
    };

    // Fetch slots when date is selected
    dateSelect.addEventListener('change', async (e) => {
        const selectedDate = e.target.value;
        if (!selectedDate) return;

        slotsContainer.innerHTML = '<p class="placeholder-text">Loading slots...</p>';
        timeSlotInput.value = '';

        try {
            const response = await fetch(`/api/slots?date=${selectedDate}`);
            if (!response.ok) throw new Error('Failed to fetch slots');
            
            const data = await response.json();
            
            if (data.availableSlots.length === 0) {
                slotsContainer.innerHTML = '<p class="placeholder-text">Fully booked for this date.</p>';
                return;
            }

            slotsContainer.innerHTML = '';
            
            data.availableSlots.forEach(slot => {
                const slotEl = document.createElement('div');
                slotEl.className = 'slot';
                slotEl.textContent = formatTime(slot);
                slotEl.dataset.time = slot;
                
                slotEl.addEventListener('click', () => {
                    // Deselect previous
                    document.querySelectorAll('.slot').forEach(el => el.classList.remove('selected'));
                    
                    // Select current
                    slotEl.classList.add('selected');
                    timeSlotInput.value = slot;
                });
                
                slotsContainer.appendChild(slotEl);
            });
            
        } catch (error) {
            console.error('Error:', error);
            slotsContainer.innerHTML = '<p class="placeholder-text" style="color:red">Failed to load slots. Please try again.</p>';
        }
    });

    // Handle form submission
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!timeSlotInput.value) {
            showMessage('Please select a time slot first.', 'error');
            return;
        }

        const formData = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            date: dateSelect.value,
            timeSlot: timeSlotInput.value
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Booking...';
        messageDiv.className = 'message hidden';

        try {
            const response = await fetch('/api/book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('Appointment booked successfully! We will contact you soon.', 'success');
                bookingForm.reset();
                timeSlotInput.value = '';
                // Refresh slots for the selected date
                dateSelect.dispatchEvent(new Event('change'));
            } else {
                showMessage(data.error || 'Failed to book appointment', 'error');
                // Refresh slots in case it was double booked
                dateSelect.dispatchEvent(new Event('change'));
            }
        } catch (error) {
            showMessage('Network error. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Book Appointment Now';
        }
    });
});
