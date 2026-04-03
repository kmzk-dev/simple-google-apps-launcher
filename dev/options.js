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
  } catch (e) {
    console.error("Error loading default_apps.json:", e);
    return;
  }

  if (typeof chrome !== 'undefined' && chrome.storage) {
    const result = await chrome.storage.local.get(['hiddenAppIds', 'iconStyle']);
    const hiddenIds = result.hiddenAppIds || [];
    const currentStyle = result.iconStyle || 'origin';

    // スタイル選択セレクトボックスの初期化
    const styleSelect = document.getElementById('icon-style-select');
    if (styleSelect) {
      styleSelect.value = currentStyle;
      styleSelect.addEventListener('change', async (e) => {
        const newStyle = e.target.value;
        await chrome.storage.local.set({ iconStyle: newStyle });
        showNotification();
        // スタイル変更時に再描画を実行
        renderList(hiddenIds, newStyle);
      });
    }

    // 初回描画
    renderList(hiddenIds, currentStyle);
  }
}

/**
 * アプリ一覧のレンダリング処理
 */
function renderList(hiddenIds, style) {
  container.innerHTML = ''; // 既存のリストをクリア

  DEFAULT_APPS.forEach(app => {
    const label = document.createElement('label');
    label.className = 'app-toggle';
    
    const isChecked = !hiddenIds.includes(app.id);
    const iconUrl = getIconUrl(app, style); // 現在のスタイルを適用

    const img = document.createElement('img');
    img.src = iconUrl;
    img.className = 'app-icon';
    img.alt = app.name;
    img.addEventListener('error', () => {
      // エラー時も現在のスタイルに合わせたサンプル画像を表示
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
 * 設定（非表示リスト）を保存
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
 * 保存完了通知
 */
function showNotification() {
  statusMsg.classList.add('show');
  setTimeout(() => {
    statusMsg.classList.remove('show');
  }, 2000);
}

document.addEventListener('DOMContentLoaded', init);