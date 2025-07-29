const fiatCurrencies = {
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

const cryptoCurrencies = [
  { name: 'Tether (USDT)', code: 'USDT', icon: 'https://paralelo.scz.red/paralelo/1.png' },
  { name: 'Bitcoin', code: 'BTC', icon: 'https://paralelo.scz.red/paralelo/2.png' },
  { name: 'Ethereum', code: 'ETH', icon: 'https://paralelo.scz.red/paralelo/3.png' },
  { name: 'USD Coin', code: 'USDC', icon: 'https://paralelo.scz.red/paralelo/4.png' },
  { name: 'Dogecoin', code: 'DOGE', icon: 'https://paralelo.scz.red/paralelo/5.png' },
  { name: 'Solana', code: 'SOL', icon: 'https://paralelo.scz.red/paralelo/6.png' },
  { name: 'Pepe', code: 'PEPE', icon: 'https://paralelo.scz.red/paralelo/7.png' },
  { name: 'Trump', code: 'TRUMP', icon: 'https://paralelo.scz.red/paralelo/8.png' }
];

const montoInput = document.getElementById('monto');
const fiatList = document.getElementById('fiat-list');
const cryptoList = document.getElementById('crypto-list');
const loaderGlobal = document.getElementById('loader-global');
const tasaUSD = document.getElementById('tasa-usd');
const tasaEUR = document.getElementById('tasa-eur');
let cache = {};
let cacheTasas = null;
let lastMonto = null;
let lastTasaUpdate = 0;
const CACHE_EXP = 60000;

function clearResults() {
  fiatList.innerHTML = '';
  cryptoList.innerHTML = '';
}

function showGlobalLoader(show=true) {
  loaderGlobal.style.display = show ? 'block' : 'none';
  if (show) {
    fiatList.innerHTML = '';
    cryptoList.innerHTML = '';
  }
}

function renderCurrencyList(listElement, data, currencyData, isCrypto = false) {
  listElement.innerHTML = '';
  
  if (isCrypto) {
    // Renderizado para criptomonedas
    cryptoCurrencies.forEach(crypto => {
      const value = data[crypto.name] || data[crypto.code] || 0;
      
      const li = document.createElement('li');
      li.className = 'currency-item';
      li.setAttribute('role', 'listitem');
      
      const icon = document.createElement('div');
      icon.className = 'currency-icon';
      
      const iconImg = new Image();
      iconImg.src = crypto.icon;
      iconImg.alt = crypto.name;
      iconImg.loading = "lazy";
      iconImg.onerror = function() {
        this.src = `https://cryptologos.cc/logos/${crypto.code.toLowerCase()}-${crypto.code.toLowerCase()}-logo.png`;
        this.onerror = null;
      };
      
      icon.appendChild(iconImg);
      
      const details = document.createElement('div');
      details.className = 'currency-details';
      
      const nameElement = document.createElement('div');
      nameElement.className = 'currency-name';
      nameElement.textContent = crypto.name;
      
      const codeElement = document.createElement('div');
      codeElement.className = 'currency-code';
      codeElement.textContent = crypto.code;
      
      details.appendChild(nameElement);
      details.appendChild(codeElement);
      
      const valueElement = document.createElement('div');
      valueElement.className = 'currency-value';
      valueElement.textContent = typeof value === "number" ?
        value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) :
        value;
      
      li.appendChild(icon);
      li.appendChild(details);
      li.appendChild(valueElement);
      listElement.appendChild(li);
    });
  } else {
    // Renderizado para monedas tradicionales
    for (const [name, value] of Object.entries(data)) {
      const currencyInfo = currencyData[name] || {
        code: name.substring(0, 3),
        icon: 'https://via.placeholder.com/40/4361ee/ffffff?text=' + name.substring(0, 2)
      };

      const li = document.createElement('li');
      li.className = 'currency-item';
      li.setAttribute('role', 'listitem');
      
      const icon = document.createElement('div');
      icon.className = 'currency-icon';
      
      const iconImg = new Image();
      iconImg.src = currencyInfo.icon;
      iconImg.alt = name;
      iconImg.loading = "lazy";
      iconImg.onerror = function() {
        this.src = 'https://via.placeholder.com/40/4361ee/ffffff?text=' + currencyInfo.code.substring(0, 2);
      };
      
      icon.appendChild(iconImg);
      
      const details = document.createElement('div');
      details.className = 'currency-details';
      
      const nameElement = document.createElement('div');
      nameElement.className = 'currency-name';
      nameElement.textContent = name;
      
      const codeElement = document.createElement('div');
      codeElement.className = 'currency-code';
      codeElement.textContent = currencyInfo.code;
      
      details.appendChild(nameElement);
      details.appendChild(codeElement);
      
      const valueElement = document.createElement('div');
      valueElement.className = 'currency-value';
      valueElement.textContent = typeof value === "number" ?
        value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) :
        value;
      
      li.appendChild(icon);
      li.appendChild(details);
      li.appendChild(valueElement);
      listElement.appendChild(li);
    }
  }
}

function validarMonto(monto) {
  if (!monto || isNaN(monto)) return false;
  const n = Number(monto);
  if (!Number.isFinite(n) || n <= 0) return false;
  if (!/^\d+(\.\d{1,2})?$/.test(monto)) return false;
  if (monto.length > 10) return false;
  return true;
}

