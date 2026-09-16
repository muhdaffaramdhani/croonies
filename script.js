// ---------- Data ----------
const PRODUCTS = [
  {
    id: 'cookie-original',
    name: 'Soft Cookies Original',
    price: 7000,
    img: 'assets/cookies_original.png',
    imgClass: 'original',
    desc: 'Cookies original dengan potongan dark chocolate chunks.'
  },
  {
    id: 'cookie-matcha',
    name: 'Soft Cookies Matcha',
    price: 7000,
    img: 'assets/cookies_matcha.png',
    imgClass: 'matcha',
    desc: 'Cookies matcha dengan potongan dark chocolate chunks.'
  },
  {
    id: 'cookie-redvelvet',
    name: 'Soft Cookies Red Velvet',
    price: 7000,
    img: 'assets/cookies_red_velvet.png',
    imgClass: 'redvelvet',
    desc: 'Cookies Red velvet dengan potongan white chocolate.'
  },
  {
    id: 'cheese-brownies',
    name: 'Cheese Brownies',
    price: 6000,
    img: 'assets/cheese_brownies.png',
    imgClass: 'brownies',
    desc: 'Brownies fudgy dengan lapisan cheese di atasnya, per potong.'
  },
  {
    id: 'cheese-brownies-loyang',
    name: 'Cheese Brownies Loyang',
    price: 96000,
    img: 'assets/cheese_brownies_loyang.png',
    imgClass: 'loyang',
    desc: 'Satu loyang penuh cheese brownies ukuran 20x20 (kurang lebih 16 pcs potong), pas untuk berbagi rame-rame.'
  }
];

const WA_NUMBER = '6282320538422';
const DP_THRESHOLD = 100000;
const DP_PERCENT = 0.5;

// ---------- State ----------
let cart = {}; // id -> qty
try {
  const saved = localStorage.getItem('croonies_cart');
  if (saved) cart = JSON.parse(saved);
} catch (e) {}

function syncCartStorage(){
  try {
    localStorage.setItem('croonies_cart', JSON.stringify(cart));
  } catch (e) {}
}

