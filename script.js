/* ============================================================
   SCRIPT.JS - Funciones de UI y utilidades (sin Firebase)
============================================================ */
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function resetCardDisplay() {
  const card = document.getElementById('cupon-result-card');
  const container = document.getElementById('cupon-display');
  const statusElement = document.getElementById('link-cupon-status');
  
  console.log('[DEBUG] resetCardDisplay - Limpiando UI');
  
  if (card) {
    card.style.border = '';
    card.style.borderRadius = '';
  }
  
  if (container) {
    container.innerHTML = '';
  }
  
  if (statusElement) {
    statusElement.style.display = 'block';
    statusElement.innerHTML = 'Esperando cargar el cupón...';
    statusElement.style.color = '';
  }
}

function mostrarResultadoLink(exitoso, codigo, mensaje) {
  const container = document.getElementById('cupon-display');
  const card = document.getElementById('cupon-result-card');
  const statusElement = document.getElementById('link-cupon-status');
  
  console.log('[DEBUG] mostrarResultadoLink - exitoso:', exitoso, 'codigo:', codigo);
  
  if (!container || !card) {
    console.error('[DEBUG] No se encontraron elementos de UI');
    return;
  }
  
  if (exitoso) {
    card.style.border = '3px solid #4CAF50';
    card.style.borderRadius = '10px';
    container.innerHTML = `
      <div style="padding:20px; text-align:center;">
        <div style="font-size:32px; font-weight:bold; color:#4CAF50; text-transform:uppercase; letter-spacing:3px; margin-bottom:15px;">
          ${codigo}
        </div>
        <div style="color:#4CAF50; margin-top:10px;">
          ✓ ${mensaje}
        </div>
      </div>
    `;
  } else {
    card.style.border = '3px solid #f44336';
    card.style.borderRadius = '10px';
    container.innerHTML = `
      <div style="padding:20px; text-align:center;">
        <div style="font-size:32px; font-weight:bold; color:#f44336; text-transform:uppercase; letter-spacing:3px; margin-bottom:15px;">
          ${codigo}
        </div>
        <div style="color:#f44336; margin-top:10px;">
          ✗ ${mensaje}
        </div>
      </div>
    `;
  }
  
  if (statusElement) {
    statusElement.style.display = 'none';
  }
}

