// ---------- Data ----------
const PRODUCTS = [
  {
    id: 'cookie-original',
    name: 'Soft Cookies Original',
    price: 7000,
    img: '/assets/cookies_original.png',
    desc: 'Cookies original dengan potongan dark chocolate chunks.'
  },
  {
    id: 'cookie-matcha',
    name: 'Soft Cookies Matcha',
    price: 7000,
    img: '/assets/cookies_matcha.png',
    desc: 'Cookies matcha dengan potongan dark chocolate chunks.'
  },
  {
    id: 'cookie-redvelvet',
    name: 'Soft Cookies Red Velvet',
    price: 7000,
    img: '/assets/cookies_red_velvet.png',
    desc: 'Cookies Red velvet dengan potongan white chocolate.'
  },
  {
    id: 'cheese-brownies',
    name: 'Cheese Brownies',
    price: 6000,
    img: '/assets/cheese_brownies.png',
    desc: 'Brownies fudgy dengan lapisan cheese di atasnya, per potong.'
  },
  {
    id: 'cheese-brownies-loyang',
    name: 'Cheese Brownies Loyang',
    price: 80000,
    img: '/assets/cheese_brownies_loyang.png',
    desc: 'Satu loyang penuh cheese brownies, pas untuk berbagi rame-rame.'
  }
];

const WA_NUMBER = '6282320538422';
const DP_THRESHOLD = 100000;
const DP_PERCENT = 0.5;

