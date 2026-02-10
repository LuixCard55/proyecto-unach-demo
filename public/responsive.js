// Script para hacer el sitio responsive en móvil/tablet
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const body = document.body;
    
    // Crear overlay oscuro
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        body.appendChild(overlay);
    }
    
    // Si no existe el botón hamburguesa, lo creamos
    let menuToggle = document.querySelector('.menu-toggle');
    if (!menuToggle) {
        menuToggle = document.createElement('button');
        menuToggle.className = 'btn btn-primary menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        menuToggle.setAttribute('aria-label', 'Menú');
        menuToggle.type = 'button';
        body.appendChild(menuToggle);
    }
    
    // Función para abrir el menú
    function openMenu() {
        if (sidebar) {
            sidebar.classList.add('show');
            overlay.classList.add('show');
            body.style.overflow = 'hidden'; // Prevenir scroll
        }
    }
    
    // Función para cerrar el menú
    function closeMenu() {
        if (sidebar) {
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
            body.style.overflow = ''; // Restaurar scroll
        }
    }
    
    // Toggle del menú al hacer clic
    menuToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (sidebar && sidebar.classList.contains('show')) {
            closeMenu();
        } else {
            openMenu();
        }
    });
    
    // Cerrar menú al hacer clic en el overlay
    overlay.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
    });
    
    // Cerrar menú al hacer clic en un enlace (solo en móvil)
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // No prevenir el comportamiento del enlace
            if (window.innerWidth <= 768) {
                closeMenu();
            }
        });
    });
    
    // Cerrar menú al hacer clic fuera del sidebar (excepto en el overlay que ya lo cierra)
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('show')) {
            // Si el click no es en el sidebar, menú toggle, ni overlay
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && !overlay.contains(e.target)) {
                closeMenu();
            }
        }
    });
    
    // Ajustar en resize de ventana
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            closeMenu();
        }
    });
    
    // Prevenir scroll cuando el menú está abierto
    overlay.addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, { passive: false });
});