function debugLog(module, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] [DEBUG-${module}] ${message}`);
  if (data) console.log(data);
}

async function verificarCuponUIDisponible(codigo) {
  debugLog('CUPON-UI', `Verificando cupón: ${codigo}`);
  // Esta función SOLO verifica, no modifica nada
  const statusElement = document.getElementById('link-cupon-status');
  if (statusElement) {
    statusElement.innerHTML = `Verificando cupón: ${codigo}...`;
  }
  return true;
}

/* ============================================================
   SISTEMA DE ESPERA PARA AUTO-LOGIN
============================================================ */

let pendingCupon = null;
let loginCheckInterval = null;

async function procesarCuponPendiente() {
  if (!pendingCupon) return false;
  
  console.log('[DEBUG] Procesando cupón pendiente:', pendingCupon);
  
  if (typeof currentUser !== 'undefined' && currentUser) {
    console.log('[DEBUG] Usuario detectado, procesando cupón:', pendingCupon);
    
    if (loginCheckInterval) {
      clearInterval(loginCheckInterval);
      loginCheckInterval = null;
    }
    
    const codigo = pendingCupon;
    pendingCupon = null;
    
    await ejecutarCanjeCupon(codigo);
    return true;
  }
  
  console.log('[DEBUG] Esperando auto-login...');
  return false;
}

async function ejecutarCanjeCupon(codigo) {
  console.log('[DEBUG] ejecutarCanjeCupon - Iniciando con código:', codigo);
  
  const tabElement = document.getElementById('tab-canjear-link');
  if (!tabElement || !tabElement.classList.contains('active')) {
    console.log('[DEBUG] No estamos en pestaña de canje');
    return;
  }
  
  if (!codigo) {
    console.log('[DEBUG] No hay código');
    return;
  }
  
  const statusElement = document.getElementById('link-cupon-status');
  if (statusElement) {
    statusElement.style.display = 'none';
  }
  
  if (!currentUser) {
    console.log('[DEBUG] Usuario no logueado en ejecutarCanjeCupon');
    mostrarResultadoLink(false, codigo, 'Debés iniciar sesión para canjear este cupón.');
    return;
  }
  
  console.log('[DEBUG] Usuario logueado:', currentUser.user);
  
  try {
    console.log('[DEBUG] Buscando cupón en Firebase:', codigo);
    const snap = await db.collection('cupones').where('cupon', '==', codigo).get();
    
    if (snap.empty) {
      console.log('[DEBUG] Cupón NO encontrado');
      mostrarResultadoLink(false, codigo, 'Cupón inválido o no existe.');
      return;
    }
    
    const cuponDoc = snap.docs[0];
    const cuponData = cuponDoc.data();
    console.log('[DEBUG] Cupón encontrado:', cuponData);
    
    if (!cuponData.activo) {
      console.log('[DEBUG] Cupón inactivo');
      mostrarResultadoLink(false, codigo, 'Este cupón ya fue utilizado o está desactivado.');
      return;
    }
    
    const monto = parseFloat(cuponData.ingreso) || 0;
    const saldoActual = parseFloat(currentUser.dinero) || 0;
    const nuevoSaldo = saldoActual + monto;
    
    console.log('[DEBUG] Procesando canje - Monto:', monto, 'Saldo anterior:', saldoActual, 'Nuevo saldo:', nuevoSaldo);

    await db.collection('cuentas').doc(currentUser.docId).update({ dinero: nuevoSaldo });

    console.log('[DEBUG] Cupón se mantiene activo');
    
    currentUser.dinero = nuevoSaldo;
    if (typeof setMoneyDisplay === 'function') {
      setMoneyDisplay(nuevoSaldo);
    }
    
    console.log('[DEBUG] Canje exitoso');
    mostrarResultadoLink(true, codigo, `¡+$${monto.toFixed(2)} acreditados! Nuevo saldo: $${nuevoSaldo.toFixed(2)}`);
    
  } catch(e) {
    console.error('[DEBUG] Error en ejecutarCanjeCupon:', e);
    mostrarResultadoLink(false, codigo, 'Error al procesar el cupón. Intentá nuevamente.');
  }
}

async function procesarCuponConEspera(codigo) {
  console.log('[DEBUG] procesarCuponConEspera - Iniciando con código:', codigo);

  pendingCupon = codigo;
  
  const statusElement = document.getElementById('link-cupon-status');
  if (statusElement) {
    statusElement.style.display = 'block';
    statusElement.innerHTML = 'Verificando sesión... Por favor espera.';
    statusElement.style.color = '#f39c12';
  }
  
  const procesado = await procesarCuponPendiente();
  
  if (!procesado) {
    if (loginCheckInterval) {
      clearInterval(loginCheckInterval);
    }
    
    loginCheckInterval = setInterval(async () => {
      const success = await procesarCuponPendiente();
      if (success) {
        console.log('[DEBUG] Cupón procesado exitosamente después de esperar login');
        if (loginCheckInterval) {
          clearInterval(loginCheckInterval);
          loginCheckInterval = null;
        }
      }
    }, 500);
    
    setTimeout(() => {
      if (loginCheckInterval && pendingCupon) {
        console.log('[DEBUG] Timeout: No se detectó login después de 10 segundos');
        clearInterval(loginCheckInterval);
        loginCheckInterval = null;
        
        const statusElement = document.getElementById('link-cupon-status');
        if (statusElement) {
          statusElement.style.display = 'block';
          statusElement.innerHTML = 'Tiempo de espera agotado. Inicia sesión manualmente para canjear el cupón.';
          statusElement.style.color = '#f44336';
        }
        
        mostrarResultadoLink(false, pendingCupon, 'Tiempo de espera agotado. Inicia sesión para canjear el cupón.');
        pendingCupon = null;
      }
    }, 10000);
  }
}

async function procesarCuponPorLink() {
  const codigo = getUrlParameter('codigo');
  
  console.log('[DEBUG] procesarCuponPorLink - Código en URL:', codigo);
  
  const tabElement = document.getElementById('tab-canjear-link');
  if (!tabElement || !tabElement.classList.contains('active')) {
    console.log('[DEBUG] No estamos en pestaña de canje');
    return;
  }
  
  if (!codigo) {
    const statusElement = document.getElementById('link-cupon-status');
    if (statusElement) {
      statusElement.innerHTML = 'No se encontró ningún cupón para canjear.';
      statusElement.style.color = '#666';
    }
    return;
  }
  
  await procesarCuponConEspera(codigo);
}

if (typeof resetCardDisplay === 'undefined') {
  window.resetCardDisplay = function() {
    const card = document.getElementById('cupon-result-card');
    const container = document.getElementById('cupon-display');
    const statusElement = document.getElementById('link-cupon-status');
    
    console.log('[DEBUG] resetCardDisplay - Limpiando UI');
    
    if (card) {
      card.style.border = '';
      card.style.borderRadius = '';
    }
    
    if (container) {
      container.innerHTML = '';
    }
    
    if (statusElement) {
      statusElement.style.display = 'block';
      statusElement.innerHTML = 'Esperando cargar el cupón...';
      statusElement.style.color = '';
    }
  };
}
function toggleMenuAccount() {
  document.getElementById('menu-account').classList.toggle('open');
}
function closeMenuAccount() {
  document.getElementById('menu-account').classList.remove('open');
}