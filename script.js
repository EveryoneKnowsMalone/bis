document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const authSection = document.getElementById('authSection');
    const dashboard = document.getElementById('dashboard');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const logoutBtn = document.getElementById('logoutBtn');
    const depositBtn = document.querySelector('.deposit-btn');
    const buyForm = document.querySelector('.action-card.buy .input-group');
    const sellForm = document.querySelector('.action-card.sell .input-group');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const refreshBtn = document.getElementById('refreshBtn');
    const lastUpdated = document.getElementById('lastUpdated');

    // Update last updated timestamp
    function updateLastUpdated() {
        const now = new Date();
        lastUpdated.textContent = now.toLocaleTimeString();
    }

    // Handle refresh button click
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.classList.add('rotating');
        try {
            await loadUserData();
            updateLastUpdated();
        } finally {
            setTimeout(() => {
                refreshBtn.classList.remove('rotating');
            }, 1000);
        }
    });

    // Mobile menu functionality
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            !mobileMenuBtn.contains(e.target) && 
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
        }
    });

    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
        showDashboard();
        loadUserData();
        updateLastUpdated();
    } else {
        showAuthSection();
    }

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.dataset.tab === 'login') {
                showLoginForm();
            } else {
                showSignupForm();
            }
        });
    });

    function showLoginForm() {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    }

    function showSignupForm() {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    }

    function showAuthSection() {
        authSection.style.display = 'block';
        dashboard.style.display = 'none';
    }

    function showDashboard() {
        authSection.style.display = 'none';
        dashboard.style.display = 'block';
    }

    // Handle login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('input[type="email"]').value;
        const password = loginForm.querySelector('input[type="password"]').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                showDashboard();
                loadUserData();
                // Close sidebar on mobile after login
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                }
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert('Error logging in');
        }
    });

    // Handle signup
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = signupForm.querySelector('input[type="text"]').value;
        const email = signupForm.querySelector('input[type="email"]').value;
        const password = signupForm.querySelectorAll('input[type="password"]')[0].value;
        const confirmPassword = signupForm.querySelectorAll('input[type="password"]')[1].value;

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                showDashboard();
                loadUserData();
                // Close sidebar on mobile after signup
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                }
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert('Error creating account');
        }
    });

    // Handle logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        showAuthSection();
    });

    // Load user data
    async function loadUserData() {
        try {
            const response = await fetch('/api/user', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                updateDashboard(userData);
            } else {
                localStorage.removeItem('token');
                showAuthSection();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    // Update dashboard with user data
    function updateDashboard(userData) {
        // Update user profile
        document.querySelector('.user-profile span').textContent = userData.name;
        
        // Update portfolio values
        const totalValue = userData.balance + (userData.btcAmount * getCurrentBTCPrice());
        document.querySelector('.total-value .value').textContent = `$${totalValue.toFixed(2)}`;
        document.querySelector('.btc-holdings .value').textContent = `${userData.btcAmount.toFixed(8)} BTC`;
        document.querySelector('.available-funds .value').textContent = `$${userData.balance.toFixed(2)}`;

        // Load transactions
        loadTransactions();
    }

    // Load transactions
    async function loadTransactions() {
        try {
            const response = await fetch('/api/transactions', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const transactions = await response.json();
                updateTransactionsList(transactions);
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    // Update transactions list
    function updateTransactionsList(transactions) {
        const transactionsList = document.querySelector('.transactions-list');
        transactionsList.innerHTML = transactions.slice(0, 5).map(transaction => `
            <div class="transaction-item">
                <div class="transaction-icon ${transaction.type}">
                    <i class="fas fa-${getTransactionIcon(transaction.type)}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${capitalizeFirstLetter(transaction.type)}</h4>
                    <p>${formatTransactionDetails(transaction)}</p>
                </div>
                <div class="transaction-amount">
                    <p>$${transaction.amount.toFixed(2)}</p>
                    <span class="date">${formatDate(transaction.date)}</span>
                </div>
            </div>
        `).join('');
    }

    // Helper functions
    function getCurrentBTCPrice() {
        // This would normally fetch from an API
        return 45000;
    }

    function getTransactionIcon(type) {
        const icons = {
            buy: 'arrow-down',
            sell: 'arrow-up',
            deposit: 'plus',
            withdraw: 'minus'
        };
        return icons[type] || 'exchange-alt';
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function formatTransactionDetails(transaction) {
        if (transaction.type === 'buy' || transaction.type === 'sell') {
            return `${transaction.btcAmount.toFixed(8)} BTC at $${transaction.price.toFixed(2)}`;
        }
        return transaction.type === 'deposit' ? 'Bank Transfer' : 'Withdrawal';
    }

    function formatDate(date) {
        const now = new Date();
        const transactionDate = new Date(date);
        const diff = now - transactionDate;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    // Handle deposit
    depositBtn.addEventListener('click', async () => {
        const amount = prompt('Enter deposit amount:');
        if (!amount || isNaN(amount) || amount <= 0) return;

        try {
            const response = await fetch('/api/deposit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ amount: parseFloat(amount) })
            });

            if (response.ok) {
                loadUserData();
            } else {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            alert('Error processing deposit');
        }
    });

    // Handle buy BTC
    buyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = buyForm.querySelector('input').value;
        if (!amount || isNaN(amount) || amount <= 0) return;

        try {
            const response = await fetch('/api/buy-btc', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    btcPrice: getCurrentBTCPrice()
                })
            });

            if (response.ok) {
                loadUserData();
                buyForm.querySelector('input').value = '';
            } else {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            alert('Error processing purchase');
        }
    });

    // Handle sell BTC
    sellForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btcAmount = sellForm.querySelector('input').value;
        if (!btcAmount || isNaN(btcAmount) || btcAmount <= 0) return;

        try {
            const response = await fetch('/api/sell-btc', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    btcAmount: parseFloat(btcAmount),
                    btcPrice: getCurrentBTCPrice()
                })
            });

            if (response.ok) {
                loadUserData();
                sellForm.querySelector('input').value = '';
            } else {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            alert('Error processing sale');
        }
    });
}); 