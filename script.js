function setMoneyDisplay(amount) {
  const el = document.getElementById('money-display');
  el.textContent = '$' + parseFloat(amount).toFixed(2);
  el.style.opacity = '1';
}

function showMsg(containerId, type, text) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.className = 'alert ' + type;
  el.textContent = text;
  el.style.display = 'block';
}

function clearMsg(containerId) {
  const el = document.getElementById(containerId);
  if (el) { el.style.display = 'none'; el.textContent = ''; el.className = 'alert'; }
}

function showTab(name) {
  document.querySelectorAll('.tab-section').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  
  const el = document.getElementById('tab-' + name);
  if (el) {
    el.classList.add('active');
    el.style.display = 'block';
  }
  closeMenuAccount();
}

function toggleMenuAccount() {
  document.getElementById('menu-account').classList.toggle('open');
}

function closeMenuAccount() {
  document.getElementById('menu-account').classList.remove('open');
}

function isCuponAlreadyRedeemed(codigo) {
  const redeemedKey = `betldp_redeemed_${currentUser.docId}`;
  const redeemedCoupons = JSON.parse(localStorage.getItem(redeemedKey) || '[]');
  return redeemedCoupons.includes(codigo);
}

function saveRedeemedCupon(codigo) {
  const redeemedKey = `betldp_redeemed_${currentUser.docId}`;
  const redeemedCoupons = JSON.parse(localStorage.getItem(redeemedKey) || '[]');
  
  if (!redeemedCoupons.includes(codigo)) {
    redeemedCoupons.push(codigo);
    localStorage.setItem(redeemedKey, JSON.stringify(redeemedCoupons));
  }
}

function generateParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.setProperty('--dur',   (7 + Math.random() * 8) + 's');
    p.style.setProperty('--delay', (Math.random() * 10)    + 's');
    p.style.setProperty('--drift', ((Math.random() - 0.5) * 60) + 'px');
    p.style.left = (Math.random() * 100) + '%';
    p.style.width = p.style.height = (1 + Math.random() * 2) + 'px';
    container.appendChild(p);
  }
}