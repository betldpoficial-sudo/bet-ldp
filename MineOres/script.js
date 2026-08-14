// ====== script.js ======
const firebaseConfig = {
  apiKey: "AIzaSyC8jSaP8e1UvLDn2sDdIyo2Z9o_KNhSEro",
  authDomain: "tuesa-oficial.firebaseapp.com",
  projectId: "tuesa-oficial",
  storageBucket: "tuesa-oficial.firebasestorage.app",
  messagingSenderId: "447951551213",
  appId: "1:447951557213:web:293e062ae3fe474c1cb3b4"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentUser = null;
let pendingPurchase = null;
let imagesLoaded = false;
let imagesToLoad = 0;
let imagesLoadedCount = 0;
let exitTimer = null;
let exitCountdown = 5;
let isExiting = false;

let gameState = {
  active: false,
  pickaxe: 'wooden',
  pickaxeMaxHp: 400,
  pickaxeHp: 400,
  pickaxeBlocked: [],
  x: 4.5,
  y: 1,
  speed: 0.6,
  gravity: 0.04,
  vy: 0,
  onGround: false,
  map: [],
  blocksBroken: 0,
  totalEarned: 0,
  gameOver: false,
  lastWin: 0,
  camera: { x: 0, y: 0 },
  miningCooldown: 0,
  multiplier: { type: '0.9x', value: 0.9, price: 0, name: 'GRATIS' }
};

const MULTIPLIERS = [
  { type: '0.9x', value: 0.9, price: 0, name: 'GRATIS' },
  { type: '1.0x', value: 1.0, price: 1000, name: 'ESTANDAR' },
  { type: '1.5x', value: 1.5, price: 2250, name: 'PLATA' },
  { type: '2.25x', value: 2.25, price: 3000, name: 'ORO' },
  { type: '5.0x', value: 5.0, price: 6000, name: 'DIAMANTE' }
];

const PICKAXES = {
  wooden: { name: 'Madera', hp: 200, price: 0, blocked: ['diamond_block','diamond_ore','redstone_ore','iron_block','gold_ore','bedrock'] },
  stone:  { name: 'Piedra', hp: 300, price: 200, blocked: ['diamond_block','diamond_ore','iron_block','gold_ore','bedrock'] },
  iron:   { name: 'Hierro', hp: 500, price: 500, blocked: ['bedrock'] },
  diamond:{ name: 'Diamante', hp: 800, price: 1000, blocked: ['bedrock'] }
};

const BLOCK_DATA = {
  'bedrock.png':        { damage: 999999, hits: 999999, heal: 0, value: 0 },
  'diamond_block.png':  { damage: 2,      hits: 3,      heal: 0, value: 400 },
  'diamond_ore.png':    { damage: 1,      hits: 2,      heal: 0, value: 200 },
  'dirt.png':           { damage: 2,      hits: 1,      heal: 0, value: 0 },
  'gold_ore.png':       { damage: 1,      hits: 2,      heal: 0, value: 100 },
  'grass_block_side.png': { damage: 2,    hits: 1,      heal: 0, value: 0 },
  'iron_block.png':     { damage: 2,      hits: 3,      heal: 0, value: 350 },
  'iron_ore.png':       { damage: 1,      hits: 2,      heal: 0, value: 80 },
  'redstone_ore.png':   { damage: 1,      hits: 2,      heal: 5, value: 5 },
  'stone.png':          { damage: 5,      hits: 1,      heal: 0, value: 0 }
};

// ─── Carga de imágenes ──────────────────────────────────────
const imageCache = {};
const IMAGE_PATH = './Assets/ores/';
const PICKAXE_PATH = './Assets/mine/';

const imagesToPreload = [
  'bedrock.png', 'diamond_block.png', 'diamond_ore.png', 'dirt.png',
  'gold_ore.png', 'grass_block_side.png', 'iron_block.png', 'iron_ore.png',
  'redstone_ore.png', 'stone.png'
];

function preloadImages() {
  imagesToLoad = imagesToPreload.length;
  imagesLoadedCount = 0;
  
  imagesToPreload.forEach(type => {
    const img = new Image();
    img.onload = () => {
      imagesLoadedCount++;
      if (imagesLoadedCount >= imagesToLoad) {
        imagesLoaded = true;
        console.log('Todas las imágenes cargadas');
      }
    };
    img.onerror = () => {
      imagesLoadedCount++;
      if (imagesLoadedCount >= imagesToLoad) {
        imagesLoaded = true;
        console.log('Imágenes cargadas con algunos errores');
      }
    };
    img.src = IMAGE_PATH + type;
    imageCache[type] = img;
  });
  
  const pickaxeTypes = ['wooden', 'stone', 'iron', 'diamond'];
  pickaxeTypes.forEach(type => {
    const img = new Image();
    img.src = PICKAXE_PATH + type + '_pickaxe.png';
  });
}

function loadImage(type) {
  if (type === 'air') return null;
  if (!imageCache[type]) {
    const img = new Image();
    img.src = IMAGE_PATH + type;
    imageCache[type] = img;
  }
  return imageCache[type];
}

// ─── Generación del mapa ────────────────────────────────────
function generateMap() {
  const map = [];
  const TOTAL_ROWS = 500;
  
  const layers = [
    { from: 0, to: 0, blocks: ['air'] },
    { from: 1, to: 1, blocks: ['grass_block_side.png'] },
    { from: 2, to: 4, blocks: ['dirt.png'] },
    { from: 5, to: 50, blocks: ['stone.png','iron_ore.png','iron_block.png'], weights:[20,2,1] },
    { from: 51, to: 120, blocks: ['stone.png','iron_ore.png','redstone_ore.png','iron_block.png','gold_ore.png'], weights:[25,2,1,1,1] },
    { from: 121, to: 220, blocks: ['stone.png','iron_ore.png','redstone_ore.png','iron_block.png','gold_ore.png','diamond_ore.png'], weights:[30,2,1,1,1,1] },
    { from: 221, to: 350, blocks: ['stone.png','iron_ore.png','redstone_ore.png','iron_block.png','gold_ore.png','diamond_ore.png','diamond_block.png'], weights:[20,1,1,1,1,1,1] },
    { from: 351, to: 450, blocks: ['stone.png','iron_ore.png','redstone_ore.png','iron_block.png','gold_ore.png','diamond_ore.png','diamond_block.png'], weights:[15,1,1,1,1,1,1] },
    { from: 451, to: 490, blocks: ['stone.png','iron_ore.png','redstone_ore.png','iron_block.png','gold_ore.png','diamond_ore.png','diamond_block.png'], weights:[10,1,1,1,1,1,1] },
    { from: 491, to: 499, blocks: ['stone.png','iron_ore.png','redstone_ore.png','iron_block.png','gold_ore.png','diamond_ore.png','diamond_block.png'], weights:[10,1,1,1,1,1,1] },
    { from: 500, to: 500, blocks: ['bedrock.png'] }
  ];

  for (let row = 0; row <= TOTAL_ROWS; row++) {
    const rowData = [];
    let layer = layers.find(l => row >= l.from && row <= l.to);
    if (!layer) {
      for (let col=0; col<10; col++) rowData.push({ type:'stone.png', hp:1, maxHp:1, damage:5, heal:0, value:0 });
      map.push(rowData);
      continue;
    }
    let pool = [];
    for (let i=0; i<layer.blocks.length; i++) {
      const weight = layer.weights ? layer.weights[i] : 1;
      for (let w=0; w<weight; w++) pool.push(layer.blocks[i]);
    }
    if (pool.length === 0) pool = ['air'];
    for (let col=0; col<10; col++) {
      let type = pool[Math.floor(Math.random() * pool.length)];
      if (type === 'air') {
        rowData.push({ type: 'air', hp: 0, maxHp: 0, damage: 0, heal: 0, value: 0, isAir: true });
      } else {
        if (type === 0 || type === 'stone.png' || type === undefined) type = 'stone.png';
        const data = BLOCK_DATA[type] || BLOCK_DATA['stone.png'];
        rowData.push({
          type: type,
          hp: data.hits,
          maxHp: data.hits,
          damage: data.damage,
          heal: data.heal,
          value: data.value,
          isAir: false
        });
      }
    }
    map.push(rowData);
  }
  return map;
}

// ─── Canvas / Render ────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const HP_OVERLAY = document.getElementById('pickaxe-hp-overlay');
const TILE_SIZE = 64;

function resizeCanvas() {
  const container = document.getElementById('game-area');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width || 520;
  canvas.height = canvas.width * (16/9);
}

function drawMap() {
  const cam = gameState.camera;
  const startRow = Math.max(0, Math.floor(cam.y / TILE_SIZE) - 2);
  const endRow = Math.min(500, Math.floor((cam.y + canvas.height) / TILE_SIZE) + 2);
  const startCol = Math.max(0, Math.floor(cam.x / TILE_SIZE) - 1);
  const endCol = Math.min(9, Math.floor((cam.x + canvas.width) / TILE_SIZE) + 1);

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const block = gameState.map[row][col];
      const x = col * TILE_SIZE - cam.x;
      const y = row * TILE_SIZE - cam.y;
      
      if (block.isAir) continue;
      
      const img = loadImage(block.type);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      }
      
      if (block.hp < block.maxHp) {
        const ratio = block.hp / block.maxHp;
        ctx.fillStyle = 'rgba(255,0,0,0.5)';
        ctx.fillRect(x+4, y+TILE_SIZE-8, (TILE_SIZE-8)*ratio, 4);
      }
    }
  }
}

