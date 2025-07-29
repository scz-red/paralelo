/**
 * APP.JS - Lógica principal de la aplicación
 * Complementa script.js con funciones específicas de la UI
 */

class AppUI {
  constructor(calculator) {
    this.calculator = calculator;
    this.initUI();
    this.setupUIEvents();
  }

  /**
   * Inicializa elementos de la interfaz
   */
  initUI() {
    // Elementos de la UI
    this.themeToggle = document.createElement('button');
    this.themeToggle.className = 'theme-toggle';
    this.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    document.body.appendChild(this.themeToggle);

    // Inicializar tema
    this.initTheme();
  }

  /**
   * Configura eventos de la UI
   */
  setupUIEvents() {
    // Toggle de tema oscuro/claro
    this.themeToggle.addEventListener('click', () => this.toggleTheme());

    // Tooltips para iconos
    this.setupTooltips();
  }

  /**
   * Inicializa el tema basado en preferencias del sistema
   */
  initTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark-theme', prefersDark);
    this.updateThemeIcon(prefersDark);
  }

  /**
   * Alterna entre temas claro/oscuro
   */
  toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark-theme');
    this.updateThemeIcon(isDark);
    
    // Guardar preferencia
    localStorage.setItem('themePreference', isDark ? 'dark' : 'light');
  }

  /**
   * Actualiza el icono del botón de tema
   */
  updateThemeIcon(isDark) {
    this.themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  }

  /**
   * Configura tooltips para elementos interactivos
   */
  setupTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(el => {
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.textContent = el.dataset.tooltip;
      el.appendChild(tooltip);

      el.addEventListener('mouseenter', () => {
        tooltip.style.visibility = 'visible';
        tooltip.style.opacity = '1';
      });

      el.addEventListener('mouseleave', () => {
        tooltip.style.visibility = 'hidden';
        tooltip.style.opacity = '0';
      });
    });
  }

  /**
   * Muestra notificación toast
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 100);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar la calculadora (de script.js)
  const calculator = new CurrencyCalculator();
  
  // Inicializar la interfaz de usuario
  const appUI = new AppUI(calculator);

  // Precargar imágenes
  const preloader = new ImagePreloader();
  preloader.preloadCryptoImages(calculator.cryptoCurrencies);
  
  // Configurar PWA
  const pwaHandler = new PWAHandler();
  pwaHandler.init();

  // Cálculo inicial
  calculator.calcular(true);
  
  // Actualización periódica de tasas
  setInterval(() => calculator.actualizarTasasUI(), 60000);
});
