/* app.js */

// Mock data for demonstration purposes
const mockStockData = {
    "RELIANCE.NS": {
        symbol: "RELIANCE",
        exchange: "NSE",
        price: 2850.50,
        dayHigh: 2865.00,
        dayLow: 2830.00,
        open: 2845.00,
        volume: 1500000,
        sma20: 2830.75,
        rsi14: 65.2,
        macd: 15.3
    },
    "INFY.NS": {
        symbol: "INFY",
        exchange: "NSE",
        price: 1510.20,
        dayHigh: 1525.00,
        dayLow: 1505.00,
        open: 1520.00,
        volume: 950000,
        sma20: 1505.10,
        rsi14: 58.9,
        macd: 8.1
    },
    "TCS.NS": {
        symbol: "TCS",
        exchange: "NSE",
        price: 3950.75,
        dayHigh: 3970.00,
        dayLow: 3930.00,
        open: 3960.00,
        volume: 600000,
        sma20: 3940.55,
        rsi14: 55.1,
        macd: 12.5
    }
};

const STOCK_SYMBOLS = ["RELIANCE", "INFY", "TCS"]; // Simplified list for demo

document.addEventListener('DOMContentLoaded', () => {
    const stockForm = document.getElementById('stock-form');
    const stockSymbolInput = document.getElementById('stock-symbol');
    const symbolDisplay = document.getElementById('symbol-display');
    const stockDataSection = document.getElementById('stock-data');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const chartPlaceholder = document.getElementById('chart-placeholder');

    // UI elements for displaying data
    const currentPrice = document.getElementById('current-price');
    const dayHigh = document.getElementById('day-high');
    const dayLow = document.getElementById('day-low');
    const volume = document.getElementById('volume');
    const sma20 = document.getElementById('sma-20');
    const rsi14 = document.getElementById('rsi-14');
    const macd = document.getElementById('macd');

    stockForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const symbol = stockSymbolInput.value.trim().toUpperCase();
        // Basic validation against mock data keys
        const mockKey = STOCK_SYMBOLS.includes(symbol) ? `${symbol}.NS` : null;

        if (!symbol) {
            showError("Please enter a stock symbol.");
            return;
        }

        loadingIndicator.style.display = 'block';
        stockDataSection.style.display = 'none';
        errorMessage.style.display = 'none';
        chartPlaceholder.innerHTML = ''; // Clear previous chart placeholder

        // Simulate data fetching
        try {
            // In a real app, this would be an API call:
            // const response = await fetch(`/api/stock-data?symbol=${symbol}`);
            // if (!response.ok) throw new Error('Failed to fetch data');
            // const data = await response.json();

            // Using mock data for this example
            if (mockKey && mockStockData[mockKey]) {
                const data = mockStockData[mockKey];
                displayStockData(data);
                loadingIndicator.style.display = 'none';
                stockDataSection.style.display = 'block';
            } else {
                throw new Error(`Data for ${symbol} not found in mock dataset.`);
            }
        } catch (error) {
            console.error("Error fetching or displaying stock data:", error);
            showError(`Could not retrieve data for ${symbol}. ${error.message}`);
            loadingIndicator.style.display = 'none';
        }
    });

    function displayStockData(data) {
        symbolDisplay.textContent = `${data.symbol} (${data.exchange})`;
        currentPrice.textContent = data.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        dayHigh.textContent = data.dayHigh.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        dayLow.textContent = data.dayLow.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        volume.textContent = data.volume.toLocaleString('en-IN');
        sma20.textContent = data.sma20.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        rsi14.textContent = data.rsi14.toFixed(1);
        macd.textContent = data.macd.toFixed(1);

        // Placeholder for chart rendering
        chartPlaceholder.innerHTML = '<p>Chart visualization would appear here (requires a JS charting library integration with fetched OCHLV data).</p>';
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    // Initial state setup
    stockSymbolInput.placeholder = `e.g., ${STOCK_SYMBOLS.join(', ')}`;
});
