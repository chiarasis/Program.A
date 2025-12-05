// Live clock update

function updateClock() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const formatted = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  const clockEl = document.getElementById('live-clock');
  if (clockEl) clockEl.textContent = formatted;
}

updateClock();
setInterval(updateClock, 1000);
