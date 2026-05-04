// Resaltar un elemento una sola vez con efecto de acercamiento
function highlightElementOnce(element) {
    if (!element) return;
    element.classList.add('highlight');
    setTimeout(() => {
        element.classList.remove('highlight');
    }, 600);
}

// Resaltar y mantener el resaltado
function highlightPersistent(element, colorType = 'primary') {
    if (!element) return;
    element.classList.add('resaltable', `highlight-${colorType}`);
    element.style.border = '3px solid';
}

// Quitar resaltado persistente
function removeHighlight(element) {
    if (!element) return;
    element.classList.remove('highlight-persistent', 'highlight-primary', 'highlight-danger', 'highlight-warning', 'highlight-success');
    element.style.border = '';
}

// Resaltar con efecto de shake
function highlightShake(element) {
    if (!element) return;
    element.classList.add('highlight-shake');
    setTimeout(() => {
        element.classList.remove('highlight-shake');
    }, 500);
}

// Resaltar con efecto de pulso
function highlightPulse(element) {
    if (!element) return;
    element.classList.add('highlight-pulse');
    setTimeout(() => {
        element.classList.remove('highlight-pulse');
    }, 800);
}

// Ejemplo de uso en el tutorial.html
document.addEventListener('DOMContentLoaded', function() {
    // Resaltar elementos específicos durante el tutorial
    const botonSiguiente = document.querySelector('.btn-siguiente');
    const inputFormulario = document.querySelector('#miInput');
    
    if (botonSiguiente) {
        highlightElementOnce(botonSiguiente);
        // O para efecto más llamativo:
        // highlightShake(botonSiguiente);
    }
    
    if (inputFormulario) {
        highlightPulse(inputFormulario);
    }
});

function toggleMenuAccount() {
  document.getElementById('menu-account').classList.toggle('open');
}
function closeMenuAccount() {
  document.getElementById('menu-account').classList.remove('open');
}
document.addEventListener('click', e => {
  if (!e.target.closest('#menu-account') && !e.target.closest('#btn-account')) closeMenuAccount();
});

function gameNotAvailable() {
  alert('Este juego no está disponible para la versión de Prueba');
}
function showMsg(elementId, type, message) {
  const msgDiv = document.getElementById(elementId);
  if (!msgDiv) return;
  msgDiv.innerHTML = `<div class="msg-${type}">${message}</div>`;
  setTimeout(() => {
    if (msgDiv) msgDiv.innerHTML = '';
  }, 5000);
}
function clearMsg(elementId) {
  const msgDiv = document.getElementById(elementId);
  if (msgDiv) msgDiv.innerHTML = '';
}
function gameNotAvailable() {
  alert('Este juego no está disponible en la versión de tutorial.');
}