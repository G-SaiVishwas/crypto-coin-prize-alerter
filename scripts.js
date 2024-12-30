// Global Variables and State Management
const API_BASE_URL = 'https://api.coingecko.com/api/v3';
let selectedCryptos = JSON.parse(localStorage.getItem('selectedCryptos')) || [];
let priceAlerts = JSON.parse(localStorage.getItem('priceAlerts')) || {};
let currentTheme = localStorage.getItem('theme') || 'light';

// DOM Elements
const cryptoSearch = document.getElementById('crypto-search');
const cryptoList = document.getElementById('crypto-list');
const priceDisplay = document.getElementById('price-display');
const actionButtons = document.querySelectorAll('.action-btn');

// Price Alert Modal Template
const alertModalHTML = `
    <div class="modal-content">
        <h2>Set Price Alert</h2>
        <div class="alert-form">
            <div class="form-group">
                <label for="upperLimit">Upper Price Limit ($)</label>
                <input type="number" id="upperLimit" step="0.01">
            </div>
            <div class="form-group">
                <label for="lowerLimit">Lower Price Limit ($)</label>
                <input type="number" id="lowerLimit" step="0.01">
            </div>
            <div class="button-group">
                <button class="btn-save">Save Alert</button>
                <button class="btn-cancel">Cancel</button>
            </div>
        </div>
    </div>
`;

// Fetch cryptocurrency data with error handling
async function fetchCryptoData(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        showToast(`Error fetching data: ${error.message}`, 'error');
        return null;
    }
}

// Display cryptocurrency list with enhanced UI
function displayCryptoList(cryptos) {
    cryptoList.innerHTML = '';
    
    cryptos.forEach(crypto => {
        const cryptoElement = document.createElement('div');
        cryptoElement.className = 'crypto-item';
        cryptoElement.innerHTML = `
            <div class="crypto-item-content">
                <img src="${crypto.image}" alt="${crypto.name}" class="crypto-icon">
                <div class="crypto-info">
                    <input type="checkbox" id="${crypto.id}" 
                           ${selectedCryptos.includes(crypto.id) ? 'checked' : ''}>
                    <label for="${crypto.id}">
                        ${crypto.name} <span class="crypto-symbol">(${crypto.symbol.toUpperCase()})</span>
                    </label>
                    <span class="market-cap">MCap: $${formatNumber(crypto.market_cap)}</span>
                </div>
            </div>
        `;
        
        const checkbox = cryptoElement.querySelector('input');
        checkbox.addEventListener('change', (e) => {
            handleCryptoSelection(crypto.id, e.target.checked);
            animateCheckbox(checkbox);
        });
        
        cryptoList.appendChild(cryptoElement);
    });
}

// Handle cryptocurrency selection with local storage
function handleCryptoSelection(cryptoId, isSelected) {
    if (isSelected) {
        selectedCryptos.push(cryptoId);
        showToast(`Added ${cryptoId} to tracking list`, 'success');
    } else {
        selectedCryptos = selectedCryptos.filter(id => id !== cryptoId);
        showToast(`Removed ${cryptoId} from tracking list`, 'info');
    }
    
    localStorage.setItem('selectedCryptos', JSON.stringify(selectedCryptos));
    updatePriceDisplay();
}

// Enhanced price display with more information
async function updatePriceDisplay() {
    if (selectedCryptos.length === 0) {
        priceDisplay.innerHTML = '<p class="no-crypto-message">No cryptocurrencies selected</p>';
        return;
    }

    try {
        const ids = selectedCryptos.join(',');
        const data = await fetchCryptoData(`/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`);
        
        if (data) {
            displayPrices(data);
            checkPriceAlerts(data);
        }
    } catch (error) {
        showToast('Error updating prices', 'error');
    }
}