// ---------- Utils ----------
function formatRupiah(n){
  return 'Rp' + n.toLocaleString('id-ID');
}
function cartTotal(){
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = PRODUCTS.find(p => p.id === id);
    return sum + (p ? p.price * qty : 0);
  }, 0);
}
function cartCount(){
  return Object.values(cart).reduce((a,b) => a+b, 0);
}
function formatDateID(dateStr){
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}
// Order number format: CR-DDMMYY-HHMMDDMMYY
// DDMMYY = tanggal pengambilan pre-order (dari input tanggal)
// HHMMDDMMYY = jam, menit, tanggal, bulan, 2 digit tahun saat order dibuat
function generateOrderCode(pickupDate){
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');

  // DDMMYY dari tanggal pengambilan
  let pickupPart = `${pad(now.getDate())}${pad(now.getMonth()+1)}${String(now.getFullYear()).slice(2)}`;
  if (pickupDate) {
    const d = new Date(pickupDate + 'T00:00:00');
    pickupPart = `${pad(d.getDate())}${pad(d.getMonth()+1)}${String(d.getFullYear()).slice(2)}`;
  }

  // HHMMDDMMYY dari jam, menit, dan tanggal pemesanan saat ini
  const orderPart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getDate())}${pad(now.getMonth()+1)}${String(now.getFullYear()).slice(2)}`;

  return `CR-${pickupPart}-${orderPart}`;
}

// ---------- Render menu ----------
let menuAlreadyRevealed = false;
const menuGrid = document.getElementById('menuGrid');
function renderMenu(){
  menuGrid.innerHTML = PRODUCTS.map(p => {
    const qty = cart[p.id] || 0;
    // Always keep reveal-item class so CSS transition is defined.
    // Add is-visible immediately if section already scrolled into view.
    const revealClass = menuAlreadyRevealed ? 'reveal-item is-visible' : 'reveal-item';
    return `
    <div class="menu-card ${revealClass}" data-id="${p.id}">
      <div class="menu-card-img-wrap ${p.imgClass}">
        <img src="${p.img}" alt="${p.name}">
      </div>
      <h3>${p.name}</h3>
      <div class="price">${formatRupiah(p.price)}</div>
      <p class="desc">${p.desc}</p>
      <div class="qty-row">
        <div class="qty-control">
          <button class="dec" ${qty === 0 ? 'disabled' : ''} aria-label="Kurangi">&minus;</button>
          <span>${qty}</span>
          <button class="inc" aria-label="Tambah">&plus;</button>
        </div>
        ${qty === 0 ? `<button class="add-btn">Tambah</button>` : `<span style="font-size:12px;color:var(--brown);font-weight:600;">${formatRupiah(p.price*qty)}</span>`}
      </div>
    </div>`;
  }).join('');

  // Attach newly created cards to observer (safe to call even before observer is ready)
  if (!menuAlreadyRevealed && scrollObserver) {
    menuGrid.querySelectorAll('.menu-card.reveal-item:not(.is-visible)').forEach(card => scrollObserver.observe(card));
  }

  menuGrid.querySelectorAll('.menu-card').forEach(card => {
    const id = card.dataset.id;
    const inc = card.querySelector('.inc');
    const dec = card.querySelector('.dec');
    const add = card.querySelector('.add-btn');
    const changeQty = delta => {
      const current = cart[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) delete cart[id]; else cart[id] = next;
      syncCartStorage();
      renderMenu();
      renderCart();
    };
    if (inc) inc.addEventListener('click', () => changeQty(1));
    if (dec) dec.addEventListener('click', () => changeQty(-1));
    if (add) add.addEventListener('click', () => changeQty(1));
  });
}

// ---------- Cart bar + drawer ----------
const cartBar = document.getElementById('cartBar');
const cartBarCount = document.getElementById('cartBarCount');
const cartBarTotal = document.getElementById('cartBarTotal');
const cartCountEl = document.getElementById('cartCount');
const cartItemsEl = document.getElementById('cartItems');
const drawerTotalEl = document.getElementById('drawerTotal');

function renderCart(){
  const count = cartCount();
  const total = cartTotal();
  cartCountEl.textContent = count;
  cartBarCount.textContent = `${count} item`;
  cartBarTotal.textContent = formatRupiah(total);
  drawerTotalEl.textContent = formatRupiah(total);
  cartBar.classList.toggle('show', count > 0);

  if (count === 0){
    cartItemsEl.innerHTML = `<div class="cart-empty">Keranjang masih kosong.<br>Yuk pilih menu dulu.</div>`;
    return;
  }
  cartCountEl.classList.remove('bounce-pill');
  void cartCountEl.offsetWidth;
  cartCountEl.classList.add('bounce-pill');

  cartItemsEl.innerHTML = Object.entries(cart).map(([id, qty]) => {
    const p = PRODUCTS.find(p => p.id === id);
    return `<div class="cart-line">
      <div>
        <div class="cart-line-name">${p.name}</div>
        <div class="cart-line-sub">${qty} x ${formatRupiah(p.price)}</div>
      </div>
      <strong>${formatRupiah(p.price*qty)}</strong>
    </div>`;
  }).join('');
}

// Drawer open/close
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
function openDrawer(){
  cartDrawer.classList.add('show');
  cartOverlay.classList.add('show');
}
function closeDrawer(){ cartDrawer.classList.remove('show'); cartOverlay.classList.remove('show'); }
document.getElementById('openCartBtn').addEventListener('click', openDrawer);
document.getElementById('closeCartBtn').addEventListener('click', closeDrawer);
cartOverlay.addEventListener('click', closeDrawer);

// ---------- Mobile Navigation Drawer ----------
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileNavDrawer = document.getElementById('mobileNavDrawer');
const mobileNavOverlay = document.getElementById('mobileNavOverlay');
const closeMobileNavBtn = document.getElementById('closeMobileNavBtn');
const mobileNavLinks = document.querySelectorAll('.mobile-nav-link, #mobileNavOrderBtn');

function openMobileNav(){
  if (hamburgerBtn) {
    hamburgerBtn.classList.add('active');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
  }
  if (mobileNavDrawer) mobileNavDrawer.classList.add('show');
  if (mobileNavOverlay) mobileNavOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeMobileNav(){
  if (hamburgerBtn) {
    hamburgerBtn.classList.remove('active');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  }
  if (mobileNavDrawer) mobileNavDrawer.classList.remove('show');
  if (mobileNavOverlay) mobileNavOverlay.classList.remove('show');
  document.body.style.overflow = '';
}

if (hamburgerBtn) {
  hamburgerBtn.addEventListener('click', () => {
    if (mobileNavDrawer && mobileNavDrawer.classList.contains('show')) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  });
}
if (closeMobileNavBtn) closeMobileNavBtn.addEventListener('click', closeMobileNav);
if (mobileNavOverlay) mobileNavOverlay.addEventListener('click', closeMobileNav);

mobileNavLinks.forEach(link => {
  link.addEventListener('click', () => {
    closeMobileNav();
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMobileNav();
    closeDrawer();
  }
});

// ---------- Pemesan type toggle ----------
const unjFields = document.getElementById('unjFields');
const umumFields = document.getElementById('umumFields');
function updatePemesanFields(){
  const isUnj = document.querySelector('input[name="pemesanType"]:checked').value === 'Mahasiswa UNJ';
  unjFields.hidden = !isUnj;
  if (umumFields) umumFields.hidden = isUnj;
}
document.querySelectorAll('input[name="pemesanType"]').forEach(radio => {
  radio.addEventListener('change', updatePemesanFields);
});
updatePemesanFields();

// ---------- Checkout modal ----------
const checkoutModal = document.getElementById('checkoutModal');
const checkoutOverlay = document.getElementById('checkoutOverlay');
const orderSummary = document.getElementById('orderSummary');
const dpNotice = document.getElementById('dpNotice');

function openCheckout(){
  if (cartCount() === 0){
    alert('Keranjang masih kosong. Pilih menu dulu ya.');
    return;
  }
  updatePemesanFields();
  renderOrderSummary();
  closeDrawer();
  checkoutModal.classList.add('show');
  checkoutOverlay.classList.add('show');
}
function closeCheckout(){
  checkoutModal.classList.remove('show');
  checkoutOverlay.classList.remove('show');
}
function renderOrderSummary(){
  const total = cartTotal();
  const lines = Object.entries(cart).map(([id, qty]) => {
    const p = PRODUCTS.find(p => p.id === id);
    return `<div class="sum-line"><span>${p.name} x${qty}</span><span>${formatRupiah(p.price*qty)}</span></div>`;
  }).join('');
  orderSummary.innerHTML = lines + `<div class="sum-line sum-total"><span>Total</span><span>${formatRupiah(total)}</span></div>`;
  dpNotice.hidden = total < DP_THRESHOLD;
  dpNotice.innerHTML = `Total order ${formatRupiah(DP_THRESHOLD)} ke atas, wajib DP minimal 50% terlebih dahulu sebelum diproses.`;
}

function goToCheckoutPage(){
  if (cartCount() === 0){
    alert('Silakan pilih minimal 1 menu Croonies terlebih dahulu.');
    return;
  }
  syncCartStorage();
  window.location.href = 'checkout/';
}

document.getElementById('checkoutBtn').addEventListener('click', goToCheckoutPage);
document.getElementById('drawerCheckoutBtn').addEventListener('click', goToCheckoutPage);
document.getElementById('closeCheckoutBtn').addEventListener('click', closeCheckout);
checkoutOverlay.addEventListener('click', closeCheckout);

// Flatpickr for home page modal date & time
const homePickupDateInput = document.getElementById('pickupDate');
const homePickupTimeInput = document.getElementById('pickupTime');
let fpHomePickupDate = null;
let fpHomePickupTime = null;

if (window.flatpickr) {
  if (homePickupDateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDateStr = tomorrow.toISOString().split('T')[0];
    fpHomePickupDate = flatpickr(homePickupDateInput, {
      locale: (window.flatpickr.l10ns && window.flatpickr.l10ns.id) ? window.flatpickr.l10ns.id : 'id',
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'd/m/Y',
      altInputClass: 'flatpickr-custom-input',
      minDate: minDateStr,
      placeholder: 'dd/mm/yyyy',
      disableMobile: true,
      monthSelectorType: 'static',
      allowInput: false,
      onReady: function(selectedDates, dateStr, instance) {
        if (instance.altInput) {
          instance.altInput.setAttribute('inputmode', 'none');
          instance.altInput.setAttribute('readonly', 'readonly');
        }
        if (instance.currentYearElement) {
          instance.currentYearElement.disabled = true;
          instance.currentYearElement.tabIndex = -1;
        }
      },
      onMonthChange: function(selectedDates, dateStr, instance) {
        if (instance.currentYearElement) {
          instance.currentYearElement.disabled = true;
          instance.currentYearElement.tabIndex = -1;
        }
      }
    });
    fpHomePickupDate.clear();
  }

  if (homePickupTimeInput) {
    fpHomePickupTime = flatpickr(homePickupTimeInput, {
      enableTime: true,
      noCalendar: true,
      dateFormat: 'H:i',
      time_24hr: true,
      minTime: '08:00',
      maxTime: '16:00',
      minuteIncrement: 15,
      defaultDate: '10:00',
      disableMobile: true,
      allowInput: true
    });
  }
}

// ---------- Order submit -> receipt ----------
const orderForm = document.getElementById('orderForm');
const receiptModal = document.getElementById('receiptModal');
const receiptOverlay = document.getElementById('receiptOverlay');
const receiptContent = document.getElementById('receiptContent');
let lastOrder = null;

orderForm.addEventListener('submit', e => {
  e.preventDefault();

  const pickupDate = document.getElementById('pickupDate').value;
  if (!pickupDate) {
    alert('Silakan pilih tanggal pengambilan terlebih dahulu.');
    return;
  }

  const pemesanType = document.querySelector('input[name="pemesanType"]:checked').value;
  const fullName = document.getElementById('fullName').value.trim();
  const domisili = document.getElementById('domisili') ? document.getElementById('domisili').value.trim() : '';
  const prodi = document.getElementById('prodi').value.trim();
  const fakultas = document.getElementById('fakultas').value.trim();
  const pickupTime = document.getElementById('pickupTime').value;
  const payMethod = document.querySelector('input[name="payMethod"]:checked').value;
  const notes = document.getElementById('notes').value.trim();

  const total = cartTotal();
  const needsDp = total >= DP_THRESHOLD;
  const dpMinAmount = needsDp ? Math.round(total * DP_PERCENT) : 0;
  const orderCode = generateOrderCode(pickupDate);

  lastOrder = {
    orderCode, pemesanType, fullName, domisili, prodi, fakultas, pickupDate, pickupTime, payMethod, notes,
    items: Object.entries(cart).map(([id, qty]) => {
      const p = PRODUCTS.find(p => p.id === id);
      return { name: p.name, qty, price: p.price, subtotal: p.price*qty };
    }),
    total, needsDp, dpMinAmount
  };

  renderReceipt(lastOrder);
  closeCheckout();
  receiptModal.classList.add('show');
  receiptOverlay.classList.add('show');
  sendToWhatsApp(lastOrder);

  // Kosongkan keranjang belanja setelah checkout & kirim WA
  cart = {};
  syncCartStorage();
  renderCart();
  renderMenu();
  orderForm.reset();
  if (fpHomePickupDate) fpHomePickupDate.clear();
});

let currentReceiptDataUrl = null;

function renderReceipt(order){
  const template = document.getElementById('receiptTicketTemplate');
  const previewContainer = document.getElementById('receiptContent');
  if (!template || !previewContainer) return;

  // 1. Tampilkan state loading sebelum gambar selesai di-generate
  previewContainer.innerHTML = `
    <div class="receipt-loading-box">
      <div class="spinner"></div>
      <span>Membuat struk pesanan...</span>
    </div>
  `;

  // 2. Render tiket di staging template unconstrained (tidak dibatasi height atau overflow)
  template.innerHTML = `
    <div class="ticket-watermark" aria-hidden="true">
      <div class="ticket-watermark-bg" style="background-image:url('assets/croonies_logo.png');"></div>
    </div>

    <div class="ticket-content">
      <div class="ticket-header">
        <div class="ticket-check-circle">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h4 class="ticket-title">Pesanan Berhasil!</h4>
        <div class="ticket-order-badge">No. Order: <span>#${order.orderCode}</span></div>
        <div class="ticket-meta-subtitle">
          <span>${order.fullName}</span> • <span>${formatDateID(order.pickupDate)}, ${order.pickupTime}</span>
        </div>
      </div>

      <div class="ticket-divider">
        <div class="ticket-notch notch-left"></div>
        <div class="ticket-divider-line"></div>
        <div class="ticket-notch notch-right"></div>
      </div>

      <div class="ticket-body">
        <div class="ticket-table-head">
          <span class="t-col-num">№</span>
          <span class="t-col-item">Item</span>
          <span class="t-col-price">Harga</span>
        </div>

        <div class="ticket-items-list">
          ${order.items.map((it, idx) => `
            <div class="ticket-item-row">
              <span class="t-col-num">${idx + 1}</span>
              <div class="t-col-item">
                <span class="t-item-name">${it.name}</span>
                <span class="t-item-calc">${it.qty} x ${formatRupiah(it.price)}</span>
              </div>
              <span class="t-col-price">${formatRupiah(it.subtotal)}</span>
            </div>
          `).join('')}
        </div>

        ${order.notes ? `
          <div class="ticket-notes-box">
            <span>Catatan:</span> ${order.notes}
          </div>
        ` : ''}

        <div class="ticket-summary-card">
          <div class="ticket-summary-row ticket-total-row">
            <span class="ticket-total-label">Total</span>
            <span class="ticket-total-amount">${formatRupiah(order.total)}</span>
          </div>
          <div class="ticket-summary-row">
            <span>Metode Pembayaran</span>
            <span>${order.payMethod}</span>
          </div>
          ${order.needsDp ? `
          <div class="ticket-summary-row ticket-dp-row">
            <span>Wajib DP 50%</span>
            <strong>${formatRupiah(order.dpMinAmount)}</strong>
          </div>
          ` : ''}
        </div>
      </div>

      <div class="ticket-footer">
        <span class="ticket-footer-tagline">Seriously soft, honestly rich.</span>
        <span class="ticket-footer-ig">@croonies.id</span>
      </div>
    </div>
  `;

  // Pastikan font sudah selesai di-load sebelum di-capture
  const waitForFonts = (document.fonts && document.fonts.ready)
    ? document.fonts.ready
    : Promise.resolve();

  // Pastikan juga logo watermark (background-image) sudah selesai dimuat
  // sebelum di-capture, supaya tidak blank/kosong saat html2canvas berjalan.
  const waitForLogo = new Promise(resolve => {
    const preload = new Image();
    preload.onload = resolve;
    preload.onerror = resolve;
    preload.src = 'assets/croonies_logo.png';
    if (preload.complete) resolve();
  });

  Promise.all([waitForFonts, waitForLogo]).then(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const baseOptions = {
        backgroundColor: '#FFFFFF',
        scale: 2,
        useCORS: true,
        logging: false
      };

      html2canvas(template, baseOptions).then(canvas => {
        if (isCanvasBlank(canvas)) {
          console.warn('Hasil capture struk kosong, mencoba render ulang...');
          return html2canvas(template, baseOptions);
        }
        return canvas;
      }).then(canvas => {
        // Auto-crop whitespace di atas (hanya jika ada ruang transparan sebelum card)
        const croppedCanvas = cropCanvasWhitespaceTop(canvas);
        currentReceiptDataUrl = croppedCanvas.toDataURL('image/png');

      // Tampilkan GAMBAR HASIL GENERATE LANGSUNG di modal website (BUKAN DOM JS)
      previewContainer.innerHTML = `
        <img src="${currentReceiptDataUrl}" alt="Struk Pesanan ${order.orderCode}" class="receipt-img-display" />
      `;

      // Otomatis download file gambar struk
      downloadReceiptFile(order);

      // Coba salin ke clipboard jika didukung
      if (navigator.clipboard && window.ClipboardItem) {
        croppedCanvas.toBlob(blob => {
          if (blob) {
            navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]).catch(() => {});
          }
        }, 'image/png');
      }
    }).catch(err => {
      console.warn('Gagal render canvas struk:', err);
      previewContainer.innerHTML = `<div style="color:var(--brown);font-size:13px;padding:24px;text-align:center;">Gagal memuat preview struk. Silakan coba klik download ulang struk.</div>`;
    });
    }));
  });
}

/**
 * Cek apakah hasil capture html2canvas kosong/blank
 */
function isCanvasBlank(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  if (!width || !height) return true;

  const gridSize = 12;
  let nonBlankFound = false;

  outer: for (let i = 1; i < gridSize; i++) {
    for (let j = 1; j < gridSize; j++) {
      const x = Math.floor((width / gridSize) * i);
      const y = Math.floor((height / gridSize) * j);
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const [r, g, b, a] = pixel;
      const isWhiteOrTransparent = (a === 0) || (r > 250 && g > 250 && b > 250);
      if (!isWhiteOrTransparent) {
        nonBlankFound = true;
        break outer;
      }
    }
  }

  return !nonBlankFound;
}

function cropCanvasWhitespaceTop(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let firstContentRow = 0;
  // Temukan baris pertama yang berisi konten kartu (bukan transparan)
  outer: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a > 15) {
        firstContentRow = y;
        break outer;
      }
    }
  }
  if (firstContentRow <= 0) return canvas;
  const newHeight = height - firstContentRow;
  const newCanvas = document.createElement('canvas');
  newCanvas.width = width;
  newCanvas.height = newHeight;
  newCanvas.getContext('2d').drawImage(canvas, 0, firstContentRow, width, newHeight, 0, 0, width, newHeight);
  return newCanvas;
}

function downloadReceiptFile(order){
  if (!currentReceiptDataUrl) return;
  const link = document.createElement('a');
  link.download = `receipt-${order ? order.orderCode : 'croonies'}.png`;
  link.href = currentReceiptDataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

document.getElementById('closeReceiptBtn').addEventListener('click', () => {
  receiptModal.classList.remove('show');
  receiptOverlay.classList.remove('show');
});

// Download ulang struk tombol
document.getElementById('downloadReceiptBtn').addEventListener('click', () => {
  if (currentReceiptDataUrl) {
    downloadReceiptFile(lastOrder);
  } else if (lastOrder) {
    renderReceipt(lastOrder);
  }
});

// Helper emoji item
function getItemEmoji(name){
  const lower = (name || '').toLowerCase();
  if (lower.includes('matcha')) return '🍵';
  if (lower.includes('red velvet')) return '❤️';
  if (lower.includes('original') || lower.includes('cookie')) return '🍪';
  if (lower.includes('cheese') || lower.includes('keju')) return '🧀';
  if (lower.includes('brownies') || lower.includes('cokelat') || lower.includes('loyang')) return '🍫';
  return '✨';
}

// Build WhatsApp message text from an order
function buildWaMessage(o){
  const divider = '━━━━━━━━━━━━━━━━━━━━━━';
  const formatWaPrice = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
  
  const itemLines = o.items.map(it => {
    const emoji = getItemEmoji(it.name);
    return `   • ${emoji} ${it.name} ×${it.qty} = ${formatWaPrice(it.subtotal)}`;
  }).join('\n');

  let msg = `🍫 *CROONIES - PESANAN* 🍫\n`;
  msg += `${divider}\n`;
  msg += `📋 No. Order : #${o.orderCode}\n`;
  msg += `👤 Nama      : ${o.fullName}\n`;
  msg += `🏷️ Tipe      : ${o.pemesanType}${o.pemesanType === 'Mahasiswa UNJ' ? ' 🎓' : ''}\n`;

  if (o.pemesanType === 'Mahasiswa UNJ'){
    msg += `🎓 Prodi     : ${o.prodi || '-'}\n`;
    msg += `📚 Fakultas  : ${o.fakultas || '-'}\n`;
  } else {
    msg += `🏡 Domisili  : ${o.domisili || '-'}\n`;
  }

  if (o.pickupDate){
    msg += `📅 Tgl Ambil : ${formatDateID(o.pickupDate)}\n`;
  }
  if (o.pickupTime){
    msg += `⏰ Jam Ambil : ${o.pickupTime} WIB\n`;
  }

  msg += `${divider}\n`;
  msg += `📦 *Detail Pesanan:*\n`;
  msg += `${itemLines}\n\n`;

  msg += `💰 *Subtotal    : ${formatWaPrice(o.total)}*\n`;
  msg += `📍 Metode     : Ambil Sendiri (Gratis antar)\n`;
  msg += `✨ *Total Akhir : ${formatWaPrice(o.total)}*\n`;

  if (o.needsDp){
    msg += `⚠️ *Wajib DP   : ${formatWaPrice(o.dpMinAmount)} (50%)*\n`;
  }

  const payEmoji = (o.payMethod || '').toLowerCase().includes('qris') ? '📱' : '💵';
  msg += `💳 Pembayaran : ${payEmoji} ${o.payMethod}\n`;

  if (o.notes){
    msg += `📝 Catatan    : ${o.notes}\n`;
  }

  msg += `${divider}\n`;
  msg += `Terima kasih sudah memesan di Croonies! 🙏\n`;
  msg += `Konfirmasi alamat & jadwal pickup/delivery ya kak.`;

  return msg;
}

