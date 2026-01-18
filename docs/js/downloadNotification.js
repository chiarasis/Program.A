// Download Success Notification
// Shows message after poster download with link to gallery

function showDownloadSuccess(editorName = '') {
  // Remove existing notification if any
  const existing = document.querySelector('.download-success-notification');
  if (existing) existing.remove();
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'download-success-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <svg class="check-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div class="notification-text">
        <p class="notification-title">Poster salvato!</p>
        <a href="/public-work" class="gallery-link">
          Vedi il tuo poster nella gallery →
        </a>
      </div>
      <button class="close-notification" aria-label="Chiudi">&times;</button>
    </div>
  `;
  
  // Add styles if not already present
  if (!document.getElementById('download-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'download-notification-styles';
    style.textContent = `
      .download-success-notification {
        position: fixed;
        bottom: 32px;
        right: 32px;
        background: rgba(0, 0, 0, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 20px 24px;
        z-index: 10000;
        animation: slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        max-width: 380px;
      }
      
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .notification-content {
        display: flex;
        align-items: flex-start;
        gap: 16px;
      }
      
      .check-icon {
        flex-shrink: 0;
        stroke: #4ade80;
        margin-top: 2px;
      }
      
      .notification-text {
        flex: 1;
      }
      
      .notification-title {
        color: #fff;
        font-family: 'VG5000', monospace;
        font-size: 14px;
        margin: 0 0 8px 0;
        letter-spacing: 0.5px;
      }
      
      .gallery-link {
        color: #60a5fa;
        text-decoration: none;
        font-family: 'Basier Square Mono', monospace;
        font-size: 13px;
        transition: color 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      
      .gallery-link:hover {
        color: #93c5fd;
      }
      
      .close-notification {
        flex-shrink: 0;
        background: none;
        border: none;
        color: #666;
        font-size: 24px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s ease;
      }
      
      .close-notification:hover {
        color: #fff;
      }
      
      @media (max-width: 768px) {
        .download-success-notification {
          bottom: 16px;
          right: 16px;
          left: 16px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add to page
  document.body.appendChild(notification);
  
  // Close button handler
  const closeBtn = notification.querySelector('.close-notification');
  closeBtn.addEventListener('click', () => {
    notification.style.animation = 'slideInUp 0.3s reverse';
    setTimeout(() => notification.remove(), 300);
  });
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.animation = 'slideInUp 0.3s reverse';
      setTimeout(() => notification.remove(), 300);
    }
  }, 8000);
}

// Export for use in editor scripts
window.showDownloadSuccess = showDownloadSuccess;
