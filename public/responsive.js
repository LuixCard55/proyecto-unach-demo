// Script para hacer el sitio responsive en móvil/tablet
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    // Si no existe el botón hamburguesa, lo creamos
    let menuToggle = document.querySelector('.menu-toggle');
    if (!menuToggle) {
        menuToggle = document.createElement('button');
        menuToggle.className = 'btn btn-primary menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        menuToggle.setAttribute('aria-label', 'Menú');
        document.body.appendChild(menuToggle);
    }
    
    // Toggle del menú al hacer clic
    menuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        if (sidebar) {
            sidebar.classList.toggle('show');
            mainContent.classList.toggle('shift');
        }
    });
    
    // Cerrar menú al hacer clic en un enlace
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('show');
                mainContent.classList.remove('shift');
            }
        });
    });
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (sidebar && sidebar.classList.contains('show')) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('show');
                mainContent.classList.remove('shift');
            }
        }
    });
    
    // Ajustar en resize de ventana
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            if (sidebar) sidebar.classList.remove('show');
            if (mainContent) mainContent.classList.remove('shift');
        }
    });
});
