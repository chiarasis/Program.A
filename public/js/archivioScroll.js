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

// Touch controls for mobile
let touchStartY = 0;
let touchCurrentY = 0;
let isTouching = false;
let touchRotation = 0;
let isMobile = false;

function init() {
  console.log('=== INIT STARTED ===');
  rolodex = document.getElementById('rolodex');
  if (!rolodex) {
    console.error('Rolodex not found!');
    return;
  }

  cards = Array.from(document.querySelectorAll('.card'));
  detailsElements = Array.from(document.querySelectorAll('.opera-details'));
  
  console.log('Found', cards.length, 'cards and', detailsElements.length, 'details');
  
  cardCount = cards.length;
  const anglePerCard = 360 / cardCount;

  // Detect mobile
  isMobile = window.innerWidth <= 1024;
  console.log('isMobile:', isMobile, 'window width:', window.innerWidth);

  // Position cards in 3D space - attached from center like rolodex
  cards.forEach((card, index) => {
    const angle = anglePerCard * index;
    
    card.style.transformOrigin = 'center center';
    card.style.transform = `
      rotateX(${angle}deg) 
      translateZ(${isMobile ? '400px' : '600px'})
    `;
  });

  // Show first card details and set initial visibility
  updateActiveDetails(0);
  updateCardsVisibility(anglePerCard);

  if (isMobile) {
    console.log('Setting up MOBILE controls');
    // Mobile: use wheel, touch and mouse drag
    setupWheelControlForMobile(anglePerCard);
    setupTouchControls(anglePerCard);
    setupMouseDragForMobile(anglePerCard);
    // Prevent page scroll on mobile
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
  } else {
    console.log('Setting up DESKTOP scroll control');
    // Desktop: use scroll
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
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 1024;
    if (wasMobile !== isMobile) {
      location.reload();
    }
  });

  // Smooth animation loop
  animate(anglePerCard);
  
  console.log('=== INIT COMPLETE ===');
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

function setupTouchControls(anglePerCard) {
  console.log('Setting up touch controls for mobile');
  
  // Attacca gli eventi al rolodex container (zona dell'immagine)
  const rolodexContainer = document.querySelector('.rolodex-container');
  
  if (!rolodexContainer) {
    console.error('Rolodex container not found for touch controls');
    return;
  }

  console.log('Touch controls attached to rolodex container');

  rolodexContainer.addEventListener('touchstart', (e) => {
    console.log('Touch start detected');
    isTouching = true;
    touchStartY = e.touches[0].clientY;
    touchCurrentY = touchStartY;
    touchRotation = targetRotation;
    
    // Previeni lo scroll della pagina
    e.preventDefault();
  }, { passive: false });

  rolodexContainer.addEventListener('touchmove', (e) => {
    if (!isTouching) return;
    
    touchCurrentY = e.touches[0].clientY;
    const deltaY = touchStartY - touchCurrentY;
    
    console.log('Touch move:', deltaY);
    
    // Swipe down = rotate cards forward (negative rotation)
    // Sensibilità aumentata per mobile
    const rotationDelta = (deltaY / window.innerHeight) * 360 * 2;
    targetRotation = touchRotation - rotationDelta;
    
    // Clamp rotation
    const minRotation = -360 * ((cardCount - 1) / cardCount);
    targetRotation = Math.max(minRotation, Math.min(0, targetRotation));
    
    // Calculate active card
    const activeIndex = Math.round(Math.abs(targetRotation) / anglePerCard) % cardCount;
    if (activeIndex !== currentIndex) {
      currentIndex = activeIndex;
      updateActiveDetails(currentIndex);
      console.log('Active card changed to:', currentIndex);
    }
    
    // Previeni lo scroll della pagina
    e.preventDefault();
  }, { passive: false });

  rolodexContainer.addEventListener('touchend', () => {
    console.log('Touch end detected');
    if (!isTouching) return;
    isTouching = false;
    
    // Snap to nearest card
    const activeIndex = Math.round(Math.abs(targetRotation) / anglePerCard) % cardCount;
    targetRotation = -activeIndex * anglePerCard;
    currentIndex = activeIndex;
    updateActiveDetails(currentIndex);
    console.log('Snapped to card:', currentIndex);
  }, { passive: true });
  
  console.log('Touch controls setup complete');
}

function setupWheelControlForMobile(anglePerCard) {
  console.log('Setting up wheel control for mobile');
  
  const rolodexContainer = document.querySelector('.rolodex-container');
  
  if (!rolodexContainer) {
    console.error('Rolodex container not found for wheel');
    return;
  }

  console.log('Wheel control attached to:', rolodexContainer);
  
  let accumulatedDelta = 0;

  rolodexContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    accumulatedDelta += e.deltaY;
    console.log('Wheel event - deltaY:', e.deltaY, 'accumulated:', accumulatedDelta);
    
    // Calculate rotation based on accumulated scroll
    const rotationDelta = (accumulatedDelta / window.innerHeight) * 360 * 0.5;
    targetRotation = -rotationDelta;
    
    // Clamp rotation
    const minRotation = -360 * ((cardCount - 1) / cardCount);
    targetRotation = Math.max(minRotation, Math.min(0, targetRotation));
    
    // Calculate active card
    const activeIndex = Math.round(Math.abs(targetRotation) / anglePerCard) % cardCount;
    if (activeIndex !== currentIndex) {
      currentIndex = activeIndex;
      updateActiveDetails(currentIndex);
      console.log('Wheel - Active card changed to:', currentIndex);
    }
  }, { passive: false });
  
  console.log('Wheel control setup complete');
}

function setupMouseDragForMobile(anglePerCard) {
  console.log('Setting up mouse drag for mobile testing');
  
  const rolodexContainer = document.querySelector('.rolodex-container');
  
  if (!rolodexContainer) {
    console.error('Rolodex container not found for mouse drag');
    return;
  }

  let isDragging = false;
  let dragStartY = 0;
  let dragRotation = 0;

  rolodexContainer.addEventListener('mousedown', (e) => {
    console.log('Mouse down detected');
    isDragging = true;
    dragStartY = e.clientY;
    dragRotation = targetRotation;
    rolodexContainer.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaY = dragStartY - e.clientY;
    console.log('Mouse drag:', deltaY);
    
    // Swipe down = rotate cards forward
    const rotationDelta = (deltaY / window.innerHeight) * 360 * 2;
    targetRotation = dragRotation - rotationDelta;
    
    // Clamp rotation
    const minRotation = -360 * ((cardCount - 1) / cardCount);
    targetRotation = Math.max(minRotation, Math.min(0, targetRotation));
    
    // Calculate active card
    const activeIndex = Math.round(Math.abs(targetRotation) / anglePerCard) % cardCount;
    if (activeIndex !== currentIndex) {
      currentIndex = activeIndex;
      updateActiveDetails(currentIndex);
      console.log('Active card changed to:', currentIndex);
    }
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    console.log('Mouse up detected');
    isDragging = false;
    rolodexContainer.style.cursor = 'grab';
    
    // Snap to nearest card
    const activeIndex = Math.round(Math.abs(targetRotation) / anglePerCard) % cardCount;
    targetRotation = -activeIndex * anglePerCard;
    currentIndex = activeIndex;
    updateActiveDetails(currentIndex);
    console.log('Snapped to card:', currentIndex);
  });

  rolodexContainer.style.cursor = 'grab';
  console.log('Mouse drag setup complete');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