// Display prices with enhanced UI and animations
function displayPrices(priceData) {
    priceDisplay.innerHTML = '';
    
    Object.entries(priceData).forEach(([cryptoId, data]) => {
        const priceCard = document.createElement('div');
        priceCard.className = 'price-card';
        
        const changeClass = data.usd_24h_change >= 0 ? 'positive' : 'negative';
        const hasAlert = priceAlerts[cryptoId];
        
        priceCard.innerHTML = `
            <div class="price-card-header">
                <h3>${formatCryptoName(cryptoId)}</h3>
                ${hasAlert ? '<span class="alert-indicator">🔔</span>' : ''}
            </div>
            <div class="price-info">
                <p class="price">$${formatNumber(data.usd)}</p>
                <p class="change ${changeClass}">
                    <i class="fas fa-${data.usd_24h_change >= 0 ? 'caret-up' : 'caret-down'}"></i>
                    ${Math.abs(data.usd_24h_change).toFixed(2)}%
                </p>
            </div>
            <div class="price-actions">
                <button onclick="openAlertModal('${cryptoId}', ${data.usd})" class="btn-alert">
                    <i class="fas fa-bell"></i> Set Alert
                </button>
                <button onclick="removeCrypto('${cryptoId}')" class="btn-remove">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        priceDisplay.appendChild(priceCard);
        animatePriceCard(priceCard);
    });
}

// Price Alerts
function openAlertModal(cryptoId, currentPrice) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = alertModalHTML;
    document.body.appendChild(modal);

    const existingAlert = priceAlerts[cryptoId];
    if (existingAlert) {
        modal.querySelector('#upperLimit').value = existingAlert.upper || '';
        modal.querySelector('#lowerLimit').value = existingAlert.lower || '';
    }

    modal.querySelector('.btn-save').addEventListener('click', () => {
        const upperLimit = parseFloat(modal.querySelector('#upperLimit').value);
        const lowerLimit = parseFloat(modal.querySelector('#lowerLimit').value);
        
        if (upperLimit || lowerLimit) {
            setPriceAlert(cryptoId, upperLimit, lowerLimit);
            showToast('Price alert set successfully', 'success');
        }
        closeModal(modal);
    });

    modal.querySelector('.btn-cancel').addEventListener('click', () => closeModal(modal));
}

// Set price alert
function setPriceAlert(cryptoId, upperLimit, lowerLimit) {
    priceAlerts[cryptoId] = {
        upper: upperLimit || null,
        lower: lowerLimit || null
    };
    localStorage.setItem('priceAlerts', JSON.stringify(priceAlerts));
    updatePriceDisplay();
}

// Check price alerts
function checkPriceAlerts(priceData) {
    Object.entries(priceData).forEach(([cryptoId, data]) => {
        const alert = priceAlerts[cryptoId];
        if (alert) {
            if (alert.upper && data.usd >= alert.upper) {
                showNotification(`${formatCryptoName(cryptoId)} has reached upper limit of $${alert.upper}`);
            }
            if (alert.lower && data.usd <= alert.lower) {
                showNotification(`${formatCryptoName(cryptoId)} has reached lower limit of $${alert.lower}`);
            }
        }
    });
}

// Utility Functions
function formatNumber(num) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function formatCryptoName(str) {
    return str.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                          type === 'error' ? 'exclamation-circle' : 
                          'info-circle'}"></i>
        <span>${message}</span>
    `;

    const container = document.getElementById('toast-container') || createToastContainer();
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function showNotification(message) {
    if (Notification.permission === 'granted') {
        new Notification('Crypto Alert', { body: message });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('Crypto Alert', { body: message });
            }
        });
    }
}

// Animation Functions
function animateCheckbox(checkbox) {
    checkbox.parentElement.classList.add('pulse');
    setTimeout(() => checkbox.parentElement.classList.remove('pulse'), 300);
}

function animatePriceCard(card) {
    card.classList.add('fade-in');
    setTimeout(() => card.classList.remove('fade-in'), 300);
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Request notification permission
    if ('Notification' in window) {
        Notification.requestPermission();
    }

    // Fetch initial data
    const cryptos = await fetchCryptoData('/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false');
    if (cryptos) {
        displayCryptoList(cryptos);
        updatePriceDisplay();
    }

    // Set up search functionality
    cryptoSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const cryptoItems = cryptoList.querySelectorAll('.crypto-item');
        
        cryptoItems.forEach(item => {
            const label = item.querySelector('label').textContent.toLowerCase();
            item.style.display = label.includes(searchTerm) ? 'flex' : 'none';
        });
    });

    // Set up auto-refresh
    setInterval(updatePriceDisplay, 30000); // Update every 30 seconds
});

// Export functionality
function exportData() {
    const data = {
        selectedCryptos,
        priceAlerts
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crypto-dashboard-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Add event listeners for action buttons
document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const action = e.currentTarget.textContent.trim();
        switch (action) {
            case 'Export':
                exportData();
                break;
            case 'Add Crypto':
                cryptoSearch.focus();
                break;
            // Add more actions as needed
        }
    });
});