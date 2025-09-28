document.addEventListener('DOMContentLoaded', function() {
    const burgerButton = document.querySelector('.burger-button');
    const closeButton = document.querySelector('.close-button');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');
    
    // Открытие меню
    burgerButton.addEventListener('click', function() {
        this.classList.add('active');
        this.setAttribute('aria-expanded', 'true');
        mobileMenu.classList.add('active');
        mobileMenu.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    });
    
    // Закрытие меню
    function closeMenu() {
        burgerButton.classList.remove('active');
        burgerButton.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.remove('active');
        mobileMenu.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
    
    closeButton.addEventListener('click', closeMenu);
    
    // Закрытие при клике на ссылку
    mobileLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });
    
    // Закрытие при клике вне меню
    mobileMenu.addEventListener('click', function(e) {
        if (e.target === mobileMenu) {
            closeMenu();
        }
    });
    
    // Закрытие при нажатии Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMenu();
        }
    });
});