const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '85c3MP%mR6#z&2';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Файлы для хранения данных
const CLICKS_FILE = path.join(__dirname, 'data', 'clicks.json');
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');

// Создаем папку data если её нет
async function initializeFiles() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        
        try {
            await fs.access(CLICKS_FILE);
            // Проверяем, что файл не пустой и валидный JSON
            const clicksContent = await fs.readFile(CLICKS_FILE, 'utf8');
            if (!clicksContent.trim()) {
                throw new Error('File is empty');
            }
            JSON.parse(clicksContent); // Проверяем что JSON валидный
        } catch {
            await fs.writeFile(CLICKS_FILE, JSON.stringify({ 
                clicks: [],
                totalClicks: 0 
            }, null, 2));
            console.log('Файл clicks.json создан/пересоздан');
        }
        
        try {
            await fs.access(ORDERS_FILE);
            // Проверяем, что файл не пустой и валидный JSON
            const ordersContent = await fs.readFile(ORDERS_FILE, 'utf8');
            if (!ordersContent.trim()) {
                throw new Error('File is empty');
            }
            JSON.parse(ordersContent); // Проверяем что JSON валидный
        } catch {
            await fs.writeFile(ORDERS_FILE, JSON.stringify([], null, 2));
            console.log('Файл orders.json создан/пересоздан');
        }
    } catch (error) {
        console.error('Error initializing files:', error);
    }
}

// Функция для получения локальных IP-адресов
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    
    Object.keys(interfaces).forEach(iface => {
        interfaces[iface].forEach(address => {
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);
            }
        });
    });
    
    return addresses;
}

// Функция для определения браузера из userAgent
function parseBrowser(userAgent) {
    if (userAgent.includes('YaBrowser')) {
        return 'Yandex Browser';
    } else if (userAgent.includes('Chrome')) {
        return 'Chrome';
    } else if (userAgent.includes('Firefox')) {
        return 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        return 'Safari';
    } else if (userAgent.includes('Edge')) {
        return 'Edge';
    } else if (userAgent.includes('Opera')) {
        return 'Opera';
    } else {
        return 'Unknown Browser';
    }
}

// Функция для определения устройства
function parseDevice(userAgent) {
    if (userAgent.includes('iPad')) {
        return 'iPad';
    } else if (userAgent.includes('iPhone')) {
        return 'iPhone';
    } else if (userAgent.includes('Android')) {
        return 'Android';
    } else if (userAgent.includes('Windows')) {
        return 'Windows';
    } else if (userAgent.includes('Macintosh')) {
        return 'Mac';
    } else {
        return 'Unknown Device';
    }
}

// Функция для форматирования даты в формат "ЧЧ:ММ ДД.ММ.ГГ"
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    
    // Московское время (UTC+3)
    const moscowOffset = 3 * 60; // 3 часа в минутах
    const localOffset = date.getTimezoneOffset(); // Смещение локальной зоны в минутах
    const moscowTime = new Date(date.getTime() + (moscowOffset + localOffset) * 60000);
    
    const hours = moscowTime.getHours().toString().padStart(2, '0');
    const minutes = moscowTime.getMinutes().toString().padStart(2, '0');
    const day = moscowTime.getDate().toString().padStart(2, '0');
    const month = (moscowTime.getMonth() + 1).toString().padStart(2, '0');
    const year = moscowTime.getFullYear();
    
    return `${hours}:${minutes} ${day}.${month}.${year}`;
}

// Функция для безопасного чтения JSON файлов
async function readJSONFile(filePath, defaultValue) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        if (!content.trim()) {
            return defaultValue;
        }
        return JSON.parse(content);
    } catch (error) {
        console.log(`Файл ${filePath} поврежден или пустой, возвращаем значение по умолчанию`);
        return defaultValue;
    }
}

// Функция для проверки уникальности клика по IP
function isUniqueClick(clicksData, clientId, type = null) {
    return !clicksData.clicks.some(click => {
        if (type) {
            return click.clientId === clientId && click.type === type;
        }
        return click.clientId === clientId;
    });
}

function requireAdminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    const token = authHeader.substring(7); // Убираем "Bearer "
    
    if (token === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Неверный токен доступа' });
    }
}

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/main_page', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin_page', 'admin.html'));
});

