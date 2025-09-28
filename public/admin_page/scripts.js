// Проверяем сохраненный токен при загрузке страницы
        let authToken = localStorage.getItem('adminAuthToken') || '';
        
        // Автоматически входим если токен есть
        window.addEventListener('load', function() {
            if (authToken) {
                checkAuthAndLoadData();
            }
        });
        
        async function checkAuthAndLoadData() {
            try {
                const response = await fetch('/api/stats', {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                
                if (response.ok) {
                    // Успешная авторизация
                    document.getElementById('loginSection').style.display = 'none';
                    document.getElementById('adminPanel').style.display = 'block';
                    loadStats();
                    loadOrders();
                } else {
                    // Токен невалидный
                    localStorage.removeItem('adminAuthToken');
                    authToken = '';
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('adminAuthToken');
                authToken = '';
            }
        }
        
        async function login() {
            const password = document.getElementById('passwordInput').value;
            if (!password) {
                alert('Введите пароль');
                return;
            }
            
            authToken = password;
            
            try {
                const response = await fetch('/api/stats', {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                
                if (response.ok) {
                    // Сохраняем токен в localStorage
                    localStorage.setItem('adminAuthToken', authToken);
                    document.getElementById('loginSection').style.display = 'none';
                    document.getElementById('adminPanel').style.display = 'block';
                    loadStats();
                    loadOrders();
                } else {
                    alert('Неверный пароль');
                    localStorage.removeItem('adminAuthToken');
                    authToken = '';
                }
            } catch (error) {
                alert('Ошибка подключения');
                localStorage.removeItem('adminAuthToken');
                authToken = '';
            }
        }
        
        function logout() {
            authToken = '';
            localStorage.removeItem('adminAuthToken');
            document.getElementById('loginSection').style.display = 'block';
            document.getElementById('adminPanel').style.display = 'none';
            document.getElementById('passwordInput').value = '';
        }
        
        async function loadStats() {
            try {
                const response = await fetch('/api/stats', {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                const stats = await response.json();
                
                document.getElementById('stats').innerHTML = `
                    <p><strong>Всего кликов:</strong> ${stats.totalClicks}</p>
                    <p><strong>Всего заказов:</strong> ${stats.totalOrders}</p>
                    <p><strong>Конверсия:</strong> ${stats.conversionRate}</p>
                    ${stats.browsers ? `<p><strong>Браузеры:</strong> ${Object.entries(stats.browsers).map(([browser, count]) => `${browser}: ${count}`).join(', ')}</p>` : ''}
                    ${stats.devices ? `<p><strong>Устройства:</strong> ${Object.entries(stats.devices).map(([device, count]) => `${device}: ${count}`).join(', ')}</p>` : ''}
                `;
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }
        
        async function loadOrders() {
            try {
                const response = await fetch('/api/orders', {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                const orders = await response.json();
                
                if (orders.length === 0) {
                    document.getElementById('orders').innerHTML = '<p>Нет заказов</p>';
                    return;
                }
                
                const ordersHTML = `
                    <table>
                        <thead>
                            <tr>
                                <th>Имя</th>
                                <th>Email</th>
                                <th>Откуда узнали</th>
                                <th>Время</th>
                                <th>IP</th>
                                <th>Браузер</th>
                                <th>Устройство</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.map(order => `
                                <tr>
                                    <td>${order.name}</td>
                                    <td>${order.email}</td>
                                    <td>${order.info}</td>
                                    <td>${order.timestamp}</td>
                                    <td>${order.ip}</td>
                                    <td>${order.browser}</td>
                                    <td>${order.device}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
                
                document.getElementById('orders').innerHTML = ordersHTML;
            } catch (error) {
                console.error('Error loading orders:', error);
            }
        }