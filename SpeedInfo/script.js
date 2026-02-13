// Состояние
let isTesting = false;
let user = null;

// Элементы DOM
const userBlock = document.getElementById('userBlock');
const startBtn = document.getElementById('startTestBtn');
const speedDisplay = document.getElementById('speedDisplay');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const testStage = document.getElementById('testStage');

const ipEl = document.getElementById('ip');
const browserEl = document.getElementById('browser');
const osEl = document.getElementById('os');
const regionEl = document.getElementById('region');

// Функция для получения информации о браузере и ОС
function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Неизвестно';
    let os = 'Неизвестно';

    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'Internet Explorer';

    if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
    else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
    else if (ua.includes('Mac OS X')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return { browser, os };
}

// Загрузка информации об IP и регионе
async function loadIpInfo() {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        ipEl.textContent = data.ip;
        regionEl.textContent = data.city ? `${data.city}, ${data.country_name}` : '—';
    } catch (e) {
        ipEl.textContent = 'Не удалось определить';
        regionEl.textContent = '—';
    }
}

// Загрузка пользователя (если авторизован)
async function loadUser() {
    try {
        const res = await fetch('/api/user');
        user = await res.json();
        renderUserBlock();
    } catch (e) {
        console.error('Ошибка загрузки пользователя', e);
    }
}

function renderUserBlock() {
    if (user) {
        userBlock.innerHTML = `
            <span>${user.name}</span>
            <img src="${user.avatar}" alt="avatar" class="user-avatar">
            <a href="/logout" class="btn btn-outline">Выйти</a>
        `;
    } else {
        userBlock.innerHTML = `<a href="/auth/google" class="btn btn-primary">Войти через Google</a>`;
    }
}

// Тест скорости
async function runSpeedTest() {
    if (isTesting) return;
    isTesting = true;
    startBtn.disabled = true;
    progressContainer.style.display = 'block';
    setProgress(0);
    testStage.textContent = 'Измерение задержки (ping)...';

    // 1. Ping (задержка) – несколько HEAD-запросов
    const pingSamples = [];
    for (let i = 0; i < 5; i++) {
        const start = performance.now();
        try {
            await fetch('/api/speedtest/ping', { method: 'HEAD', cache: 'no-store' });
            const end = performance.now();
            pingSamples.push(end - start);
        } catch (e) {
            pingSamples.push(null);
        }
    }
    const validPings = pingSamples.filter(p => p !== null);
    const avgPing = validPings.length ? Math.round(validPings.reduce((a,b) => a + b, 0) / validPings.length) : null;

    setProgress(20);
    testStage.textContent = 'Измерение входящей скорости (download)...';

    // 2. Download
    const downloadSize = 10; // МБ
    let downloadSpeed = 0;
    try {
        const start = performance.now();
        const response = await fetch(`/api/speedtest/download?size=${downloadSize}`, { cache: 'no-store' });
        const blob = await response.blob();
        const end = performance.now();
        const durationSec = (end - start) / 1000;
        const fileSizeBits = downloadSize * 8; // Мбит
        downloadSpeed = (fileSizeBits / durationSec).toFixed(2);
    } catch (e) {
        downloadSpeed = null;
    }

    setProgress(60);
    testStage.textContent = 'Измерение исходящей скорости (upload)...';

    // 3. Upload
    const uploadSize = 5; // МБ
    let uploadSpeed = 0;
    try {
        const data = new Blob([new ArrayBuffer(uploadSize * 1024 * 1024)]);
        const formData = new FormData();
        formData.append('file', data, 'test.bin');
        const start = performance.now();
        await fetch('/api/speedtest/upload', { method: 'POST', body: formData });
        const end = performance.now();
        const durationSec = (end - start) / 1000;
        const fileSizeBits = uploadSize * 8;
        uploadSpeed = (fileSizeBits / durationSec).toFixed(2);
    } catch (e) {
        uploadSpeed = null;
    }

    setProgress(100);
    testStage.textContent = 'Тест завершён!';

    // Покажем среднюю или download-скорость (можно отобразить обе, для простоты покажем download)
    if (downloadSpeed) {
        speedDisplay.textContent = downloadSpeed;
    } else if (uploadSpeed) {
        speedDisplay.textContent = uploadSpeed;
    } else {
        speedDisplay.textContent = 'Ошибка';
    }

    // Сброс
    setTimeout(() => {
        isTesting = false;
        startBtn.disabled = false;
        progressContainer.style.display = 'none';
        testStage.textContent = '';
    }, 1000);
}

function setProgress(percent) {
    progressBar.style.width = percent + '%';
}

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
    const { browser, os } = getBrowserInfo();
    browserEl.textContent = browser;
    osEl.textContent = os;

    loadIpInfo();
    loadUser();

    startBtn.addEventListener('click', runSpeedTest);
});