// ---------- State ----------
let cart = {};
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
function generateOrderCode(pickupDate){
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');

  let pickupPart = `${pad(now.getDate())}${pad(now.getMonth()+1)}${String(now.getFullYear()).slice(2)}`;
  if (pickupDate) {
    const d = new Date(pickupDate + 'T00:00:00');
    pickupPart = `${pad(d.getDate())}${pad(d.getMonth()+1)}${String(d.getFullYear()).slice(2)}`;
  }

  const orderPart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getDate())}${pad(now.getMonth()+1)}${String(now.getFullYear()).slice(2)}`;
  return `CR-${pickupPart}-${orderPart}`;
}

// ---------- DOM Elements ----------
const checkoutEmptyState = document.getElementById('checkoutEmptyState');
const checkoutLayout = document.getElementById('checkoutLayout');
const checkoutMobileBar = document.getElementById('checkoutMobileBar');
const checkoutItemsList = document.getElementById('checkoutItemsList');
const summaryBreakdown = document.getElementById('summaryBreakdown');
const summaryTotalAmount = document.getElementById('summaryTotalAmount');
const summaryDpRow = document.getElementById('summaryDpRow');
const summaryDpAmount = document.getElementById('summaryDpAmount');
const mobileBarTotal = document.getElementById('mobileBarTotal');
const mobileBarDpHint = document.getElementById('mobileBarDpHint');
const dpAlertBox = document.getElementById('dpAlertBox');
const dpAlertText = document.getElementById('dpAlertText');

const typeUnj = document.getElementById('typeUnj');
const typeUmum = document.getElementById('typeUmum');
const unjFields = document.getElementById('unjFields');
const umumFields = document.getElementById('umumFields');
const prodiInput = document.getElementById('prodi');
const fakultasInput = document.getElementById('fakultas');
const domisiliInput = document.getElementById('domisili');
const pickupDateInput = document.getElementById('pickupDate');
const checkoutOrderForm = document.getElementById('checkoutOrderForm');
const summarySubmitBtn = document.getElementById('summarySubmitBtn');
const mobileBarSubmitBtn = document.getElementById('mobileBarSubmitBtn');

const receiptModal = document.getElementById('receiptModal');
const receiptOverlay = document.getElementById('receiptOverlay');
const receiptContent = document.getElementById('receiptContent');
const receiptTicketTemplate = document.getElementById('receiptTicketTemplate');
const closeReceiptBtn = document.getElementById('closeReceiptBtn');
const downloadReceiptBtn = document.getElementById('downloadReceiptBtn');
const sendWaBtn = document.getElementById('sendWaBtn');

let lastOrder = null;
let currentReceiptDataUrl = null;

// ---------- Render Items & Pricing ----------
function renderCheckoutView(){
  const count = cartCount();
  const total = cartTotal();
  const needsDp = total >= DP_THRESHOLD;
  const dpMinAmount = needsDp ? Math.round(total * DP_PERCENT) : 0;

  if (count === 0) {
    checkoutEmptyState.style.display = 'block';
    checkoutLayout.style.display = 'none';
    checkoutMobileBar.style.display = 'none';
    return;
  }

  checkoutEmptyState.style.display = 'none';
  checkoutLayout.style.display = 'grid';
  if (window.innerWidth <= 880) {
    checkoutMobileBar.style.display = 'block';
  } else {
    checkoutMobileBar.style.display = 'none';
  }

  // 1. Items List in Form
  checkoutItemsList.innerHTML = Object.entries(cart).map(([id, qty]) => {
    const p = PRODUCTS.find(p => p.id === id);
    if (!p) return '';
    return `
      <div class="checkout-item-card" data-id="${p.id}">
        <img src="${p.img}" alt="${p.name}" class="item-img-preview">
        <div class="item-meta">
          <span class="item-name-text">${p.name}</span>
          <span class="item-unit-price">${formatRupiah(p.price)} / pcs</span>
          <div class="item-stepper">
            <button type="button" class="step-btn btn-dec" aria-label="Kurangi">&minus;</button>
            <span class="step-count">${qty}</span>
            <button type="button" class="step-btn btn-inc" aria-label="Tambah">&plus;</button>
          </div>
        </div>
        <div class="item-cost-side">
          <span class="item-row-total">${formatRupiah(p.price * qty)}</span>
          <button type="button" class="item-delete-btn btn-del" aria-label="Hapus item" title="Hapus item">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach Item listeners
  checkoutItemsList.querySelectorAll('.checkout-item-card').forEach(row => {
    const id = row.dataset.id;
    const btnInc = row.querySelector('.btn-inc');
    const btnDec = row.querySelector('.btn-dec');
    const btnDel = row.querySelector('.btn-del');

    btnInc.addEventListener('click', () => updateItemQty(id, 1));
    btnDec.addEventListener('click', () => updateItemQty(id, -1));
    btnDel.addEventListener('click', () => removeItem(id));
  });

  // 2. Summary Breakdown
  summaryBreakdown.innerHTML = Object.entries(cart).map(([id, qty]) => {
    const p = PRODUCTS.find(p => p.id === id);
    if (!p) return '';
    return `
      <div class="checkout-sum-row">
        <span>${p.name} (${qty}x)</span>
        <strong>${formatRupiah(p.price * qty)}</strong>
      </div>
    `;
  }).join('');

  // 3. Totals
  summaryTotalAmount.textContent = formatRupiah(total);
  mobileBarTotal.textContent = formatRupiah(total);

  // 4. DP Alerts
  if (needsDp) {
    dpAlertBox.style.display = 'block';
    dpAlertText.innerHTML = `Total pesanan ${formatRupiah(total)} (≥ Rp100.000), wajib DP minimal 50% (<strong>${formatRupiah(dpMinAmount)}</strong>) untuk konfirmasi proses pembuatan.`;
    summaryDpRow.style.display = 'flex';
    summaryDpAmount.textContent = formatRupiah(dpMinAmount);
    mobileBarDpHint.style.display = 'block';
  } else {
    dpAlertBox.style.display = 'none';
    summaryDpRow.style.display = 'none';
    mobileBarDpHint.style.display = 'none';
  }
}

function updateItemQty(id, delta){
  const cur = cart[id] || 0;
  const next = Math.max(0, cur + delta);
  if (next === 0) delete cart[id]; else cart[id] = next;
  syncCartStorage();
  renderCheckoutView();
}