function drawPlayer() {
  // El pico se dibuja en la posición exacta donde está
  const px = gameState.x * TILE_SIZE + TILE_SIZE/2 - gameState.camera.x;
  const py = gameState.y * TILE_SIZE + TILE_SIZE/2 - gameState.camera.y;
  
  // Dibujar el pico
  const pickaxeImg = new Image();
  pickaxeImg.src = PICKAXE_PATH + gameState.pickaxe + '_pickaxe.png';
  if (pickaxeImg.complete && pickaxeImg.naturalWidth > 0) {
    ctx.drawImage(pickaxeImg, px-20, py-20, 40, 40);
  } else {
    // Fallback visual
    ctx.fillStyle = '#f5d97f';
    ctx.beginPath();
    ctx.moveTo(px, py - 20);
    ctx.lineTo(px - 16, py + 8);
    ctx.lineTo(px + 16, py + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8a6a3a';
    ctx.fillRect(px-4, py+8, 8, 16);
  }
  
  // Actualizar overlay de vida - sincronizado correctamente
  const hpPercent = gameState.pickaxeHp / gameState.pickaxeMaxHp;
  let color = '#4caf50';
  if (hpPercent < 0.2) color = '#f44336';
  else if (hpPercent < 0.4) color = '#ffeb3b';
  
  if (HP_OVERLAY) {
    HP_OVERLAY.style.color = color;
    HP_OVERLAY.textContent = `${Math.ceil(gameState.pickaxeHp)}/${gameState.pickaxeMaxHp}`;
    const overlayX = px - 30;
    const overlayY = py - 50;
    HP_OVERLAY.style.left = overlayX + 'px';
    HP_OVERLAY.style.top = overlayY + 'px';
    HP_OVERLAY.style.display = 'block';
  }
}

// ─── Lógica del juego ──────────────────────────────────────
let isLeft = false, isRight = false;
let gameLoopId = null;

function startGame() {
  if (!currentUser) { showMsg('Debes iniciar sesión', 'error', 'selection'); return; }
  
  const multiplier = MULTIPLIERS.find(m => m.type === gameState.multiplier.type);
  
  if (multiplier.price > 0 && currentUser.dinero < multiplier.price) {
    showMsg(`No tienes suficiente dinero para esta apuesta (cuesta $${multiplier.price})`, 'error', 'selection');
    return;
  }
  
  if (!imagesLoaded) {
    showMsg('Cargando imágenes... espera un momento', 'info', 'selection');
    return;
  }
  
  const pickaxeData = PICKAXES[gameState.pickaxe];
  if (pickaxeData.price > 0) {
    if (!currentUser.pickaxes) currentUser.pickaxes = ['wooden'];
    if (!currentUser.pickaxes.includes(gameState.pickaxe)) {
      showMsg(`No tienes el pico de ${pickaxeData.name}. Cómpralo primero.`, 'error', 'selection');
      return;
    }
  }

  if (multiplier.price > 0) {
    currentUser.dinero -= multiplier.price;
    db.collection('cuentas').doc(currentUser.docId).update({ dinero: currentUser.dinero });
  }

  updateBalanceDisplay();

  gameState.map = generateMap();
  gameState.x = 4.5;
  gameState.y = 1;
  gameState.vy = 0;
  gameState.onGround = false;
  gameState.gameOver = false;
  gameState.active = true;
  gameState.blocksBroken = 0;
  gameState.totalEarned = 0;
  gameState.lastWin = 0;
  gameState.camera = { x: 0, y: 0 };
  gameState.pickaxeHp = gameState.pickaxeMaxHp;
  gameState.miningCooldown = 0;
  isExiting = false;
  exitCountdown = 5;

  document.getElementById('game-selection').style.display = 'none';
  document.getElementById('game-area').style.display = 'block';
  document.getElementById('exit-button-container').style.display = 'block';
  document.getElementById('game-result').style.display = 'none';
  if (HP_OVERLAY) HP_OVERLAY.style.display = 'none';
  document.getElementById('exit-timer').style.display = 'none';
  document.getElementById('exit-btn').style.display = 'block';
  
  resizeCanvas();

  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  gameLoop();
}

function gameLoop() {
  if (!gameState.active) return;
  updatePhysics();
  updateMining();
  render();
  gameLoopId = requestAnimationFrame(gameLoop);
}

function updatePhysics() {
  gameState.vy += gameState.gravity;
  gameState.y += gameState.vy;

  let move = 0;
  if (isLeft) move = -gameState.speed * 0.08;
  if (isRight) move = gameState.speed * 0.08;
  gameState.x += move;

  if (gameState.x < 0) gameState.x = 0;
  if (gameState.x > 9) gameState.x = 9;

  const col = Math.floor(gameState.x);
  const row = Math.floor(gameState.y);
  if (row >= 0 && row <= 500 && col >= 0 && col < 10) {
    const block = gameState.map[row][col];
    if (block && !block.isAir && block.hp > 0) {
      const blockY = row * TILE_SIZE;
      const playerBottom = gameState.y * TILE_SIZE + TILE_SIZE/2;
      if (playerBottom > blockY && gameState.vy > 0) {
        gameState.y = row - 0.4;
        gameState.vy = 0;
        gameState.onGround = true;
      }
    }
  }

  if (gameState.y > 500) {
    endGame(false, 'Llegaste al final del mapa');
  }

  const targetCamX = gameState.x * TILE_SIZE - canvas.width/2 + TILE_SIZE/2;
  const targetCamY = gameState.y * TILE_SIZE - canvas.height/2 + TILE_SIZE/2;
  gameState.camera.x += (targetCamX - gameState.camera.x) * 0.06;
  gameState.camera.y += (targetCamY - gameState.camera.y) * 0.06;
  gameState.camera.y = Math.max(0, Math.min(gameState.camera.y, 500*TILE_SIZE - canvas.height));
  gameState.camera.x = Math.max(0, Math.min(gameState.camera.x, 10*TILE_SIZE - canvas.width));
}

function updateMining() {
  if (gameState.miningCooldown > 0) {
    gameState.miningCooldown--;
    return;
  }
  
  if (!gameState.onGround || gameState.gameOver || isExiting) return;
  
  const col = Math.floor(gameState.x);
  const row = Math.floor(gameState.y) + 1;
  if (row > 500 || col < 0 || col > 9) return;
  const block = gameState.map[row][col];
  if (!block || block.isAir || block.hp <= 0) return;

  if (gameState.pickaxeBlocked.includes(block.type)) {
    return;
  }

  const damagePerHit = Math.max(1, Math.ceil(block.damage / block.maxHp));
  block.hp -= 1;
  gameState.pickaxeHp -= damagePerHit;
  
  gameState.miningCooldown = 6;

  if (block.hp <= 0) {
    const earned = block.value;
    gameState.totalEarned += earned;
    if (block.type === 'redstone_ore.png') {
      gameState.pickaxeHp += block.heal;
    }
    if (gameState.pickaxeHp > gameState.pickaxeMaxHp) gameState.pickaxeHp = gameState.pickaxeMaxHp;
    gameState.blocksBroken++;
    gameState.map[row][col] = { type: 'air', hp: 0, maxHp: 0, damage: 0, heal: 0, value: 0, isAir: true };
  }

  // CORREGIDO: Verificar que la vida sea menor o igual a 0
  if (gameState.pickaxeHp <= 0) {
    endGame(false, 'Tu pico se rompió');
  }
}

// ─── Sistema de salida con temporizador ─────────────────────
function startExitTimer() {
  if (isExiting || gameState.gameOver || !gameState.active) return;
  
  isExiting = true;
  exitCountdown = 5;
  const timerDiv = document.getElementById('exit-timer');
  const countdownSpan = document.getElementById('exit-countdown');
  const exitBtn = document.getElementById('exit-btn');
  
  if (exitBtn) exitBtn.style.display = 'none';
  if (timerDiv) {
    timerDiv.style.display = 'block';
    if (countdownSpan) countdownSpan.textContent = exitCountdown;
  }
  
  if (exitTimer) clearInterval(exitTimer);
  
  exitTimer = setInterval(() => {
    exitCountdown--;
    if (countdownSpan) countdownSpan.textContent = exitCountdown;
    
    if (exitCountdown <= 0) {
      clearInterval(exitTimer);
      exitTimer = null;
      exitAndClaim();
    }
  }, 1000);
}

function exitAndClaim() {
  if (!gameState.active || gameState.gameOver) return;
  
  const multiplier = MULTIPLIERS.find(m => m.type === gameState.multiplier.type);
  const finalEarned = gameState.totalEarned * multiplier.value;
  
  currentUser.dinero += finalEarned;
  db.collection('cuentas').doc(currentUser.docId).update({ dinero: currentUser.dinero });
  gameState.lastWin = finalEarned;
  updateBalanceDisplay();
  
  const lastWinEl = document.getElementById('game-last-win');
  if (lastWinEl) lastWinEl.innerHTML = '$' + finalEarned.toFixed(2);
  
  document.getElementById('game-area').style.display = 'none';
  document.getElementById('exit-button-container').style.display = 'none';
  document.getElementById('game-result').style.display = 'block';
  document.getElementById('game-result-title').textContent = 'Saliste con exito';
  document.getElementById('game-result-detail').innerHTML = `
    <p>Has salido de la mina</p>
    <p>Bloques rotos: ${gameState.blocksBroken}</p>
    <p>Ganancia base: $${gameState.totalEarned.toFixed(2)}</p>
    <p>Multiplicador: ${multiplier.value}x (${multiplier.name})</p>
    <p style="font-size:20px; color:#f5d97f; font-weight:bold;">Total reclamado: $${finalEarned.toFixed(2)}</p>
    <p style="margin-top:8px; font-weight:bold; color:#f5d97f;">Nuevo saldo: $${currentUser.dinero.toFixed(2)}</p>
  `;
  
  gameState.active = false;
  gameState.gameOver = true;
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  if (exitTimer) clearInterval(exitTimer);
  exitTimer = null;
  isExiting = false;
}

function endGame(win, reason) {
  if (gameState.gameOver) return;
  gameState.gameOver = true;
  gameState.active = false;
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  if (exitTimer) clearInterval(exitTimer);
  exitTimer = null;
  isExiting = false;

  const multiplier = MULTIPLIERS.find(m => m.type === gameState.multiplier.type);
  const finalEarned = gameState.totalEarned * multiplier.value;
  
  if (finalEarned > 0) {
    currentUser.dinero += finalEarned;
    db.collection('cuentas').doc(currentUser.docId).update({ dinero: currentUser.dinero });
    gameState.lastWin = finalEarned;
  }
  updateBalanceDisplay();

  const lastWinEl = document.getElementById('game-last-win');
  if (lastWinEl) lastWinEl.innerHTML = '$' + finalEarned.toFixed(2);
  
  const gameArea = document.getElementById('game-area');
  const exitContainer = document.getElementById('exit-button-container');
  const resultDiv = document.getElementById('game-result');
  const resultTitle = document.getElementById('game-result-title');
  const resultDetail = document.getElementById('game-result-detail');
  
  if (gameArea) gameArea.style.display = 'none';
  if (exitContainer) exitContainer.style.display = 'none';
  if (resultDiv) resultDiv.style.display = 'block';
  if (resultTitle) resultTitle.textContent = win ? 'Ganaste!' : 'Fin de la partida';
  if (resultDetail) {
    resultDetail.innerHTML = `
      <p>Bloques rotos: ${gameState.blocksBroken}</p>
      <p>Ganancia base: $${gameState.totalEarned.toFixed(2)}</p>
      <p>Multiplicador: ${multiplier.value}x (${multiplier.name})</p>
      <p style="font-size:20px; color:#f5d97f; font-weight:bold;">Total ganado: $${finalEarned.toFixed(2)}</p>
      <p>${reason}</p>
      <p style="margin-top:8px; font-weight:bold; color:#f5d97f;">Nuevo saldo: $${currentUser.dinero.toFixed(2)}</p>
    `;
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  drawPlayer();
}

// ─── Controles ──────────────────────────────────────────────
document.getElementById('btn-left').addEventListener('mousedown', () => isLeft = true);
document.getElementById('btn-left').addEventListener('mouseup', () => isLeft = false);
document.getElementById('btn-left').addEventListener('mouseleave', () => isLeft = false);
document.getElementById('btn-right').addEventListener('mousedown', () => isRight = true);
document.getElementById('btn-right').addEventListener('mouseup', () => isRight = false);
document.getElementById('btn-right').addEventListener('mouseleave', () => isRight = false);

document.getElementById('btn-left').addEventListener('touchstart', (e) => { e.preventDefault(); isLeft = true; });
document.getElementById('btn-left').addEventListener('touchend', (e) => { e.preventDefault(); isLeft = false; });
document.getElementById('btn-right').addEventListener('touchstart', (e) => { e.preventDefault(); isRight = true; });
document.getElementById('btn-right').addEventListener('touchend', (e) => { e.preventDefault(); isRight = false; });

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') isLeft = true;
  if (e.key === 'ArrowRight') isRight = true;
  if (e.key === 'Escape') startExitTimer();
});
document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft') isLeft = false;
  if (e.key === 'ArrowRight') isRight = false;
});

