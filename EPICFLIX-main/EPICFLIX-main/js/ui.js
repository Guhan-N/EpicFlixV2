function createAlertElement(type, title, message) {
  const alertElement = document.createElement('div');
  alertElement.className = `alert ${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };

  alertElement.innerHTML = `
    <div class="alert-icon">${icons[type] || 'ℹ️'}</div>
    <div class="alert-content">
      <div class="alert-title">${title}</div>
      <div class="alert-message">${message}</div>
    </div>
    <button class="alert-close" onclick="this.parentElement.remove()">×</button>
  `;

  return alertElement;
}

export function showAlert(type, title, message, duration = 5000) {
  const alertContainer = document.getElementById('alert-container');
  if (!alertContainer) return;

  const alertElement = createAlertElement(type, title, message);
  alertContainer.appendChild(alertElement);

  setTimeout(() => alertElement.classList.add('show'), 100);
  setTimeout(() => {
    alertElement.classList.remove('show');
    setTimeout(() => alertElement.remove(), 300);
  }, duration);
}

export function setContentContainer(html) {
  const main = document.getElementById('main');
  if (main) {
    main.innerHTML = html;
  }
  return main;
}