// Обработчик предзаказов с проверкой уникальности только по IP
app.post('/api/preorder', async (req, res) => {
    try {
        const orderData = req.body;

        // Парсим браузер и устройство
        const browser = parseBrowser(orderData.userAgent);
        const device = parseDevice(orderData.userAgent);

        // Форматируем timestamp
        const formattedTimestamp = formatTimestamp(orderData.timestamp);

        // Безопасно читаем текущие данные
        const clicksData = await readJSONFile(CLICKS_FILE, { 
            clicks: [],
            totalClicks: 0 
        });
        const ordersData = await readJSONFile(ORDERS_FILE, []);

        // Проверка: есть ли уже клик с этого IP (любой)
        const alreadyClicked = clicksData.clicks.some(click => click.clientId === orderData.clientId);

        const isUniqueEmail = !ordersData.some(order => order.email === orderData.email);

        // Если IP ещё не кликал — тогда добавляем кликw
        if (!alreadyClicked) {
                clicksData.totalClicks++;
                const clickRecord = {
                    type: 'form',
                    browser: browser,
                    device: device,
                    clientId: orderData.clientId,
                    timestamp: orderData.timestamp
                };
                clicksData.clicks.push(clickRecord);
            }

        if (!isUniqueEmail) {
            return res.status(400).json({ 
                success: false, 
                error: 'Форма уже была отправлена с этого email-адреса' 
            });
        }
        const clickRecord = {
            ip: orderData.ip,
            type: 'form',
            browser: browser,
            device: device,
            clientId: orderData.clientId,
            timestamp: orderData.timestamp
        };
        clicksData.clicks.push(clickRecord);

        // Добавляем заказ
        const orderRecord = {
            name: orderData.name,
            email: orderData.email,
            info: orderData.info,
            timestamp: formattedTimestamp,
            ip: orderData.ip,
            browser: browser,
            device: device,
            id: Date.now(),
            clientId: orderData.clientId,
            clickId: clicksData.clicks.length - 1
        };
        ordersData.push(orderRecord);

        // Сохраняем данные
        await fs.writeFile(CLICKS_FILE, JSON.stringify(clicksData, null, 2));
        await fs.writeFile(ORDERS_FILE, JSON.stringify(ordersData, null, 2));

        console.log('Новый заказ:', {
            name: orderData.name,
            browser: browser,
            device: device,
            ip: orderData.ip,
            clientId: orderData.clientId,
            timestamp: formattedTimestamp
        });

        res.json({ 
            success: true, 
            totalClicks: clicksData.totalClicks,
            totalOrders: ordersData.length,
            orderId: Date.now(),
            browser: browser,
            device: device,
            timestamp: formattedTimestamp
        });

    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});


app.post('/api/track-click', async (req, res) => {
    try {
        const clickData = req.body;
        
        // Безопасно читаем текущие данные
        const clicksData = await readJSONFile(CLICKS_FILE, { 
            clicks: [],
            totalClicks: 0 
        });
        
        // ПРОВЕРКА УНИКАЛЬНОСТИ ТОЛЬКО ПО IP (для якорной ссылки)
        const isUnique = isUniqueClick(clicksData, clickData.clientId, 'anchor');

        if (isUnique) {
            clicksData.totalClicks++;
            const clickRecord = {
                clientId: clickData.clientId,
                type: clickData.type,
                source: clickData.source,
                timestamp: clickData.timestamp,
                userAgent: clickData.userAgent
            };
            clicksData.clicks.push(clickRecord);
        }
        
        // Сохраняем данные
        await fs.writeFile(CLICKS_FILE, JSON.stringify(clicksData, null, 2));
        
        console.log('Новый клик по ссылке:', {
            type: clickData.type,
            ip: clickData.ip,
            isUnique: isUnique,
            source: clickData.source
        });
        
        res.json({ 
            success: true, 
            totalClicks: clicksData.totalClicks, 
            isUnique: isUnique
        });
        
    } catch (error) {
        console.error('Error tracking click:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Роут для просмотра статистики с детализацией
app.get('/api/stats', requireAdminAuth, async (req, res) => {
    try {
        // Безопасно читаем данные
        const clicksData = await readJSONFile(CLICKS_FILE, { 
            clicks: [],
            totalClicks: 0 
        });
        const ordersData = await readJSONFile(ORDERS_FILE, []);
        
        // Статистика по браузерам
        const browserStats = {};
        clicksData.clicks.forEach(click => {
            if (click.browser) {
                browserStats[click.browser] = (browserStats[click.browser] || 0) + 1;
            }
        });
        
        // Статистика по устройствам
        const deviceStats = {};
        clicksData.clicks.forEach(click => {
            if (click.device) {
                deviceStats[click.device] = (deviceStats[click.device] || 0) + 1;
            }
        });
        
        // Форматируем последние клики
        const lastClicks = clicksData.clicks.slice(-5).reverse().map(click => ({
            ...click,
            timestamp: click.formattedTimestamp || formatTimestamp(click.timestamp)
        }));
        
        res.json({
            totalClicks: clicksData.totalClicks,
            totalOrders: ordersData.length,
            conversionRate: clicksData.totalClicks > 0 ? 
                ((ordersData.length / clicksData.totalClicks) * 100).toFixed(2) + '%' : '0%',
            browsers: browserStats,
            devices: deviceStats,
            lastClicks: lastClicks
        });
    } catch (error) {
        res.status(500).json({ error: 'Error reading statistics' });
    }
});

// Роут для просмотра всех заказов
app.get('/api/orders', requireAdminAuth, async (req, res) => {
    try {
        const ordersData = await readJSONFile(ORDERS_FILE, []);
        
        // Возвращаем заказы как есть (уже с форматированным timestamp)
        res.json(ordersData.reverse()); // Новые заказы первыми
    } catch (error) {
        res.status(500).json({ error: 'Error reading orders' });
    }
});

// Запуск сервера
initializeFiles().then(() => {
    const HOST = '0.0.0.0';
    
    app.listen(PORT, HOST, () => {
        const localIPs = getLocalIP();
        console.log(`=== Сервер запущен ===`);
        console.log(`Локальный доступ: http://localhost:${PORT}`);
        console.log(`Доступ в локальной сети:`);
        localIPs.forEach(ip => {
            console.log(`  http://${ip}:${PORT}`);
        });
        console.log(`======================`);
    });
});