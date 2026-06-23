const firebaseConfig = {
  apiKey: "AIzaSyC8jSaP8e1UvLDn2sDdIyo2Z9o_KNhSEro",
  authDomain: "tuesa-oficial.firebaseapp.com",
  projectId: "tuesa-oficial",
  storageBucket: "tuesa-oficial.firebasestorage.app",
  messagingSenderId: "447951557213",
  appId: "1:447951557213:web:293e062ae3fe474c1cb3b4"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentUser = null;
let moneyInterval = null;
let emailDestinatarioTransferencia = '';

document.addEventListener('click', e => {
  if (!e.target.closest('#menu-account') && !e.target.closest('#btn-account')) closeMenuAccount();
});

async function fetchMoney() {
  if (!currentUser) return;
  try {
    const snap = await db.collection('cuentas').doc(currentUser.docId).get();
    if (snap.exists) {
      const d = snap.data();
      currentUser.dinero = d.dinero;
      setMoneyDisplay(d.dinero);
    }
  } catch(e) { console.warn('fetchMoney error', e); }
}

function startMoneyPolling() {
  if (moneyInterval) clearInterval(moneyInterval);
  moneyInterval = setInterval(fetchMoney, 120000);
}

function logout() {
  currentUser = null;
  localStorage.removeItem('betldp_user_id');
  localStorage.removeItem('betldp_user_email');
  localStorage.removeItem('betldp_user_name');
  if (moneyInterval) { clearInterval(moneyInterval); moneyInterval = null; }
  document.getElementById('money-display').style.opacity = '0';
  document.getElementById('menu-user-info').style.display = 'none';
  document.getElementById('btn-logout').style.display = 'none';
  closeMenuAccount();
  window.location.href = './index.html';
}

async function autoLogin() {
  const savedUserId = localStorage.getItem('betldp_user_id');
  const savedEmail = localStorage.getItem('betldp_user_email');
  if (!savedUserId || !savedEmail) { window.location.href = './index.html'; return false; }
  try {
    const doc = await db.collection('cuentas').doc(savedUserId).get();
    if (doc.exists) {
      const data = doc.data();
      if (data.correo === savedEmail) {
        currentUser = { docId: doc.id, ...data };
        document.getElementById('menu-uname').textContent = data.user;
        document.getElementById('ajustes-name').textContent = data.user;
        document.getElementById('menu-uemail').textContent = data.correo;
        document.getElementById('ajustes-email').textContent = data.correo;
        document.getElementById('menu-user-info').style.display = 'block';
        document.getElementById('btn-logout').style.display = 'block';
        document.getElementById('btn-go-login').style.display = 'none';
        setMoneyDisplay(data.dinero);
        startMoneyPolling();
        return true;
      }
    }
  } catch(e) { console.warn('AutoLogin error:', e); }
  window.location.href = './index.html';
  return false;
}

(function(){ emailjs.init({ publicKey: "TSm2szahK3vNCAvH7" }); })();

async function cuponRec() {
  if (!currentUser) { showMsg('cupon-msg', 'error', 'Debés estar logueado para usar cupones.'); return; }
  const codigo = document.getElementById('cupon-input').value.trim().toUpperCase();
  clearMsg('cupon-msg');
  if (!codigo) { showMsg('cupon-msg', 'error', 'Ingresá un código de cupón.'); return; }
  if (isCuponAlreadyRedeemed(codigo)) { showMsg('cupon-msg', 'error', '❌ Este cupón ya lo has canjeado anteriormente. Solo se puede usar una vez por cuenta.'); document.getElementById('cupon-input').value = ''; return; }
  const btn = document.getElementById('btn-cupon');
  btn.innerHTML = '<span class="spinner"></span>Verificando...';
  btn.disabled = true;
  try {
    const snap = await db.collection('cupones').where('cupon', '==', codigo).get();
    if (snap.empty) { showMsg('cupon-msg', 'error', 'Código inválido. No existe ese cupón.'); btn.innerHTML = 'Recargar'; btn.disabled = false; return; }
    const cuponDoc = snap.docs[0];
    const cuponData = cuponDoc.data();
    if (!cuponData.activo) { showMsg('cupon-msg', 'error', 'Este cupón ya fue utilizado o está desactivado.'); btn.innerHTML = 'Recargar'; btn.disabled = false; return; }
    const monto = parseFloat(cuponData.ingreso) || 0;
    const saldoActual = parseFloat(currentUser.dinero) || 0;
    const nuevoSaldo = saldoActual + monto;
    await db.collection('cuentas').doc(currentUser.docId).update({ dinero: nuevoSaldo });
    saveRedeemedCupon(codigo);
    currentUser.dinero = nuevoSaldo;
    setMoneyDisplay(nuevoSaldo);
    document.getElementById('cupon-input').value = '';
    showMsg('cupon-msg', 'success', `✅ ¡+$${monto.toFixed(2)} acreditados! Tu nuevo saldo: $${nuevoSaldo.toFixed(2)}`);
  } catch(e) { showMsg('cupon-msg', 'error', 'Error al procesar el cupón. Intentá nuevamente.'); console.error(e); } finally { btn.innerHTML = 'Recargar'; btn.disabled = false; }
}

async function verificarDestinatario() {
  if (!currentUser) { showMsg('transfer-msg-1', 'error', 'Debés estar logueado para transferir.'); return; }
  const correoDestinatario = document.getElementById('transfer-email').value.trim().toLowerCase();
  clearMsg('transfer-msg-1');
  if (!correoDestinatario) { showMsg('transfer-msg-1', 'error', 'Ingresá el correo del destinatario.'); return; }
  if (correoDestinatario === currentUser.correo) { showMsg('transfer-msg-1', 'error', 'No puedes transferir dinero a ti mismo.'); return; }
  try {
    const snap = await db.collection('cuentas').where('correo', '==', correoDestinatario).get();
    if (snap.empty) { showMsg('transfer-msg-1', 'error', '❌ No existe ninguna cuenta con ese correo.'); return; }
    const destinatarioData = snap.docs[0].data();
    emailDestinatarioTransferencia = correoDestinatario;
    document.getElementById('transfer-dest-username').textContent = destinatarioData.user;
    document.getElementById('transfer-dest-email').textContent = correoDestinatario;
    document.getElementById('transfer-saldo-actual').textContent = '$' + parseFloat(currentUser.dinero).toFixed(2);
    showMsg('transfer-msg-1', 'success', '✅ Destinatario verificado correctamente.');
    setTimeout(() => { showTab('transferirdos'); }, 800);
  } catch(e) { showMsg('transfer-msg-1', 'error', 'Error al verificar el destinatario. Intentá nuevamente.'); console.error(e); }
}

async function realizarTransferencia() {
  if (!currentUser) { showMsg('transfer-msg-2', 'error', 'No hay usuario logueado.'); return; }
  if (!emailDestinatarioTransferencia) { showMsg('transfer-msg-2', 'error', 'Falta la información del destinatario.'); return; }
  const monto = parseFloat(document.getElementById('transfer-monto').value);
  clearMsg('transfer-msg-2');
  if (!monto || monto <= 0) { showMsg('transfer-msg-2', 'error', 'Ingresá un monto válido.'); return; }
  if (monto > parseFloat(currentUser.dinero)) { showMsg('transfer-msg-2', 'error', `❌ No tienes suficiente saldo. Tienes $${parseFloat(currentUser.dinero).toFixed(2)}.`); return; }
  const btn = document.querySelector('#tab-transferirdos .btn-primary');
  btn.innerHTML = '<span class="spinner"></span>Procesando transferencia...';
  btn.disabled = true;
  try {
    const snapEmisor = await db.collection('cuentas').where('correo', '==', currentUser.correo).get();
    if (snapEmisor.empty) throw new Error('Cuenta emisor no encontrada');
    const snapDestinatario = await db.collection('cuentas').where('correo', '==', emailDestinatarioTransferencia).get();
    if (snapDestinatario.empty) throw new Error('Cuenta destinatario no encontrada');
    const docIdEmisor = snapEmisor.docs[0].id;
    const docIdDestinatario = snapDestinatario.docs[0].id;
    const datosDestinatario = snapDestinatario.docs[0].data();
    const saldoEmisor = parseFloat(currentUser.dinero);
    const saldoDestinatario = parseFloat(datosDestinatario.dinero);
    if (saldoEmisor < monto) { showMsg('transfer-msg-2', 'error', `❌ No tienes suficiente saldo para transferir $${monto.toFixed(2)}.`); btn.innerHTML = 'Confirmar transferencia'; btn.disabled = false; return; }
    const nuevoSaldoEmisor = saldoEmisor - monto;
    const nuevoSaldoDestinatario = saldoDestinatario + monto;
    await db.collection('cuentas').doc(docIdEmisor).update({ dinero: nuevoSaldoEmisor });
    await db.collection('cuentas').doc(docIdDestinatario).update({ dinero: nuevoSaldoDestinatario });
    currentUser.dinero = nuevoSaldoEmisor;
    setMoneyDisplay(nuevoSaldoEmisor);
    showMsg('transfer-msg-2', 'success', `✅ ¡Transferencia exitosa! Se transfirieron $${monto.toFixed(2)} a ${datosDestinatario.user}.`);
    document.getElementById('transfer-monto').value = '';
    document.getElementById('transfer-email').value = '';
    document.getElementById('transfer-dest-username').textContent = '';
    document.getElementById('transfer-dest-email').textContent = '';
    emailDestinatarioTransferencia = '';
    setTimeout(() => { showTab('inicio'); }, 2000);
  } catch(e) { showMsg('transfer-msg-2', 'error', 'Error al realizar la transferencia. Intentá nuevamente.'); console.error(e); } finally { btn.innerHTML = 'Confirmar transferencia'; btn.disabled = false; }
}

async function procesarCuponPorLink() {
  const codigo = getUrlParameter('codigo');
  console.log('[DEBUG] procesarCuponPorLink - Iniciando con código:', codigo);
  if (!codigo) {
    console.log('[DEBUG] No hay código en URL');
    const statusElement = document.getElementById('link-cupon-status');
    if (statusElement) { statusElement.innerHTML = 'No se encontró ningún cupón para canjear.'; statusElement.style.color = '#666'; }
    return;
  }
  const tabElement = document.getElementById('tab-canjear-link');
  const isInCanjeTab = tabElement && tabElement.classList.contains('active');
  if (!isInCanjeTab) {
    console.log('[DEBUG] No estamos en pestaña de canje, cambiando a ella...');
    showTab('canjear-link');
    setTimeout(() => { procesarCuponPorLink(); }, 300);
    return;
  }
  console.log('[DEBUG] Estamos en pestaña de canje, procesando...');
  const statusElement = document.getElementById('link-cupon-status');
  if (statusElement) { statusElement.style.display = 'none'; }
  const container = document.getElementById('cupon-display');
  if (!container) { console.error('[DEBUG] No se encontró cupon-display'); return; }
  if (!currentUser) { console.log('[DEBUG] Usuario no logueado'); mostrarResultadoLink(false, codigo, 'Debés iniciar sesión para canjear este cupón.'); return; }
  console.log('[DEBUG] Usuario logueado:', currentUser.user);
  if (isCuponAlreadyRedeemed(codigo)) { console.log('[DEBUG] Cupón ya canjeado por este usuario'); mostrarResultadoLink(false, codigo, 'Ya has canjeado este cupón anteriormente. Solo se puede usar una vez por cuenta.'); return; }
  try {
    console.log('[DEBUG] Buscando cupón en Firebase:', codigo);
    const snap = await db.collection('cupones').where('cupon', '==', codigo).get();
    if (snap.empty) { console.log('[DEBUG] Cupón NO encontrado'); mostrarResultadoLink(false, codigo, 'Cupón inválido o no existe.'); return; }
    const cuponDoc = snap.docs[0];
    const cuponData = cuponDoc.data();
    console.log('[DEBUG] Cupón encontrado:', cuponData);
    if (!cuponData.activo) { console.log('[DEBUG] Cupón inactivo'); mostrarResultadoLink(false, codigo, 'Este cupón ya fue utilizado o está desactivado.'); return; }
    const monto = parseFloat(cuponData.ingreso) || 0;
    const userSnap = await db.collection('cupones').doc(currentUser.docId).get();
    const saldoActual = parseFloat(userSnap.data().dinero) || 0;
    const nuevoSaldo = saldoActual + monto;
    console.log('[DEBUG] Procesando canje - Monto:', monto, 'Saldo anterior:', saldoActual, 'Nuevo saldo:', nuevoSaldo);
    await db.collection('cupones').doc(currentUser.docId).update({ dinero: nuevoSaldo });
    saveRedeemedCupon(codigo);
    currentUser.dinero = nuevoSaldo;
    setMoneyDisplay(nuevoSaldo);
    console.log('[DEBUG] Canje exitoso');
    mostrarResultadoLink(true, codigo, `¡+$${monto.toFixed(2)} acreditados! Nuevo saldo: $${nuevoSaldo.toFixed(2)}`);
  } catch (e) { console.error('[DEBUG] Error en procesarCuponPorLink:', e); mostrarResultadoLink(false, codigo, 'Error al procesar el cupón. Intentá nuevamente.'); }
}

generateParticles();

document.addEventListener('DOMContentLoaded', async function() {
  const loggedIn = await autoLogin();
  if (loggedIn) { showTab('inicio'); }
  if (window.location.search.includes('codigo=')) {
    const checkUser = setInterval(() => {
      if (currentUser) { clearInterval(checkUser); setTimeout(() => { procesarCuponPorLink(); }, 500); }
    }, 100);
    setTimeout(() => { clearInterval(checkUser); if (!currentUser) { console.log('[DEBUG] Timeout esperando usuario'); const statusElement = document.getElementById('link-cupon-status'); if (statusElement) { statusElement.innerHTML = 'Debés iniciar sesión para canjear este cupón.'; statusElement.style.color = '#f44336'; } } }, 10000);
  }
});