function sendToWhatsApp(order){
  const msg = buildWaMessage(order);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(msg).catch(() => {});
  }
  const url = `https://api.whatsapp.com/send?phone=${WA_NUMBER}&text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

document.getElementById('sendWaBtn').addEventListener('click', () => {
  if (!lastOrder) return;
  sendToWhatsApp(lastOrder);
});

// ---------- Scroll Reveal Observer (Pure Browser API, No External Library, 100% Reliable) ----------
let scrollObserver = null;
function initScrollObserver(){
  if (!('IntersectionObserver' in window)){
    document.querySelectorAll('.reveal-item').forEach(el => el.classList.add('is-visible'));
    menuAlreadyRevealed = true;
    return;
  }

  scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('is-visible');
        if (entry.target.classList.contains('menu-card')){
          menuAlreadyRevealed = true;
        }
        scrollObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -10px 0px' });

  // Assign stagger delays per group of siblings, then observe
  const groups = new Map();
  document.querySelectorAll('.reveal-item').forEach(el => {
    const parent = el.parentElement;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);
  });
  groups.forEach(items => {
    items.forEach((el, i) => {
      el.style.setProperty('--delay', `${(i * 0.08).toFixed(2)}s`);
      scrollObserver.observe(el);
    });
  });
}

// ---------- Init ----------
renderMenu();
renderCart();
initScrollObserver();
