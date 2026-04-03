/**
 * default_apps.json から全アプリケーションのマスターリストを読み込む
 */
let DEFAULT_APPS = [];

const container = document.getElementById('app-list');
const statusMsg = document.getElementById('save-status');

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
 * 初期化：JSON から DEFAULT_APPS を読み込み、設定に基づいてリストを生成
 */
async function init() {
  // 1. JSON ファイルから DEFAULT_APPS を読み込む
  try {
    const response = await fetch('default_apps.json');
    if (!response.ok) throw new Error('Failed to load default_apps.json');
    DEFAULT_APPS = await response.json();
  } catch (e) {
    console.error("Error loading default_apps.json:", e);
    return;
  }

  // 2. ストレージから設定を取得し、初期描画を行う
  if (typeof chrome !== 'undefined' && chrome.storage) {
    const result = await chrome.storage.local.get(['hiddenAppIds', 'iconStyle', 'iconSize']);
    const hiddenIds = result.hiddenAppIds || [];
    const currentStyle = result.iconStyle || 'origin';
    const currentSize = result.iconSize || 'small';

    // スタイル選択セレクトボックスの初期化
    const styleSelect = document.getElementById('icon-style-select');
    if (styleSelect) {
      styleSelect.value = currentStyle;
      styleSelect.addEventListener('change', async (e) => {
        const newStyle = e.target.value;
        const size = document.getElementById('icon-size-select').value;
        await chrome.storage.local.set({ iconStyle: newStyle });
        showNotification();
        renderList(hiddenIds, newStyle, size);
      });
    }

    // サイズ選択セレクトボックスの初期化
    const sizeSelect = document.getElementById('icon-size-select');
    if (sizeSelect) {
      sizeSelect.value = currentSize;
      sizeSelect.addEventListener('change', async (e) => {
        const newSize = e.target.value;
        const style = document.getElementById('icon-style-select').value;
        await chrome.storage.local.set({ iconSize: newSize });
        showNotification();
        renderList(hiddenIds, style, newSize);
      });
    }

    // 初回描画
    renderList(hiddenIds, currentStyle, currentSize);
  }
}

/**
 * アプリ一覧のレンダリング処理
 */
function renderList(hiddenIds, style, size) {
  container.innerHTML = ''; // 既存のリストをクリア

  DEFAULT_APPS.forEach(app => {
    const label = document.createElement('label');
    label.className = 'app-toggle';
    
    const isChecked = !hiddenIds.includes(app.id);
    const iconUrl = getIconUrl(app, style);

    const img = document.createElement('img');
    img.src = iconUrl;
    // サイズ（small/large）に応じたクラスを付与
    img.className = `app-icon ${size}`;
    img.alt = app.name;
    img.addEventListener('error', () => {
      const dir = style === 'dot' ? 'dot-icons' : 'origin-icons';
      img.src = `statics/${dir}/sample.png`;
    });

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.id = app.id;
    input.checked = isChecked;
    input.addEventListener('change', saveSettings);

    const info = document.createElement('div');
    info.className = 'app-info';
    const name = document.createElement('span');
    name.className = 'app-name';
    name.textContent = app.name;

    info.appendChild(img);
    info.appendChild(name);

    label.appendChild(input);
    label.appendChild(info);
    container.appendChild(label);
  });
}

/**
 * 非表示に設定されたアプリIDのリストを保存
 */
async function saveSettings() {
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  const hiddenAppIds = [];
  
  checkboxes.forEach(cb => {
    if (!cb.checked) {
      hiddenAppIds.push(cb.dataset.id);
    }
  });

  if (typeof chrome !== 'undefined' && chrome.storage) {
    await chrome.storage.local.set({ hiddenAppIds });
    showNotification();
  }
}

/**
 * 保存完了通知の表示
 */
function showNotification() {
  statusMsg.classList.add('show');
  setTimeout(() => {
    statusMsg.classList.remove('show');
  }, 2000);
}

document.addEventListener('DOMContentLoaded', init);