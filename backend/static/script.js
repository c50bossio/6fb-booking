// Initialize charts and interactive elements
document.addEventListener('DOMContentLoaded', function() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenue-chart');
    if (revenueCtx) {
        const revenueChart = new Chart(revenueCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Revenue',
                    data: [320, 450, 380, 520, 480, 650, 590],
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#4CAF50',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }, {
                    label: 'Expenses',
                    data: [60, 70, 65, 80, 75, 90, 85],
                    borderColor: '#FF5252',
                    backgroundColor: 'rgba(255, 82, 82, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#FF5252',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#2d3139',
                        titleColor: '#fff',
                        bodyColor: '#a0a4ab',
                        borderColor: '#3a3f4a',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': $' + context.parsed.y;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#6b7280'
                        }
                    },
                    y: {
                        grid: {
                            color: '#3a3f4a',
                            borderDash: [3, 3]
                        },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    // Mini charts for stat cards
    createMiniChart('appointments-chart', [6, 8, 7, 9, 8, 10, 8], '#2196F3');
    createMiniChart('retention-chart', [75, 78, 76, 74, 77, 78, 78], '#FF9800');

    // Function to create mini charts
    function createMiniChart(elementId, data, color) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = element.offsetWidth;
        canvas.height = 50;
        element.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 10;
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);

        // Calculate points
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const range = maxValue - minValue || 1;
        const stepX = chartWidth / (data.length - 1);

        // Draw line
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        data.forEach((value, index) => {
            const x = padding + (index * stepX);
            const y = padding + chartHeight - ((value - minValue) / range * chartHeight);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Draw area
        ctx.lineTo(width - padding, height - padding);
        ctx.lineTo(padding, height - padding);
        ctx.closePath();
        ctx.fillStyle = color + '20';
        ctx.fill();
    }

    // Tab functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            // Update chart data based on selected tab
            updateChartData(this.textContent.toLowerCase());
        });
    });

    // Update chart data function
    function updateChartData(period) {
        // This would fetch and update data based on the selected period
        console.log('Updating chart for period:', period);
    }

    // Navigation active state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Quick action buttons
    const actionCards = document.querySelectorAll('.action-card');
    actionCards.forEach(card => {
        card.addEventListener('click', function() {
            const action = this.querySelector('span').textContent;
            console.log('Quick action clicked:', action);
            // Handle different actions
            switch(action) {
                case 'New Client':
                    // Open new client modal
                    break;
                case 'Book Appointment':
                    // Open appointment booking
                    break;
                case 'Record Payment':
                    // Open payment recording
                    break;
                case 'View Reports':
                    // Navigate to reports
                    break;
            }
        });
    });

    // Notification button
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            console.log('Notifications clicked');
            // Show notifications dropdown
        });
    }

    // Animate progress bars on load
    setTimeout(() => {
        const progressFills = document.querySelectorAll('.progress-fill');
        progressFills.forEach(fill => {
            const width = fill.style.width;
            fill.style.width = '0';
            setTimeout(() => {
                fill.style.width = width;
            }, 100);
        });
    }, 300);

    // Animate stat values
    const statValues = document.querySelectorAll('.stat-value');
    statValues.forEach(stat => {
        const finalValue = stat.textContent;
        const isPrice = finalValue.includes('$');
        const numericValue = parseInt(finalValue.replace(/[^0-9]/g, ''));
        let currentValue = 0;
        const increment = numericValue / 30;
        
        const counter = setInterval(() => {
            currentValue += increment;
            if (currentValue >= numericValue) {
                currentValue = numericValue;
                clearInterval(counter);
            }
            
            if (isPrice) {
                stat.textContent = '$' + Math.floor(currentValue).toLocaleString();
            } else if (finalValue.includes('%')) {
                stat.textContent = Math.floor(currentValue) + '%';
            } else {
                stat.textContent = Math.floor(currentValue);
            }
        }, 30);
    });

    // Time update for appointments
    function updateNextAppointmentTime() {
        const now = new Date();
        const appointments = [
            { time: '14:30', name: 'Marcus Johnson' },
            { time: '15:30', name: 'David Williams' }
        ];
        
        // Find next appointment
        const nextAppointment = appointments.find(apt => {
            const [hours, minutes] = apt.time.split(':');
            const aptTime = new Date(now);
            aptTime.setHours(parseInt(hours), parseInt(minutes), 0);
            return aptTime > now;
        });
        
        if (nextAppointment) {
            const timeBadge = document.querySelector('.time-badge');
            if (timeBadge) {
                timeBadge.textContent = `Next: ${nextAppointment.time}`;
            }
        }
    }
    
    updateNextAppointmentTime();
    setInterval(updateNextAppointmentTime, 60000); // Update every minute
});

// Utility function for formatting currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Dark mode toggle (if needed)
function toggleDarkMode() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
}