function removeItem(id){
  delete cart[id];
  syncCartStorage();
  renderCheckoutView();
}

// ---------- Form Behavior ----------
// Toggle Mahasiswa UNJ vs Umum
function handleStatusChange(){
  if (typeUnj.checked) {
    unjFields.style.display = 'grid';
    umumFields.style.display = 'none';
    prodiInput.required = true;
    fakultasInput.required = true;
    domisiliInput.required = false;
  } else {
    unjFields.style.display = 'none';
    umumFields.style.display = 'block';
    prodiInput.required = false;
    fakultasInput.required = false;
    domisiliInput.required = true;
  }
}
typeUnj.addEventListener('change', handleStatusChange);
typeUmum.addEventListener('change', handleStatusChange);

// Minimum date = tomorrow
function initDateConstraint(){
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split('T')[0];
  pickupDateInput.min = minDateStr;
  pickupDateInput.value = minDateStr;
}

// Summary & Mobile submit buttons trigger form submit
summarySubmitBtn.addEventListener('click', () => checkoutOrderForm.requestSubmit());
mobileBarSubmitBtn.addEventListener('click', () => checkoutOrderForm.requestSubmit());

// ---------- Order Submission & Digital Receipt ----------
checkoutOrderForm.addEventListener('submit', e => {
  e.preventDefault();

  if (cartCount() === 0) {
    alert('Keranjang belanjamu kosong.');
    return;
  }

  const pemesanType = document.querySelector('input[name="pemesanType"]:checked').value;
  const fullName = document.getElementById('fullName').value.trim();
  const prodi = prodiInput.value.trim();
  const fakultas = fakultasInput.value.trim();
  const domisili = domisiliInput.value.trim();
  const pickupDate = pickupDateInput.value;
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
      return { name: p.name, qty, price: p.price, subtotal: p.price * qty };
    }),
    total, needsDp, dpMinAmount
  };

  // 1. Tampilkan modal receipt
  receiptModal.classList.add('show');
  receiptOverlay.classList.add('show');

  // 2. Render & generate receipt image
  renderAndGenerateReceipt(lastOrder);

  // 3. Kirim ke WhatsApp
  sendToWhatsApp(lastOrder);

  // 4. Kosongkan keranjang di state & localStorage
  cart = {};
  syncCartStorage();
  renderCheckoutView();
  checkoutOrderForm.reset();
  initDateConstraint();
  handleStatusChange();
});

