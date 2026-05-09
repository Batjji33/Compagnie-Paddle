document.addEventListener('DOMContentLoaded', () => {
    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            // Close other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('i').classList.replace('ph-minus', 'ph-plus');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
            const icon = item.querySelector('i');
            if (item.classList.contains('active')) {
                icon.classList.replace('ph-plus', 'ph-minus');
            } else {
                icon.classList.replace('ph-minus', 'ph-plus');
            }
        });
    });

    // Mobile Navbar Hamburger Logic
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelector('.navbar-links');
    
    // Only inject on standard pages with navLinks, not admin panels
    if (navbar && navLinks && !document.querySelector('.hamburger')) {
        const hamburger = document.createElement('div');
        hamburger.className = 'hamburger';
        hamburger.innerHTML = '<i class="ph ph-list" style="font-size: 2rem; color: var(--white); cursor: pointer;"></i>';
        
        // Ensure hamburger goes before links but after logo
        navbar.insertBefore(hamburger, navLinks);
        
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = hamburger.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.replace('ph-list', 'ph-x');
            } else {
                icon.classList.replace('ph-x', 'ph-list');
            }
        });
    }
});
