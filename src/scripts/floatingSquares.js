// floatingSquares.js - Generate random floating squares

function initFloatingSquares() {
  const containers = document.querySelectorAll('.floating-squares');
  
  containers.forEach(container => {
    // Clear existing squares
    container.innerHTML = '';
    
    // Generate 5-8 random squares per container
    const numSquares = Math.floor(Math.random() * 6) + 10;
    
    for (let i = 0; i < numSquares; i++) {
      const square = document.createElement('span');
      square.classList.add('square');
      
      // Random color: acc-color or text-light
      const useAccColor = Math.random() > 0.5;
      square.classList.add(useAccColor ? 'sq-accent' : 'sq-light');
      
      // Random size between 15px and 100px
      const size = Math.floor(Math.random() * 85) + 15;
      square.style.width = `${size}px`;
      square.style.height = `${size}px`;
      
      // Random position (can go slightly outside for partial visibility)
      const top = Math.floor(Math.random() * 120) - 10;
      const left = Math.floor(Math.random() * 120) - 10;
      square.style.top = `${top}%`;
      square.style.left = `${left}%`;
      
      // Random animation delay
      const delay = Math.random() * 4;
      square.style.animationDelay = `${delay}s`;
      
      container.appendChild(square);
    }
  });
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFloatingSquares);
} else {
  initFloatingSquares();
}
