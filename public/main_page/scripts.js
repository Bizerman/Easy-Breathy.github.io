// Выносим функции наружу
async function getIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'unknown';
    }
}
function generateUUID() {
    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // fallback: простая реализация UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getClientId() {
    let clientId = document.cookie.split('; ').find(row => row.startsWith('clientId='));
    if (clientId) {
        return clientId.split('=')[1];
    } else {
        const newId = generateUUID();
        document.cookie = `clientId=${newId}; path=/; max-age=${60*60*24*365}`; // хранится 1 год
        return newId;
    }
}


async function trackClick(clickType = 'anchor') {
    try {
        const clickData = {
            type: clickType,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ip: await getIP(),
            clientId: await getClientId(),
            source: 'anchor_link'
        };
        
        const response = await fetch('/api/track-click', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(clickData)
        });
        
        const result = await response.json();
        console.log('Клик зарегистрирован:', result);
        
    } catch (error) {
        console.error('Error tracking click:', error);
    }
}

function updateStats(data) {
    const totalClicksEl = document.getElementById('totalClicks');
    const totalOrdersEl = document.getElementById('totalOrders');
    
    if (totalClicksEl) totalClicksEl.textContent = data.totalClicks;
    if (totalOrdersEl) totalOrdersEl.textContent = data.totalOrders;
}

// Загрузка статистики при загрузке страницы
window.addEventListener('load', async () => {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        updateStats(stats);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
});

// Ждем полной загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    const policyCheckbox = document.getElementById('policyCheckbox');
    const submitBtn = document.getElementById('submitBtn');
    const preorderForm = document.getElementById('preorderForm');
    const anchorLink = document.querySelector('a[href="#preorder"]');
    
    // Проверяем что элементы существуют
    if (!policyCheckbox || !submitBtn || !preorderForm) {
        console.error('Не найдены необходимые элементы DOM');
        return;
    }
    
    console.log('Элементы найдены, настраиваем обработчики...');
    

    if (anchorLink) {
        console.log('Якорная ссылка найдена, добавляем обработчик:', anchorLink);
        
        anchorLink.addEventListener('click', async function(e) {
            e.preventDefault();
            
            try {
                console.log('Отслеживаем клик...');
                await trackClick('anchor');
                console.log('Клик отслежен');
                const formElement = document.getElementById('preorderForm');
                if (formElement) {
                    formElement.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                } else {
                    console.error('Форма не найдена для прокрутки');
                }
            } catch (error) {
                console.error('Ошибка в обработчике ссылки:', error);
            }
        });
        
        console.log('Обработчик для якорной ссылки настроен');
    } else {
        console.error('Якорная ссылка не найдена никаким способом');
    }
    
    // Включаем/выключаем кнопку в зависимости от чекбокса
    policyCheckbox.addEventListener('change', function() {
        console.log('Чекбокс изменен:', this.checked);
        submitBtn.disabled = !this.checked;
    });
    
    // Изначально кнопка disabled
    submitBtn.disabled = true;

    // Обработчик отправки формы
    preorderForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Форма отправляется...');
        
        const submitBtn = document.getElementById('submitBtn');
        const policyCheckbox = document.getElementById('policyCheckbox');
        
        // Дополнительная проверка на случай если браузерная валидация не сработала
        if (!policyCheckbox.checked) {
            alert('Пожалуйста, согласитесь с политикой конфиденциальности');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';
        
        try {
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                info: document.getElementById('info').value,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                ip: await getIP(),
                clientId: getClientId() 
            };
            
            console.log('Отправляем данные:', formData);
            
            const response = await fetch('/api/preorder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            console.log('Ответ сервера:', result);
            
            if (result.success) {
                alert('Предзаказ успешно оформлен! ID: ' + result.orderId);
                updateStats(result);
                this.reset();
                // Сбрасываем чекбокс после успешной отправки
                policyCheckbox.checked = false;
                // Кнопка снова становится disabled
                submitBtn.disabled = true;
            } else {
                // Обрабатываем ошибку "форма уже отправлена"
                if (result.error && result.error.includes('уже была отправлена')) {
                    alert('Вы уже отправляли форму с этого устройства. Форма может быть отправлена только один раз.');
                    // После ошибки тоже блокируем кнопку
                    submitBtn.disabled = true;
                    policyCheckbox.checked = false;
                } else {
                    alert('Ошибка при отправке формы: ' + (result.error || 'Неизвестная ошибка'));
                    // Включаем кнопку обратно при других ошибках
                    submitBtn.disabled = !policyCheckbox.checked;
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Ошибка при отправке формы: ' + error.message);
            // Включаем кнопку обратно при ошибках сети
            submitBtn.disabled = !policyCheckbox.checked;
        } finally {
            submitBtn.textContent = 'Предзаказ';
        }
    });
    
    console.log('Обработчики настроены');
});