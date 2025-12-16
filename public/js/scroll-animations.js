// Scroll-triggered animations for content blocks

const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.15
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe blocks 2-5 after DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.body?.dataset.page !== 'home') return;

  const blocks = document.querySelectorAll('.block-2, .block-3, .block-4, .block-5');
  blocks.forEach(block => observer.observe(block));
  
  // Header and clock: show/fix when hero is scrolled past
  const hero = document.querySelector('.hero-section');
  const header = document.querySelector('.site-header');
  const clock = document.querySelector('.clock-container');
  
  if (hero && (header || clock)) {
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // when hero is NOT intersecting (scrolled past), fix header+clock
        if (!entry.isIntersecting) {
          if (header) header.classList.add('fixed');
          if (clock) clock.classList.add('fixed');
        } else {
          if (header) header.classList.remove('fixed');
          if (clock) clock.classList.remove('fixed');
        }
      });
    }, { root: null, threshold: 0 });

    heroObserver.observe(hero);
  }
});
