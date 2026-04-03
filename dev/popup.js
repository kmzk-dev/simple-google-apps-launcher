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
  // default_apps.json の icon フィールドがファイル名のみであることを前提とする
  const fileName = app.icon || 'sample.png';
  return `statics/${dir}/${fileName}`;
}

/**
 * 初期化
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

  // デフォルト値の設定
  let iconStyle = 'origin';
  let iconSize = 'small';

  // 2. ストレージから「並び順」「非表示リスト」「スタイル」「サイズ」を取得
  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      const result = await chrome.storage.local.get(['appOrder', 'hiddenAppIds', 'iconStyle', 'iconSize']);
      
      if (result.iconStyle) iconStyle = result.iconStyle;
      if (result.iconSize) iconSize = result.iconSize;
      if (result.hiddenAppIds) hiddenAppIds = result.hiddenAppIds;

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

  // 3. body にサイズクラスを付与（CSSでbodyの幅を切り替えるため）
  document.body.className = iconSize;

  // 4. 描画
  render(iconStyle, iconSize);
  addResetListener();
}

/**
 * 描画処理
 */
function render(style, size) {
  grid.innerHTML = '';
  
  // 非表示リストに含まれないアプリのみを表示
  const visibleApps = currentApps.filter(app => !hiddenAppIds.includes(app.id));

  visibleApps.forEach((app, index) => {
    const item = document.createElement('div');
    item.className = 'app-item';
    item.draggable = true;
    item.dataset.index = index;
    item.dataset.id = app.id;

    const icon = document.createElement('img');
    // アイコンにサイズクラス（small/large）を付与
    icon.className = `app-icon ${size}`;
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

    // クリックイベント：URLを開く
    item.onclick = () => {
      if (item.classList.contains('dragging')) return;
      chrome.tabs.create({ url: app.url });
    };

    // ドラッグ開始
    item.ondragstart = () => {
      draggedItem = item;
      grid.classList.add('dragging-mode');
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
        // 再描画時もスタイルとサイズを維持
        render(style, size);
      }
    };

    // ドラッグ終了
    item.ondragend = () => {
      item.classList.remove('dragging');
      grid.classList.remove('dragging-mode');
      draggedItem = null;
    };

    grid.appendChild(item);
  });
}

/**
 * リセットボタンのリスナー設定
 */
function addResetListener() {
  const resetBtn = document.getElementById('reset-button');
  if (!resetBtn) return;

  resetBtn.onclick = async () => {
    if (confirm('アイコンの並び順を初期状態に戻しますか？')) {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // 並び順データのみを削除
        await chrome.storage.local.remove('appOrder');
        
        // 現在の設定値を再取得して描画
        const result = await chrome.storage.local.get(['iconStyle', 'iconSize']);
        currentApps = [...DEFAULT_APPS];
        render(result.iconStyle || 'origin', result.iconSize || 'small');
      }
    }
  };
}

/**
 * 並び順をストレージに保存
 */
function saveOrder() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ appOrder: currentApps.map(a => a.id) });
  }
}

// 実行開始
init();