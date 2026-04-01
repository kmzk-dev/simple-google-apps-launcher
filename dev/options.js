/**
 * default_apps.json から全アプリケーションのマスターリストを読み込む
 */
//TODO: 読み取り用のJSONにLooker等を追加する
let DEFAULT_APPS = [];

const container = document.getElementById('app-list');
const statusMsg = document.getElementById('save-status');

function getIconUrl(app) {
  return app.icon || 'statics/icons/sample.png';
}

/**
 * 初期化：JSON から DEFAULT_APPS を読み込み、チェックボックスリストを生成
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

  // 2. ストレージから非表示設定を取得し、チェックボックスリストを生成
  if (typeof chrome !== 'undefined' && chrome.storage) {
    const result = await chrome.storage.local.get(['hiddenAppIds']);
    const hiddenIds = result.hiddenAppIds || [];

    DEFAULT_APPS.forEach(app => {
      const label = document.createElement('label');
      label.className = 'app-toggle';
      
      const isChecked = !hiddenIds.includes(app.id);
      const iconUrl = getIconUrl(app);

      const img = document.createElement('img');
      img.src = iconUrl;
      img.className = 'app-icon';
      img.alt = app.name;
      img.addEventListener('error', () => {
        img.src = 'statics/icons/sample.png';
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

      // 状態変更時に即座にストレージへ保存
      label.querySelector('input').addEventListener('change', saveSettings);
      container.appendChild(label);
    });
  }
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