// ─── UI ─────────────────────────────────────────────────────
function selectPickaxe(type) {
  if (!currentUser) { showMsg('Cargando usuario...', 'info', 'selection'); return; }
  
  const data = PICKAXES[type];
  if (!currentUser.pickaxes) currentUser.pickaxes = ['wooden'];
  
  if (!currentUser.pickaxes.includes(type) && data.price > 0) {
    pendingPurchase = { type: type, price: data.price, name: data.name };
    document.getElementById('buy-popup-text').textContent = `¿Deseas comprar el pico de ${data.name} por $${data.price}?`;
    document.getElementById('buy-popup-balance').textContent = `$${currentUser.dinero.toFixed(2)}`;
    document.getElementById('buy-popup').style.display = 'flex';
    document.getElementById('buy-popup-msg').style.display = 'none';
    return;
  }
  
  gameState.pickaxe = type;
  gameState.pickaxeMaxHp = data.hp;
  gameState.pickaxeHp = data.hp;
  gameState.pickaxeBlocked = data.blocked;
  document.getElementById('current-pickaxe-name').textContent = data.name;
  document.querySelectorAll('.pickaxe-btn').forEach(el => el.classList.remove('active'));
  document.querySelector(`.pickaxe-btn[data-pick="${type}"]`).classList.add('active');
}

