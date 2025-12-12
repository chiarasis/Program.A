// Rolodex-style 3D rotation controlled by scroll
// Smooth rotation around horizontal axis - adapted for Program.A

let rolodex;
let cards = [];
let detailsElements = [];
let currentIndex = 0;
let targetRotation = 0;
let currentRotation = 0;
let cardCount = 0;
const scrollSensitivity = 1.5;

function init() {
  rolodex = document.getElementById('rolodex');
  if (!rolodex) return;

  cards = Array.from(document.querySelectorAll('.card'));
  detailsElements = Array.from(document.querySelectorAll('.opera-details'));
  
  cardCount = cards.length;
  const anglePerCard = 360 / cardCount;

  // Position cards in 3D space - attached from center like rolodex
  cards.forEach((card, index) => {
    const angle = anglePerCard * index;
    
    card.style.transformOrigin = 'center center';
    card.style.transform = `
      rotateX(${angle}deg) 
      translateZ(600px)
    `;
  });

  // Show first card details and set initial visibility
  updateActiveDetails(0);
  updateCardsVisibility(anglePerCard);

  // Handle scroll with requestAnimationFrame for smooth performance
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScroll(anglePerCard);
        ticking = false;
      });
      ticking = true;
    }
  });

  // Smooth animation loop
  animate(anglePerCard);
}

function handleScroll(anglePerCard) {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  const scrollProgress = Math.min(scrollTop / maxScroll, 1);

  // Scroll DOWN rotates cards UP (negative rotation)
  targetRotation = -scrollProgress * 360 * ((cardCount - 1) / cardCount);

  // Calculate which card should be active (facing forward at 0 degrees)
  const activeIndex = Math.round(Math.abs(targetRotation) / anglePerCard) % cardCount;
  
  if (activeIndex !== currentIndex) {
    currentIndex = activeIndex;
    updateActiveDetails(currentIndex);
  }
}

function animate(anglePerCard) {
  // Smooth lerp for rotation
  const diff = targetRotation - currentRotation;
  currentRotation += diff * 0.1; // Smooth damping

  // Apply rotation to rolodex
  if (rolodex) {
    rolodex.style.transform = `rotateX(${-currentRotation}deg)`;
  }

  // Update card opacity and z-index based on current rotation
  updateCardsVisibility(anglePerCard);

  requestAnimationFrame(() => animate(anglePerCard));
}

function updateCardsVisibility(anglePerCard) {
  cards.forEach((card, index) => {
    const cardAngle = anglePerCard * index;
    // Calculate the card's current angle relative to viewer
    const currentCardAngle = ((cardAngle - currentRotation) % 360 + 360) % 360;
    
    // Card facing forward is at 0 degrees (or 360)
    // Normalize to -180 to 180 range
    let normalizedAngle = currentCardAngle;
    if (normalizedAngle > 180) normalizedAngle -= 360;
    
    const absAngle = Math.abs(normalizedAngle);
    
    // Set opacity and z-index based on angle - only one card visible at a time
    let opacity;
    if (absAngle < anglePerCard * 0.4) {
      // Card is facing forward - fully visible at 100%
      opacity = 1;
      card.style.zIndex = 100;
      card.style.pointerEvents = 'auto';
    } else {
      // All other cards - completely hidden
      opacity = 0;
      card.style.zIndex = 0;
      card.style.pointerEvents = 'none';
    }
    
    card.style.opacity = opacity;
    card.style.transition = 'opacity 0.25s ease';
  });
}

function updateActiveDetails(index) {
  detailsElements.forEach((el, i) => {
    if (i === index) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
