// Helper functions
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

// Clase para manejar la instalación PWA
class PWAHandler {
  constructor() {
    this.deferredPrompt = null;
  }

  init() {
    this.setupInstallPrompt();
    this.checkPWAStatus();
  }

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPromotion();
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA instalada');
      this.hideInstallButton();
    });
  }

  showInstallPromotion() {
    if (this.isPWAInstalled()) return;

    const installButton = document.createElement('div');
    installButton.id = 'installButton';
    installButton.innerHTML = `
      <button class="install-btn">
        <i class="fas fa-download"></i> Instalar App
      </button>
    `;
    document.body.appendChild(installButton);
    
    installButton.addEventListener('click', () => this.installPWA());
  }

  installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('Usuario aceptó instalar');
        }
        this.deferredPrompt = null;
      });
    }
  }

  hideInstallButton() {
    const installButton = document.getElementById('installButton');
    if (installButton) {
      installButton.style.display = 'none';
    }
  }

  isPWAInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone ||
           document.referrer.includes('android-app://');
  }

  checkPWAStatus() {
    if (this.isPWAInstalled()) {
      console.log('Ejecutando como PWA');
      this.hideInstallButton();
    }
  }
}

// Inicialización del PWA Handler
document.addEventListener('DOMContentLoaded', () => {
  const pwaHandler = new PWAHandler();
  pwaHandler.init();
});