function selectMultiplier(type) {
  const multiplier = MULTIPLIERS.find(m => m.type === type);
  if (!multiplier) return;
  
  if (multiplier.price > 0 && currentUser && currentUser.dinero < multiplier.price) {
    showMsg(`No tienes suficiente dinero para esta apuesta (cuesta $${multiplier.price})`, 'error', 'selection');
    return;
  }
  
  gameState.multiplier = { type: multiplier.type, value: multiplier.value, price: multiplier.price, name: multiplier.name };
  document.getElementById('current-multiplier-name').textContent = `${multiplier.name} (${multiplier.value}x)`;
  document.getElementById('game-multiplier').textContent = multiplier.value + 'x';
  document.getElementById('game-cost').textContent = '$' + multiplier.price;
  document.querySelectorAll('.multiplier-btn').forEach(el => el.classList.remove('active'));
  document.querySelector(`.multiplier-btn[data-mult="${type}"]`).classList.add('active');
}

function closeBuyPopup() {
  document.getElementById('buy-popup').style.display = 'none';
  pendingPurchase = null;
}

async function confirmBuy() {
  if (!pendingPurchase || !currentUser) return;
  
  const { type, price, name } = pendingPurchase;
  
  if (currentUser.dinero < price) {
    const msg = document.getElementById('buy-popup-msg');
    msg.style.display = 'block';
    msg.className = 'alert error';
    msg.textContent = `Saldo insuficiente. Necesitas $${price} y tienes $${currentUser.dinero.toFixed(2)}`;
    return;
  }
  
  currentUser.dinero -= price;
  if (!currentUser.pickaxes) currentUser.pickaxes = ['wooden'];
  currentUser.pickaxes.push(type);
  
  await db.collection('cuentas').doc(currentUser.docId).update({ 
    dinero: currentUser.dinero,
    pickaxes: currentUser.pickaxes 
  });
  
  updateBalanceDisplay();
  updatePickaxeUI();
  
  const msg = document.getElementById('buy-popup-msg');
  msg.style.display = 'block';
  msg.className = 'alert success';
  msg.textContent = `¡Compraste el pico de ${name} con éxito!`;
  
  setTimeout(() => {
    closeBuyPopup();
    const data = PICKAXES[type];
    gameState.pickaxe = type;
    gameState.pickaxeMaxHp = data.hp;
    gameState.pickaxeHp = data.hp;
    gameState.pickaxeBlocked = data.blocked;
    document.getElementById('current-pickaxe-name').textContent = data.name;
    document.querySelectorAll('.pickaxe-btn').forEach(el => el.classList.remove('active'));
    document.querySelector(`.pickaxe-btn[data-pick="${type}"]`).classList.add('active');
    showMsg(`Pico de ${name} seleccionado`, 'success', 'selection');
  }, 1500);
}