// ---------- Receipt Rendering & Image Generation ----------
function renderAndGenerateReceipt(order){
  // Tampilkan state loading
  receiptContent.innerHTML = `
    <div class="receipt-loading-box">
      <div class="spinner"></div>
      <span>Membuat struk pesanan...</span>
    </div>
  `;

  // Render template unconstrained
  receiptTicketTemplate.innerHTML = `
    <div class="ticket-watermark" aria-hidden="true">
      <div class="ticket-watermark-bg" style="background-image:url('/assets/croonies_logo.png');"></div>
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


  // Pastikan font (Baloo 2 / Poppins) sudah SELESAI di-load sebelum di-capture.
  // Tanpa ini, teks bisa reflow di tengah proses html2canvas (posisi teks jadi
  // tidak sinkron dengan background box-nya) karena font baru diterapkan
  // browser setelah layout awal dihitung dengan font fallback.
  const waitForFonts = (document.fonts && document.fonts.ready)
    ? document.fonts.ready
    : Promise.resolve();

  // Pastikan juga logo watermark (background-image) sudah selesai dimuat
  // sebelum di-capture, supaya tidak blank/kosong saat html2canvas berjalan.
  const waitForLogo = new Promise(resolve => {
    const preload = new Image();
    preload.onload = resolve;
    preload.onerror = resolve;
    preload.src = '/assets/croonies_logo.png';
    if (preload.complete) resolve();
  });

  Promise.all([waitForFonts, waitForLogo]).then(() => {
    // Tunggu 2 animation frame ekstra supaya browser sempat repaint
    // dengan font final sebelum di-capture.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const baseOptions = {
        backgroundColor: '#FFFFFF',
        scale: 2,
        useCORS: true,
        logging: false
      };

      html2canvas(receiptTicketTemplate, baseOptions).then(canvas => {
        if (isCanvasBlank(canvas)) {
          console.warn('Hasil capture struk kosong, mencoba render ulang...');
          return html2canvas(receiptTicketTemplate, baseOptions);
        }
        return canvas;
      }).then(canvas => {
        // Auto-crop whitespace di atas (hanya jika ada ruang transparan sebelum card)
        const croppedCanvas = cropCanvasWhitespaceTop(canvas);
        currentReceiptDataUrl = croppedCanvas.toDataURL('image/png');

        // Tampilkan hasil gambar langsung di modal
        receiptContent.innerHTML = `
          <img src="${currentReceiptDataUrl}" alt="Struk Pesanan ${order.orderCode}" class="receipt-img-display" />
        `;

        // Download otomatis
        downloadReceiptFile(order);

        // Copy ke clipboard jika didukung
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
        receiptContent.innerHTML = `<div style="color:var(--brown);font-size:13px;padding:24px;text-align:center;">Gagal memuat preview struk. Silakan klik download ulang struk.</div>`;
      });
    }));
  });
}

/**
 * Cek apakah hasil capture html2canvas kosong/blank (mis. gagal me-render
 * konten karena timing/positioning). Mengambil sampel beberapa titik acak
 * di seluruh canvas; kalau semuanya polos putih/transparan, kemungkinan
 * besar capture gagal dan perlu di-render ulang.
 * @param {HTMLCanvasElement} canvas
 * @returns {boolean}
 */
function isCanvasBlank(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  if (!width || !height) return true;

  const gridSize = 12; // grid gridSize x gridSize titik sampel
  let nonBlankFound = false;

  outer: for (let i = 1; i < gridSize; i++) {
    for (let j = 1; j < gridSize; j++) {
      const x = Math.floor((width / gridSize) * i);
      const y = Math.floor((height / gridSize) * j);
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const [r, g, b, a] = pixel;
      // Anggap "kosong" kalau pixel putih polos atau transparan penuh
      const isWhiteOrTransparent = (a === 0) || (r > 250 && g > 250 && b > 250);
      if (!isWhiteOrTransparent) {
        nonBlankFound = true;
        break outer;
      }
    }
  }

  return !nonBlankFound;
}

/**
 * Crop whitespace transparan di atas canvas jika ada, mempertahankan seluruh card secara utuh.
 * @param {HTMLCanvasElement} canvas
 * @returns {HTMLCanvasElement}
 */
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

// Build WhatsApp text
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
  msg += `\nMohon konfirmasi ya, terima kasih 🙏`;
  return msg;
}

function sendToWhatsApp(order){
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(buildWaMessage(order))}`;
  window.open(url, '_blank');
}

// Modal controls
closeReceiptBtn.addEventListener('click', () => {
  receiptModal.classList.remove('show');
  receiptOverlay.classList.remove('show');
});
receiptOverlay.addEventListener('click', () => {
  receiptModal.classList.remove('show');
  receiptOverlay.classList.remove('show');
});
downloadReceiptBtn.addEventListener('click', () => {
  if (currentReceiptDataUrl) {
    downloadReceiptFile(lastOrder);
  } else if (lastOrder) {
    renderAndGenerateReceipt(lastOrder);
  }
});
sendWaBtn.addEventListener('click', () => {
  if (lastOrder) sendToWhatsApp(lastOrder);
});

// ---------- Initialization ----------
initDateConstraint();
handleStatusChange();
renderCheckoutView();
window.addEventListener('resize', () => {
  if (cartCount() > 0 && window.innerWidth <= 880) {
    checkoutMobileBar.style.display = 'block';
  } else {
    checkoutMobileBar.style.display = 'none';
  }
});