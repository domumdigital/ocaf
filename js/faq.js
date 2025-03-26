// FAQ Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const faqItems = document.querySelectorAll('.faq-item h3');
    
    faqItems.forEach(item => {
        item.addEventListener('click', function() {
            const parent = this.parentNode;
            
            // Toggle active class
            parent.classList.toggle('active');
            
            // Close other items
            faqItems.forEach(otherItem => {
                if (otherItem !== this) {
                    otherItem.parentNode.classList.remove('active');
                }
            });
        });
    });
    
    // Open the first FAQ item by default
    if (faqItems.length > 0) {
        faqItems[0].parentNode.classList.add('active');
    }
});
