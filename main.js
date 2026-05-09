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
});
