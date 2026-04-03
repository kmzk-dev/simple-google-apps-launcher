/**
 * default_apps.json から全アプリケーションのマスターリストを読み込む
 */
let DEFAULT_APPS = [];
let currentApps = [];
let hiddenAppIds = [];
const grid = document.getElementById('app-grid');
let draggedItem = null;

/**
 * スタイルに対応したアイコンURL取得関数
 */
function getIconUrl(app, style = 'origin') {
  const dir = style === 'dot' ? 'dot-icons' : 'origin-icons';
  const fileName = app.icon || 'sample.png';
  return `statics/${dir}/${fileName}`;
}

/**
 * 初期化
 */
async function init() {
  try {
    const response = await fetch('default_apps.json');
    if (!response.ok) throw new Error('Failed to load default_apps.json');
    DEFAULT_APPS = await response.json();
    currentApps = [...DEFAULT_APPS];
  } catch (e) {
    console.error("Error loading default_apps.json:", e);
    return;
  }

  let iconStyle = 'origin';

  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      const result = await chrome.storage.local.get(['appOrder', 'hiddenAppIds', 'iconStyle']);
      
      if (result.iconStyle) {
        iconStyle = result.iconStyle;
      }

      if (result.hiddenAppIds) {
        hiddenAppIds = result.hiddenAppIds;
      }

      if (result.appOrder && Array.isArray(result.appOrder)) {
        const orderedApps = result.appOrder
          .map(id => DEFAULT_APPS.find(app => app.id === id))
          .filter(Boolean);
        
        const missingApps = DEFAULT_APPS.filter(app => !result.appOrder.includes(app.id));
        currentApps = [...orderedApps, ...missingApps];
      }
    } catch (e) {
      console.error("Storage error:", e);
    }
  }

  render(iconStyle);
  addResetListener();
}

/**
 * 描画
 */
function render(style) {
  grid.innerHTML = '';
  
  const visibleApps = currentApps.filter(app => !hiddenAppIds.includes(app.id));

  visibleApps.forEach((app, index) => {
    const item = document.createElement('div');
    item.className = 'app-item';
    item.draggable = true;
    item.dataset.index = index;
    item.dataset.id = app.id;

    const icon = document.createElement('img');
    icon.className = 'app-icon';
    icon.src = getIconUrl(app, style);
    icon.alt = app.name;
    icon.addEventListener('error', () => {
      const dir = style === 'dot' ? 'dot-icons' : 'origin-icons';
      icon.src = `statics/${dir}/sample.png`;
    });

    const name = document.createElement('span');
    name.className = 'app-name';
    name.textContent = app.name;

    item.appendChild(icon);
    item.appendChild(name);

    item.onclick = () => {
      if (item.classList.contains('dragging')) return;
      chrome.tabs.create({ url: app.url });
    };

    item.ondragstart = () => {
      draggedItem = item;
      grid.classList.add('dragging-mode');
      setTimeout(() => item.classList.add('dragging'), 0);
    };

    item.ondragover = e => e.preventDefault();

    item.ondrop = e => {
      e.preventDefault();
      const fromId = draggedItem.dataset.id;
      const toId = item.dataset.id;

      const fromFullIndex = currentApps.findIndex(a => a.id === fromId);
      const toFullIndex = currentApps.findIndex(a => a.id === toId);
      
      if (fromFullIndex !== -1 && toFullIndex !== -1 && fromFullIndex !== toFullIndex) {
        const [moved] = currentApps.splice(fromFullIndex, 1);
        currentApps.splice(toFullIndex, 0, moved);
        saveOrder();
        render(style);
      }
    };

    item.ondragend = () => {
      item.classList.remove('dragging');
      grid.classList.remove('dragging-mode');
      draggedItem = null;
    };

    grid.appendChild(item);
  });
}

function addResetListener() {
  const resetBtn = document.getElementById('reset-button');
  if (!resetBtn) return;

  resetBtn.onclick = async () => {
    if (confirm('アイコンの並び順を初期状態に戻しますか？')) {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove('appOrder');
        currentApps = [...DEFAULT_APPS];
        const result = await chrome.storage.local.get('iconStyle');
        render(result.iconStyle || 'origin');
      }
    }
  };
}

function saveOrder() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ appOrder: currentApps.map(a => a.id) });
  }
}

init();