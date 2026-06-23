const characters = [
  { name: "Akane", img: "./personajes/Akane.png" },
  { name: "Hikari", img: "./personajes/Hikari.png" },
  { name: "Kaori", img: "./personajes/Kaori.png" },
  { name: "Hitomi", img: "./personajes/Hitomi.png" },
  { name: "Kamiko", img: "./personajes/Kamiko.png" },
  { name: "Kaoru", img: "./personajes/Kaoru.png" },
  { name: "Uiharu", img: "./personajes/Uiharu.png" },
  { name: "Asuna", img: "./personajes/Asuna.png" },
  { name: "Hinata", img: "./personajes/Hinata.png" }
];
  
let currentCharacter = { name: "Akane", img: "./personajes/Akane.png" };
  
function loadSelectedCharacter() {
  const saved = localStorage.getItem('selectedCharacter');
  if (saved) {
    const parsed = JSON.parse(saved);
    currentCharacter = parsed;
  }
}
  
function saveSelectedCharacter(character) {
  localStorage.setItem('selectedCharacter', JSON.stringify(character));
  currentCharacter = character;
}
  
function renderCharacterSelector() {
  const grid = document.getElementById('characters-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  characters.forEach(char => {
    const card = document.createElement('div');
    card.className = 'character-card';
    if (currentCharacter.name === char.name) {
      card.classList.add('selected');
    }
    card.innerHTML = `
      <img src="${char.img}" alt="${char.name}" onerror="this.src='./logo3.png'">
      <h3>${escapeHtml(char.name)}</h3>
    `;
    card.addEventListener('click', () => {
      selectCharacter(char, card);
    });
    grid.appendChild(card);
  });
}
  
function selectCharacter(character, cardElement) {
  saveSelectedCharacter(character);
   
  document.querySelectorAll('.character-card').forEach(card => {
    card.classList.remove('selected');
  });
  cardElement.classList.add('selected');
  
  setTimeout(() => {
    closeCharacterSelector();
  }, 300);
}
  
function closeCharacterSelector() {
  const overlay = document.getElementById('character-selector-overlay');
  if (overlay) {
    overlay.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 300);
  }
}
  
const responseArea = document.getElementById('global-response-area');
const responseAvatarImg = document.getElementById('response-avatar');
const responseCharNameSpan = document.getElementById('response-char-name');
const responseMessageText = document.getElementById('response-message-text');

function showCharacterMessage(tituloPregunta, respuestaBase) {
  if (!responseArea || !responseAvatarImg || !responseCharNameSpan || !responseMessageText) return;
   
  const personalizedMsg = buildPersonalizedMessage(tituloPregunta, respuestaBase);
  
  responseAvatarImg.src = currentCharacter.img;
  responseAvatarImg.alt = currentCharacter.name;
  responseAvatarImg.onerror = function() { this.src = './logo3.png'; };
   
  responseCharNameSpan.innerHTML = `✦ ${currentCharacter.name} ✦`;
  responseMessageText.innerHTML = personalizedMsg;
    
  if (responseArea.style.display === 'none') {
    responseArea.style.display = 'block';
    responseArea.style.opacity = '0';
    responseArea.style.transform = 'translateY(10px)';
    setTimeout(() => {
      responseArea.style.opacity = '1';
      responseArea.style.transform = 'translateY(0)';
      responseArea.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    }, 10);
  } else {
    responseArea.style.opacity = '0.7';
    setTimeout(() => { responseArea.style.opacity = '1'; }, 100);
  }
}
  
function buildPersonalizedMessage(pregunta, baseMsg) {
  let greeting = `✨ Hola, soy ${currentCharacter.name}. `;
  let intro = `Sobre «${pregunta}»: `;
  let finalText = greeting + intro + baseMsg;
  
  if (currentCharacter.name === "Akane") {
    finalText += " 🌸 Cuenta conmigo para lo que necesites.";
  } else if (currentCharacter.name === "Hikari") {
    finalText += " 🌟 ¡Confía, juntos resolveremos cualquier duda!";
  } else if (currentCharacter.name === "Kaori") {
    finalText += " 🎴 La suerte está de tu lado, pregunta sin miedo.";
  }
  return finalText;
}
  
function renderFaqList() {
  const container = document.getElementById('faq-list-container');
  if (!container) return;
   
  let html = '';
  FAQ_ITEMS.forEach(item => {
    html += `
        <div class="faq-card" data-faq-id="${item.id}" data-faq-title="${escapeHtml(item.titulo)}" data-faq-response="${escapeHtml(item.respuesta)}">
          <div class="card-inner">
            <div class="card-title">
              <span class="emoji-icon">${item.emoji}</span>
              <h2>${escapeHtml(item.titulo)}</h2>
            </div>
            <div class="chevron">▼</div>
          </div>
        </div>
      `;
  });
  container.innerHTML = html;
  
  document.querySelectorAll('.faq-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const faqTitle = card.getAttribute('data-faq-title') || '';
      const faqResponse = card.getAttribute('data-faq-response') || '';
      if (faqTitle && faqResponse) {
        showCharacterMessage(faqTitle, faqResponse);
      } else {
        const id = card.getAttribute('data-faq-id');
        const found = FAQ_ITEMS.find(i => i.id === id);
        if (found) {
          showCharacterMessage(found.titulo, found.respuesta);
        }
      }
    });
  });
}
  
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
    return c;
  });
}
  
function redirectToHome() {
  window.location.href = './index.html';
}
  
function setInitialWelcomeMessage() {
  if (responseArea) {
    responseArea.style.display = 'block';
    responseAvatarImg.src = currentCharacter.img;
    responseAvatarImg.onerror = function() { this.src = './logo3.png'; };
    responseCharNameSpan.innerHTML = `✦ ${currentCharacter.name} ✦`;
    responseMessageText.innerHTML = `¡Hola! Soy ${currentCharacter.name}, tu asesora de confianza. Toca cualquiera de los recuadros de arriba y te explicaré todo lo que necesites sobre Bet LDP. 💬`;
    responseArea.style.opacity = '1';
    responseArea.style.transform = 'translateY(0)';
  }
}