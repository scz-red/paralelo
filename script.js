/**
 * CurrencyCalculator - Clase principal para manejar la lógica de la calculadora
 */
class CurrencyCalculator {
    constructor() {
        // Configuración inicial
        this.fiatCurrencies = {
            "Dólar estadounidense": { code: "USD", icon: "https://currencyfreaks.com/photos/flags/usd.png" },
            "Euro": { code: "EUR", icon: "https://currencyfreaks.com/photos/flags/eur.png" },
            "Peso colombiano": { code: "COP", icon: "https://currencyfreaks.com/photos/flags/cop.png" },
            "Peso argentino": { code: "ARS", icon: "https://currencyfreaks.com/photos/flags/ars.png" },
            "Peso chileno": { code: "CLP", icon: "https://currencyfreaks.com/photos/flags/clp.png" },
            "Real brasileño": { code: "BRL", icon: "https://currencyfreaks.com/photos/flags/brl.png" },
            "Sol peruano": { code: "PEN", icon: "https://currencyfreaks.com/photos/flags/pen.png" },
            "Yuan chino": { code: "CNY", icon: "https://currencyfreaks.com/photos/flags/cny.png" },
            "Guaraní paraguayo": { code: "PYG", icon: "https://currencyfreaks.com/photos/flags/pyg.png" },
            "Peso mexicano": { code: "MXN", icon: "https://currencyfreaks.com/photos/flags/mxn.png" }
        };

        this.cryptoCurrencies = [
            { name: 'Tether (USDT)', code: 'USDT', icon: 'https://paralelo.scz.red/paralelo/1.png' },
            { name: 'Bitcoin', code: 'BTC', icon: 'https://paralelo.scz.red/paralelo/2.png' },
            { name: 'Ethereum', code: 'ETH', icon: 'https://paralelo.scz.red/paralelo/3.png' },
            { name: 'USD Coin', code: 'USDC', icon: 'https://paralelo.scz.red/paralelo/4.png' },
            { name: 'Dogecoin', code: 'DOGE', icon: 'https://paralelo.scz.red/paralelo/5.png' },
            { name: 'Solana', code: 'SOL', icon: 'https://paralelo.scz.red/paralelo/6.png' },
            { name: 'Pepe', code: 'PEPE', icon: 'https://paralelo.scz.red/paralelo/7.png' },
            { name: 'Trump', code: 'TRUMP', icon: 'https://paralelo.scz.red/paralelo/8.png' }
        ];

        // Variables de estado
        this.cache = {};
        this.cacheTasas = null;
        this.lastMonto = null;
        this.lastTasaUpdate = 0;
        this.CACHE_EXP = 60000; // 1 minuto en caché
        this.timeout = null;

        // Inicialización
        this.initElements();
        this.setupEventListeners();
        this.setupPWA();
    }

    /**
     * Inicializa los elementos del DOM
     */
    initElements() {
        this.montoInput = document.getElementById('monto');
        this.fiatList = document.getElementById('fiat-list');
        this.cryptoList = document.getElementById('crypto-list');
        this.loaderGlobal = document.getElementById('loader-global');
        this.tasaUSD = document.getElementById('tasa-usd');
        this.tasaEUR = document.getElementById('tasa-eur');
        this.installContainer = document.getElementById('install-container');
        this.installButton = document.getElementById('install-btn');
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        this.montoInput.addEventListener('input', () => this.handleInput());
        this.montoInput.addEventListener('keypress', (e) => this.handleKeyPress(e));
        this.montoInput.addEventListener('paste', (e) => this.handlePaste(e));
        
        window.addEventListener('online', () => this.handleOnlineStatus());
        window.addEventListener('offline', () => this.handleOfflineStatus());
    }

