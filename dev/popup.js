/**
 * default_apps.json から全アプリケーションのマスターリストを読み込む
 */
let DEFAULT_APPS = [];
let currentApps = [];
let hiddenAppIds = [];
const grid = document.getElementById('app-grid');
let draggedItem = null;

function getIconUrl(app) {
  return app.icon || 'statics/dot-icons/sample.png';
}
/**
 * 初期化：JSON から DEFAULT_APPS を読み込み、ストレージから「並び順」と「非表示リスト」を両方取得する
 */
async function init() {
  // 1. JSON ファイルから DEFAULT_APPS を読み込む
  try {
    const response = await fetch('default_apps.json');
    if (!response.ok) throw new Error('Failed to load default_apps.json');
    DEFAULT_APPS = await response.json();
    currentApps = [...DEFAULT_APPS];
  } catch (e) {
    console.error("Error loading default_apps.json:", e);
    return;
  }

  // 2. Chrome ストレージから「並び順」と「非表示リスト」を取得
  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      const result = await chrome.storage.local.get(['appOrder', 'hiddenAppIds']);
      
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

  render();
  addResetListener();
}
/**
 * 描画：非表示リストに含まれないアプリのみを表示する
 * ドラッグ時のアニメーション制御を含む
 */
function render() {
  grid.innerHTML = '';
  
  // hiddenAppIds に含まれていないものだけを抽出
  const visibleApps = currentApps.filter(app => !hiddenAppIds.includes(app.id));

  visibleApps.forEach((app, index) => {
    const item = document.createElement('div');
    item.className = 'app-item';
    item.draggable = true;
    item.dataset.index = index;
    item.dataset.id = app.id;

    const icon = document.createElement('img');
    icon.className = 'app-icon';
    icon.src = getIconUrl(app);
    icon.alt = app.name;
    icon.addEventListener('error', () => {
      icon.src = 'statics/dot-icons/sample.png';
    });

    const name = document.createElement('span');
    name.className = 'app-name';
    name.textContent = app.name;

    item.appendChild(icon);
    item.appendChild(name);

    // クリックイベント：ドラッグ中でなければURLを開く
    item.onclick = () => {
      if (item.classList.contains('dragging')) return;
      chrome.tabs.create({ url: app.url });
    };

    // ドラッグ開始
    item.ondragstart = () => {
      draggedItem = item;
      // グリッド全体に「入れ替えモード」のクラスを付与（周囲を揺らす）
      grid.classList.add('dragging-mode');
      // 非同期でクラスを付与し、ドラッグ中の見た目を変更
      setTimeout(() => item.classList.add('dragging'), 0);
    };

    item.ondragover = e => e.preventDefault();

    // ドロップ時の入れ替え処理
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
        render();
      }
    };

    // ドラッグ終了（ドロップの成否に関わらず実行）
    item.ondragend = () => {
      item.classList.remove('dragging');
      // 入れ替えモード（揺れ）を解除
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
        // 並び順データのみを削除（非表示設定 hiddenAppIds は維持）
        await chrome.storage.local.remove('appOrder');
        
        // メモリ上の変数を初期化して再描画
        currentApps = [...DEFAULT_APPS];
        render();
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