// Global Variables
const API_BASE_URL = 'https://api.coingecko.com/api/v3';
let selectedCryptos = [];

// DOM Elements
const cryptoSearch = document.getElementById('crypto-search');
const cryptoList = document.getElementById('crypto-list');
const priceDisplay = document.getElementById('price-display');

// Fetch initial cryptocurrency list
async function fetchCryptoList() {
    try {
        const response = await fetch(`${API_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false`);
        const data = await response.json();
        displayCryptoList(data);
    } catch (error) {
        console.error('Error fetching crypto list:', error);
    }
}

// Display cryptocurrency list
function displayCryptoList(cryptos) {
    cryptoList.innerHTML = '';
    
    cryptos.forEach(crypto => {
        const cryptoElement = document.createElement('div');
        cryptoElement.className = 'crypto-item';
        cryptoElement.innerHTML = `
            <input type="checkbox" id="${crypto.id}" 
                   ${selectedCryptos.includes(crypto.id) ? 'checked' : ''}>
            <label for="${crypto.id}">
                ${crypto.name} (${crypto.symbol.toUpperCase()})
            </label>
        `;
        
        cryptoElement.querySelector('input').addEventListener('change', (e) => {
            handleCryptoSelection(crypto.id, e.target.checked);
        });
        
        cryptoList.appendChild(cryptoElement);
    });
}

// Handle cryptocurrency selection
function handleCryptoSelection(cryptoId, isSelected) {
    if (isSelected) {
        selectedCryptos.push(cryptoId);
    } else {
        selectedCryptos = selectedCryptos.filter(id => id !== cryptoId);
    }
    updatePriceDisplay();
}

// Update price display
async function updatePriceDisplay() {
    if (selectedCryptos.length === 0) {
        priceDisplay.innerHTML = '<p>No cryptocurrencies selected</p>';
        return;
    }

    try {
        const ids = selectedCryptos.join(',');
        const response = await fetch(`${API_BASE_URL}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
        const data = await response.json();
        
        displayPrices(data);
    } catch (error) {
        console.error('Error fetching prices:', error);
    }
}

// Display prices
function displayPrices(priceData) {
    priceDisplay.innerHTML = '';
    
    Object.entries(priceData).forEach(([cryptoId, data]) => {
        const priceCard = document.createElement('div');
        priceCard.className = 'price-card';
        priceCard.innerHTML = `
            <h3>${cryptoId}</h3>
            <p class="price">$${data.usd.toFixed(2)}</p>
            <p class="change ${data.usd_24h_change >= 0 ? 'positive' : 'negative'}">
                ${data.usd_24h_change.toFixed(2)}%
            </p>
        `;
        priceDisplay.appendChild(priceCard);
    });
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    fetchCryptoList();
    
    // Add search functionality
    cryptoSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const cryptoItems = cryptoList.querySelectorAll('.crypto-item');
        
        cryptoItems.forEach(item => {
            const label = item.querySelector('label').textContent.toLowerCase();
            item.style.display = label.includes(searchTerm) ? 'block' : 'none';
        });
    });
});