    /**
     * Configura la funcionalidad PWA
     */
    setupPWA() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA instalada exitosamente');
            this.hideInstallPromotion();
        });

        // Verificar si ya está instalada
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.hideInstallPromotion();
        }
    }

    /**
     * Muestra el botón de instalación
     */
    showInstallButton() {
        this.installContainer.classList.remove('hidden');
        this.installButton.addEventListener('click', () => this.promptInstall());
    }

    /**
     * Oculta la promoción de instalación
     */
    hideInstallPromotion() {
        this.installContainer.classList.add('hidden');
    }

    /**
     * Solicita la instalación de la PWA
     */
    promptInstall() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('Usuario aceptó la instalación');
                } else {
                    console.log('Usuario rechazó la instalación');
                }
                this.deferredPrompt = null;
            });
        }
    }

    /**
     * Maneja el evento de entrada
     */
    handleInput() {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            this.calcular();
        }, 800);
    }

    /**
     * Maneja el evento de teclado
     */
    handleKeyPress(e) {
        const char = String.fromCharCode(e.which);
        if (!/[0-9.]/.test(char)) e.preventDefault();
        if (char === '.' && this.montoInput.value.includes('.')) e.preventDefault();
    }

    /**
     * Maneja el evento de pegado
     */
    handlePaste(e) {
        const value = (e.clipboardData || window.clipboardData).getData('text');
        if (!/^\d+(\.\d{1,2})?$/.test(value)) e.preventDefault();
    }

    /**
     * Maneja el estado online
     */
    handleOnlineStatus() {
        console.log('Conexión restablecida');
        this.calcular(true);
    }

    /**
     * Maneja el estado offline
     */
    handleOfflineStatus() {
        console.log('Sin conexión a internet');
        this.tasaUSD.textContent = "Sin conexión";
        this.tasaEUR.textContent = "Sin conexión";
        this.fiatList.innerHTML = `<div class="loading"><i class="fas fa-exclamation-triangle"></i>Sin conexión</div>`;
        this.cryptoList.innerHTML = '';
        this.showGlobalLoader(false);
    }

    /**
     * Realiza el cálculo de conversión
     */
    async calcular(force = false) {
        const monto = this.montoInput.value.trim();
        
        if (!this.validarMonto(monto)) {
            this.clearResults();
            this.showGlobalLoader(false);
            this.tasaUSD.textContent = "--";
            this.tasaEUR.textContent = "--";
            if (monto.length > 0) alert("Por favor ingresa un monto válido (solo números positivos, hasta 2 decimales)");
            return;
        }

        if (!force && this.lastMonto === monto && this.cache[monto]) return;
        
        if (this.cache[monto] && Date.now() - this.cache[monto].timestamp < this.CACHE_EXP) {
            this.showGlobalLoader(false);
            this.renderCurrencyList(this.fiatList, this.cache[monto].data.conversiones_fiat, this.fiatCurrencies, false);
            this.renderCurrencyList(this.cryptoList, this.cache[monto].data.conversiones_cripto, this.cryptoCurrencies, true);
            this.actualizarTasasUI();
            this.lastMonto = monto;
            return;
        }

        if (!navigator.onLine) {
            this.handleOfflineStatus();
            return;
        }

        this.showGlobalLoader(true);
        
        try {
            const response = await fetch(`https://api.lupo.lat/convertir_bob?monto_bob=${monto}`);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            this.cache[monto] = { data, timestamp: Date.now() };
            this.showGlobalLoader(false);
            this.renderCurrencyList(this.fiatList, data.conversiones_fiat, this.fiatCurrencies, false);
            this.renderCurrencyList(this.cryptoList, data.conversiones_cripto, this.cryptoCurrencies, true);
            this.actualizarTasasUI();
            this.lastMonto = monto;
        } catch (error) {
            console.error('Error en calcular:', error);
            this.showGlobalLoader(false);
            this.showError(error.message.includes('network') ? 
                'Error de red. Verifica tu conexión.' : 
                'Error al cargar datos. Intenta nuevamente.');
        }
    }

    /**
     * Actualiza las tasas de referencia
     */
    async actualizarTasasUI(force = false) {
        if (!force && this.cacheTasas && Date.now() - this.lastTasaUpdate < this.CACHE_EXP) {
            this.tasaUSD.textContent = this.cacheTasas.usd;
            this.tasaEUR.textContent = this.cacheTasas.eur;
            return;
        }

        if (!navigator.onLine) {
            this.tasaUSD.textContent = "Sin conexión";
            this.tasaEUR.textContent = "Sin conexión";
            return;
        }

        try {
            const [resUSD, resEUR] = await Promise.all([
                fetch('https://api.lupo.lat/cambio_a_bob?moneda=usd&monto=1'),
                fetch('https://api.lupo.lat/cambio_a_bob?moneda=eur&monto=1')
            ]);

            const dataUSD = await resUSD.json();
            const dataEUR = await resEUR.json();

            const formatValue = (data) => {
                if ('resultado' in data && typeof data.resultado === "number") {
                    return data.resultado.toLocaleString('es-ES', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    });
                }
                return data.error ? "Error API" : "Error";
            };

            const tasaUSDval = formatValue(dataUSD);
            const tasaEURval = formatValue(dataEUR);

            this.tasaUSD.textContent = tasaUSDval;
            this.tasaEUR.textContent = tasaEURval;
            this.cacheTasas = { usd: tasaUSDval, eur: tasaEURval };
            this.lastTasaUpdate = Date.now();
        } catch (error) {
            console.error('Error actualizando tasas:', error);
            this.tasaUSD.textContent = "Error";
            this.tasaEUR.textContent = "Error";
        }
    }

    /**
     * Renderiza la lista de monedas
     */
    renderCurrencyList(listElement, data, currencyData, isCrypto = false) {
        listElement.innerHTML = '';
        
        const currencies = isCrypto ? this.cryptoCurrencies : Object.keys(this.fiatCurrencies);
        
        currencies.forEach((currency, index) => {
            const currencyInfo = isCrypto ? currency : {
                name: currency,
                ...this.fiatCurrencies[currency]
            };
            
            const value = isCrypto ? 
                (data[currencyInfo.name] || data[currencyInfo.code] || 0) : 
                data[currencyInfo.name];

            const li = document.createElement('li');
            li.className = 'currency-item';
            li.style.animationDelay = `${index * 0.1}s`;
            
            li.innerHTML = `
                <div class="currency-icon">
                    <img src="${currencyInfo.icon}" 
                         alt="${currencyInfo.name}" 
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/40/4361ee/ffffff?text=${currencyInfo.code.substring(0,2)}'">
                </div>
                <div class="currency-details">
                    <div class="currency-name">${currencyInfo.name}</div>
                    <div class="currency-code">${currencyInfo.code}</div>
                </div>
                <div class="currency-value">
                    ${typeof value === "number" ? 
                        value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 
                        value}
                </div>
            `;
            
            listElement.appendChild(li);
        });
    }

    /**
     * Muestra un mensaje de error
     */
    showError(message) {
        this.fiatList.innerHTML = `
            <div class="loading error">
                <i class="fas fa-exclamation-triangle"></i>
                ${message}
            </div>
        `;
        this.cryptoList.innerHTML = '';
    }

    /**
     * Muestra/Oculta el loader global
     */
    showGlobalLoader(show = true) {
        this.loaderGlobal.style.display = show ? 'block' : 'none';
        if (show) {
            this.fiatList.innerHTML = '';
            this.cryptoList.innerHTML = '';
        }
    }

    /**
     * Limpia los resultados
     */
    clearResults() {
        this.fiatList.innerHTML = '';
        this.cryptoList.innerHTML = '';
    }

    /**
     * Valida el monto ingresado
     */
    validarMonto(monto) {
        if (!monto || isNaN(monto)) return false;
        const n = Number(monto);
        return Number.isFinite(n) && n > 0 && /^\d+(\.\d{1,2})?$/.test(monto) && monto.length <= 10;
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const calculator = new CurrencyCalculator();
    
    // Precarga de imágenes
    const imageUrls = [
        ...calculator.cryptoCurrencies.map(c => c.icon),
        ...Object.values(calculator.fiatCurrencies).map(c => c.icon)
    ];
    
    imageUrls.forEach(url => {
        new Image().src = url;
    });

    // Cálculo inicial
    calculator.calcular(true);
    
    // Actualización periódica de tasas
    setInterval(() => calculator.actualizarTasasUI(), 60000);
});
