document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('subscriptionForm');
    const messageDiv = document.getElementById('message');
    const submitBtn = form.querySelector('.submit-btn');
    
    // Load current week information
    loadCurrentWeek();
    
    // Form submission handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = {
            email: formData.get('email'),
            messType: formData.get('messType'),
            dietType: formData.get('dietType'),
            messCategory: formData.get('messCategory')
        };
        
        // Validate form data
        if (!data.email || !data.messType || !data.dietType || !data.messCategory) {
            showMessage('Please fill in all fields', 'error');
            return;
        }
        
        // Disable submit button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="loading"></div> Subscribing...';
        
        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showMessage(result.message, 'success');
                form.reset();
                
                // Show additional success information
                setTimeout(() => {
                    showMessage(
                        `🎉 Welcome to the mess notification system! You'll receive emails 30 minutes before each meal for ${data.messType.toUpperCase()} ${data.dietType.toUpperCase()} Category ${data.messCategory}.`, 
                        'success'
                    );
                }, 2000);
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Subscription error:', error);
            showMessage('Network error. Please try again later.', 'error');
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Subscribe to Notifications';
        }
    });
    
    // Load current week information
    async function loadCurrentWeek() {
        try {
            const response = await fetch('/api/current-week');
            const data = await response.json();
            
            document.getElementById('currentWeek').textContent = `Week ${data.week}`;
            document.getElementById('currentDay').textContent = data.day;
        } catch (error) {
            console.error('Error loading current week:', error);
            document.getElementById('currentWeek').textContent = 'Week ?';
            document.getElementById('currentDay').textContent = 'Loading...';
        }
    }
    
    // Show message function
    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.classList.add('hidden');
            }, 5000);
        }
    }
    
    // Add form validation feedback
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.hasAttribute('required') && !this.value) {
                this.style.borderColor = '#e74c3c';
            } else {
                this.style.borderColor = '#e9ecef';
            }
        });
        
        input.addEventListener('input', function() {
            if (this.style.borderColor === 'rgb(231, 76, 60)') {
                this.style.borderColor = '#e9ecef';
            }
        });
    });
    
    // Add smooth animations
    const cards = document.querySelectorAll('.schedule-card, .current-week-card, .form-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });
    
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
    
    // Add real-time clock for current time display
    function updateCurrentTime() {
        const now = new Date();
        const istTime = new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).format(now);
        
        // You can add a time display element if needed
        console.log('Current IST Time:', istTime);
    }
    
    // Update time every second
    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();
});