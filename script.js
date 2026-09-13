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
    price: 80000,
    img: 'assets/cheese_brownies_loyang.png',
    imgClass: 'loyang',
    desc: 'Satu loyang penuh cheese brownies, pas untuk berbagi rame-rame.'
  }
];

const WA_NUMBER = '6282320538422';
const DP_THRESHOLD = 100000;
const DP_PERCENT = 0.5;

// ---------- State ----------
let cart = {}; // id -> qty

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

document.getElementById('checkoutBtn').addEventListener('click', openCheckout);
document.getElementById('drawerCheckoutBtn').addEventListener('click', openCheckout);
document.getElementById('closeCheckoutBtn').addEventListener('click', closeCheckout);
checkoutOverlay.addEventListener('click', closeCheckout);

// ---------- Order submit -> receipt ----------
const orderForm = document.getElementById('orderForm');
const receiptModal = document.getElementById('receiptModal');
const receiptOverlay = document.getElementById('receiptOverlay');
const receiptContent = document.getElementById('receiptContent');
let lastOrder = null;

orderForm.addEventListener('submit', e => {
  e.preventDefault();

  const pemesanType = document.querySelector('input[name="pemesanType"]:checked').value;
  const fullName = document.getElementById('fullName').value.trim();
  const domisili = document.getElementById('domisili') ? document.getElementById('domisili').value.trim() : '';
  const prodi = document.getElementById('prodi').value.trim();
  const fakultas = document.getElementById('fakultas').value.trim();
  const pickupDate = document.getElementById('pickupDate').value;
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

  // Otomatis simpan & salin foto struk untuk dilampirkan
  setTimeout(() => {
    captureAndSaveReceipt(lastOrder, false);
  }, 120);

  sendToWhatsApp(lastOrder);
});

function renderReceipt(order){
  const itemsHtml = order.items.map(it =>
    `<div class="receipt-item"><span>${it.name} x${it.qty}</span><span>${formatRupiah(it.subtotal)}</span></div>`
  ).join('');

  receiptContent.innerHTML = `
    <img src="assets/croonies_logo.png" alt="Croonies" class="receipt-logo">
    <div class="receipt-tag">Seriously soft, honestly rich.</div>
    <hr>
    <div class="receipt-row"><span>No. Order</span><span>${order.orderCode}</span></div>
    <div class="receipt-row"><span>Status</span><span>${order.pemesanType}</span></div>
    <div class="receipt-row"><span>Nama</span><span>${order.fullName}</span></div>
    ${order.pemesanType === 'Mahasiswa UNJ' ? `
    <div class="receipt-row"><span>Prodi</span><span>${order.prodi || '-'}</span></div>
    <div class="receipt-row"><span>Fakultas</span><span>${order.fakultas || '-'}</span></div>` : `
    <div class="receipt-row"><span>Domisili</span><span>${order.domisili || '-'}</span></div>`}
    <div class="receipt-row"><span>Ambil</span><span>${formatDateID(order.pickupDate)}, ${order.pickupTime}</span></div>
    <div class="receipt-row"><span>Bayar</span><span>${order.payMethod}</span></div>
    <hr>
    ${itemsHtml}
    <hr>
    <div class="receipt-row"><strong>Total</strong><strong>${formatRupiah(order.total)}</strong></div>
    ${order.needsDp ? `
    <div class="receipt-row"><span>DP minimal 50%</span><span>${formatRupiah(order.dpMinAmount)}</span></div>
    ` : ''}
    ${order.notes ? `<hr><div class="receipt-row"><span>Catatan</span><span>${order.notes}</span></div>` : ''}
  `;
}

document.getElementById('closeReceiptBtn').addEventListener('click', () => {
  receiptModal.classList.remove('show');
  receiptOverlay.classList.remove('show');
});

// Otomatis membuat gambar struk, men-download file PNG, dan menyalin ke clipboard
function captureAndSaveReceipt(order, showAlertOnError = false){
  if (!receiptContent) return Promise.resolve();
  return html2canvas(receiptContent, { backgroundColor: '#FBF3E6', scale: 2, useCORS: true }).then(canvas => {
    // 1. Download file gambar struk
    const link = document.createElement('a');
    link.download = `struk-${order ? order.orderCode : 'croonies'}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 2. Coba salin ke clipboard jika didukung browser
    if (navigator.clipboard && window.ClipboardItem) {
      canvas.toBlob(blob => {
        if (blob) {
          navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]).catch(() => {});
        }
      }, 'image/png');
    }
  }).catch(err => {
    console.warn('Gagal capture struk:', err);
    if (showAlertOnError) {
      alert('Gagal mendownload gambar struk. Coba screenshot manual struk di layar ya.');
    }
  });
}

// Download ulang struk tombol
document.getElementById('downloadReceiptBtn').addEventListener('click', () => {
  if (lastOrder) captureAndSaveReceipt(lastOrder, true);
});

// Build WhatsApp message text from an order
function buildWaMessage(o){
  const itemLines = o.items.map((it,i) => `${i+1}. ${it.name} x${it.qty} = ${formatRupiah(it.subtotal)}`).join('\n');
  let msg = `*PRE ORDER CROONIES*\n`;
  msg += `No. Order: ${o.orderCode}\n\n`;
  msg += `Status: ${o.pemesanType}\n`;
  msg += `Nama: ${o.fullName}\n`;
  if (o.pemesanType === 'Mahasiswa UNJ'){
    msg += `Prodi: ${o.prodi || '-'}\n`;
    msg += `Fakultas: ${o.fakultas || '-'}\n`;
  } else {
    msg += `Domisili: ${o.domisili || '-'}\n`;
  }
  msg += `Tanggal ambil: ${formatDateID(o.pickupDate)}\n`;
  msg += `Jam ambil: ${o.pickupTime}\n`;
  msg += `Metode bayar: ${o.payMethod}\n`;
  msg += `\n--- Detail Pesanan ---\n${itemLines}\n`;
  msg += `\nTotal: ${formatRupiah(o.total)}\n`;
  if (o.needsDp){
    msg += `Wajib DP minimal 50% (${formatRupiah(o.dpMinAmount)}) atau lebih.\n`;
  }
  if (o.notes) msg += `\nCatatan: ${o.notes}\n`;
  msg += `\n📸 _(Foto struk bukti pemesanan telah tersimpan otomatis dan saya lampirkan di chat ini agar valid)_\n`;
  msg += `\nMohon konfirmasi ya, terima kasih 🙏`;
  return msg;
}

function sendToWhatsApp(order){
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(buildWaMessage(order))}`;
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