function isOffline() {
  return !navigator.onLine;
}

async function actualizarTasasUI(force=false) {
  if (!force && cacheTasas && Date.now() - lastTasaUpdate < CACHE_EXP) {
    tasaUSD.textContent = cacheTasas.usd;
    tasaEUR.textContent = cacheTasas.eur;
    return;
  }
  if (isOffline()) {
    tasaUSD.textContent = "Sin conexión";
    tasaEUR.textContent = "Sin conexión";
    return;
  }
  try {
    const [resUSD, resEUR] = await Promise.all([
      fetch('https://api.lupo.lat/cambio_a_bob?moneda=usd&monto=1'),
      fetch('https://api.lupo.lat/cambio_a_bob?moneda=eur&monto=1')
    ]);
    const dataUSD = await resUSD.json();
    const dataEUR = await resEUR.json();

    const showValue = (data) => {
      if ('resultado' in data && typeof data.resultado === "number") {
        return data.resultado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      if (data.resultado && !isNaN(data.resultado)) {
        return Number(data.resultado).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      if (data.error) return "Error API";
      return "Error";
    };

    const tasaUSDval = showValue(dataUSD);
    const tasaEURval = showValue(dataEUR);

    tasaUSD.textContent = tasaUSDval;
    tasaEUR.textContent = tasaEURval;
    cacheTasas = {usd: tasaUSDval, eur: tasaEURval};
    lastTasaUpdate = Date.now();
  } catch (error) {
    tasaUSD.textContent = "Error";
    tasaEUR.textContent = "Error";
  }
}

async function calcular(force=false) {
  const monto = montoInput.value.trim();
  if (!validarMonto(monto)) {
    clearResults();
    showGlobalLoader(false);
    tasaUSD.textContent = "--";
    tasaEUR.textContent = "--";
    if (monto.length > 0) alert("Por favor ingresa un monto válido (solo números positivos, hasta 2 decimales, sin ceros a la izquierda)");
    return;
  }
  if (!force && lastMonto === monto && cache[monto]) return;
  if (cache[monto] && Date.now() - cache[monto].timestamp < CACHE_EXP) {
    showGlobalLoader(false);
    renderCurrencyList(fiatList, cache[monto].data.conversiones_fiat, fiatCurrencies, false);
    renderCurrencyList(cryptoList, cache[monto].data.conversiones_cripto, cryptoCurrencies, true);
    actualizarTasasUI();
    lastMonto = monto;
    return;
  }
  if (isOffline()) {
    clearResults();
    showGlobalLoader(false);
    tasaUSD.textContent = "Sin conexión";
    tasaEUR.textContent = "Sin conexión";
    fiatList.innerHTML = `<div class="loading"><i class="fas fa-exclamation-triangle"></i>Sin conexión</div>`;
    cryptoList.innerHTML = '';
    return;
  }
  showGlobalLoader(true);
  try {
    const res = await fetch(`https://api.lupo.lat/convertir_bob?monto_bob=${monto}`);
    if (!res.ok) throw new Error(`Error API: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    cache[monto] = {data, timestamp: Date.now()};
    showGlobalLoader(false);
    renderCurrencyList(fiatList, data.conversiones_fiat, fiatCurrencies, false);
    renderCurrencyList(cryptoList, data.conversiones_cripto, cryptoCurrencies, true);
    actualizarTasasUI();
    lastMonto = monto;
  } catch (error) {
    showGlobalLoader(false);
    fiatList.innerHTML = `<div class="loading"><i class="fas fa-exclamation-circle"></i>${error.message.includes('network') ? 'Error de red. Verifica tu conexión.' : 'Error al cargar datos. Intenta nuevamente.'}</div>`;
    cryptoList.innerHTML = '';
  }
}

// Precargar imágenes de criptomonedas
function preloadCryptoImages() {
  cryptoCurrencies.forEach(crypto => {
    const img = new Image();
    img.src = crypto.icon;
  });
}

let timeout;
montoInput.addEventListener('input', () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    calcular();
  }, 800);
});

montoInput.addEventListener('keypress', (e) => {
  const char = String.fromCharCode(e.which);
  if (!/[0-9.]/.test(char)) e.preventDefault();
  if (char === '.' && montoInput.value.includes('.')) e.preventDefault();
});

montoInput.addEventListener('paste', (e) => {
  const value = (e.clipboardData || window.clipboardData).getData('text');
  if (!/^\d+(\.\d{1,2})?$/.test(value)) e.preventDefault();
});

window.addEventListener('online', () => calcular(true));
window.addEventListener('offline', () => {
  tasaUSD.textContent = "Sin conexión";
  tasaEUR.textContent = "Sin conexión";
  fiatList.innerHTML = `<div class="loading"><i class="fas fa-exclamation-triangle"></i>Sin conexión</div>`;
  cryptoList.innerHTML = '';
  showGlobalLoader(false);
});

document.addEventListener('DOMContentLoaded', () => {
  preloadCryptoImages();
  montoInput.focus();
  calcular(true);
  setInterval(() => actualizarTasasUI(), 60000);
});