function backToMenu() {
  document.getElementById('game-result').style.display = 'none';
  document.getElementById('game-selection').style.display = 'block';
  document.getElementById('game-area').style.display = 'none';
  document.getElementById('exit-button-container').style.display = 'none';
  if (HP_OVERLAY) HP_OVERLAY.style.display = 'none';
  document.getElementById('exit-timer').style.display = 'none';
  document.getElementById('exit-btn').style.display = 'block';
  if (exitTimer) clearInterval(exitTimer);
  exitTimer = null;
  isExiting = false;
}

function showMsg(text, type, area) {
  const id = area === 'selection' ? 'game-msg-selection' : 'game-msg-game';
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'alert ' + type;
  el.textContent = text;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}

// ─── Firebase / Usuario ─────────────────────────────────────
async function loadCurrentUser() {
  let userId = localStorage.getItem('betldp_user_id');
  if (userId) {
    const doc = await db.collection('cuentas').doc(userId).get();
    if (doc.exists) { 
      currentUser = { docId: doc.id, ...doc.data() }; 
      if (!currentUser.pickaxes) currentUser.pickaxes = ['wooden'];
      updateBalanceDisplay(); 
      updatePickaxeUI();
      return; 
    }
  }
  const snap = await db.collection('cuentas').where('correo', '==', 'test@blackjack.com').get();
  if (!snap.empty) {
    currentUser = { docId: snap.docs[0].id, ...snap.docs[0].data() };
  } else {
    const newUser = { 
      user: 'TestBJ', 
      correo: 'test@blackjack.com', 
      clave: 'test123', 
      dinero: 1000,
      pickaxes: ['wooden']
    };
    const ref = await db.collection('cuentas').add(newUser);
    currentUser = { docId: ref.id, ...newUser };
  }
  localStorage.setItem('betldp_user_id', currentUser.docId);
  if (!currentUser.pickaxes) currentUser.pickaxes = ['wooden'];
  updateBalanceDisplay();
  updatePickaxeUI();
}

function updateBalanceDisplay() {
  const balanceEl = document.getElementById('game-balance');
  const moneyEl = document.getElementById('money-display');
  if (balanceEl) balanceEl.innerHTML = '$' + (currentUser?.dinero?.toFixed(2) ?? '0.00');
  if (moneyEl) moneyEl.innerHTML = '$' + (currentUser?.dinero?.toFixed(2) ?? '0.00');
}

function updatePickaxeUI() {
  if (!currentUser) return;
  const pickaxes = currentUser.pickaxes || ['wooden'];
  document.querySelectorAll('.pickaxe-btn').forEach(el => {
    const type = el.dataset.pick;
    if (pickaxes.includes(type) || PICKAXES[type].price === 0) {
      el.classList.add('owned');
      el.classList.remove('locked');
    } else {
      el.classList.remove('owned');
      el.classList.add('locked');
    }
  });
}

// ─── Inicializar ────────────────────────────────────────────
window.addEventListener('resize', resizeCanvas);

preloadImages();

loadCurrentUser();
setTimeout(() => {
  selectPickaxe('wooden');
  selectMultiplier('0.9x');
}, 500);