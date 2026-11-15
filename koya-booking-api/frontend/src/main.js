const DEFAULTS = { baseUrl: 'http://localhost:5000/api', apiKey: 'koya-api-key' };
const STORAGE_KEY = 'koya-clinic-connection';
const state = { slots: [], selectedSlot: null, appointments: [] };
const $ = (selector) => document.querySelector(selector);
const slotGrid = $('#slot-grid');
const bookingDialog = $('#booking-modal');
const settingsDialog = $('#settings-modal');

function getConnection() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}

async function api(path, options = {}) {
  const { baseUrl, apiKey } = getConnection();
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey, ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.retryAfter = response.headers.get('Retry-After');
    throw error;
  }
  return payload;
}

function formatDate(value, options = { weekday: 'short', month: 'short', day: 'numeric' }) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, options).format(date);
}
function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function showToast(message, isError = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('is-error', isError);
  toast.classList.add('visible');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove('visible'), 3600);
}
function setConnectionStatus(connected, text) {
  $('#connection-label').textContent = text;
  $('.connection-pill').classList.toggle('connected', connected);
}

function renderSlots() {
  const query = $('#provider-filter').value.trim().toLowerCase();
  const filtered = state.slots.filter((slot) => (slot.provider || '').toLowerCase().includes(query));
  $('#slot-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'time' : 'times'} available`;
  $('#slots-empty').classList.toggle('hidden', filtered.length !== 0);
  slotGrid.innerHTML = filtered.map((slot) => {
    const start = new Date(slot.start);
    const day = Number.isNaN(start.getTime()) ? { weekday: '', day: '', month: '' } : {
      weekday: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(start),
      day: new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(start),
      month: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(start),
    };
    return `<article class="slot-card"><div class="slot-card-top"><div class="slot-date"><span>${escapeHtml(day.weekday)}</span><strong>${escapeHtml(day.day)}</strong><span>${escapeHtml(day.month)}</span></div><span class="availability"><span></span> Available</span></div><div class="slot-details"><h3>${escapeHtml(slot.provider || 'Koya care team')}</h3><p><span class="detail-icon">◷</span>${escapeHtml(formatTime(slot.start))} – ${escapeHtml(formatTime(slot.end))}</p></div><button class="slot-book" data-slot-id="${escapeHtml(slot.id || slot._id)}"><span>Book this time</span><span>↗</span></button></article>`;
  }).join('');
  slotGrid.querySelectorAll('.slot-book').forEach((button) => button.addEventListener('click', () => openBooking(button.dataset.slotId)));
}

async function loadSlots() {
  $('#slots-error').classList.add('hidden');
  $('#slot-count').textContent = 'Finding available times…';
  slotGrid.innerHTML = '<div class="loading-card"><span class="loader"></span>Finding your next good time…</div>';
  try {
    const result = await api('/slots');
    state.slots = Array.isArray(result) ? result : (result.slots || []);
    renderSlots();
    setConnectionStatus(true, 'Connected');
  } catch (error) {
    slotGrid.innerHTML = '';
    $('#slot-count').textContent = 'Connection needed';
    $('#slots-error').textContent = `${error.message}. Check your API URL and key in connection settings.`;
    $('#slots-error').classList.remove('hidden');
    setConnectionStatus(false, 'Connect API');
  }
}

function openBooking(slotId) {
  state.selectedSlot = state.slots.find((slot) => String(slot.id || slot._id) === String(slotId));
  if (!state.selectedSlot) return;
  const slot = state.selectedSlot;
  $('#selected-slot-copy').textContent = `${formatDate(slot.start, { weekday: 'long', month: 'long', day: 'numeric' })} · ${formatTime(slot.start)} with ${slot.provider}`;
  $('#booking-form').classList.remove('hidden');
  $('#booking-form').reset();
  $('#booking-message').classList.add('hidden');
  bookingDialog.showModal();
}

$('#booking-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  button.querySelector('span:first-child').textContent = 'Booking your visit…';
  try {
    const booking = await api('/bookings', {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ slot_id: state.selectedSlot.id || state.selectedSlot._id, name: form.get('name'), email: form.get('email') }),
    });
    $('#booking-form').classList.add('hidden');
    $('#booking-message').innerHTML = `<strong>You’re all booked.</strong><br />Your booking reference is <span>${escapeHtml(booking.id || booking._id || 'confirmed')}</span>. We’ll see you soon.`;
    $('#booking-message').classList.remove('hidden');
    showToast('Appointment confirmed. See you soon!');
    await loadSlots();
    const email = String(form.get('email')).trim();
    $('#appointments-email').value = email;
    await loadAppointments(email, false);
  } catch (error) {
    let message = error.message;
    if (error.status === 429) message = `Too many booking attempts. Please try again in ${error.retryAfter || 'a'} seconds.`;
    $('#booking-message').textContent = message;
    $('#booking-message').classList.remove('hidden');
    showToast(message, true);
  } finally {
    button.disabled = false;
    button.querySelector('span:first-child').textContent = 'Confirm appointment';
  }
});

function renderAppointments() {
  const container = $('#appointments-results');
  if (!state.appointments.length) {
    container.innerHTML = '<div class="appointments-empty">No appointments found for this email.</div>';
    return;
  }
  container.innerHTML = state.appointments.map((booking) => {
    const id = booking.id || booking._id;
    const isConfirmed = booking.status === 'confirmed';
    return `<article class="appointment-row"><div class="appointment-date"><strong>${escapeHtml(formatDate(booking.createdAt || booking.start, { month: 'short', day: 'numeric' }))}</strong><span>${escapeHtml(booking.status || 'confirmed')}</span></div><div class="appointment-info"><b>${escapeHtml(booking.name || 'Your appointment')}</b><span>${escapeHtml(booking.slot_id || booking.slotId || 'Koya Clinic')}</span><small>Booking ${escapeHtml(id || '')}</small></div>${isConfirmed ? `<button class="cancel-button" data-booking-id="${escapeHtml(id)}">Cancel</button>` : '<span class="cancelled-label">Cancelled</span>'}</article>`;
  }).join('');
  container.querySelectorAll('.cancel-button').forEach((button) => button.addEventListener('click', async () => {
    if (!window.confirm('Cancel this appointment?')) return;
    button.disabled = true;
    try {
      await api(`/bookings/${encodeURIComponent(button.dataset.bookingId)}`, { method: 'DELETE' });
      showToast('Your appointment has been cancelled.');
      await loadAppointments($('#appointments-email').value.trim());
      await loadSlots();
    } catch (error) { showToast(error.message, true); button.disabled = false; }
  }));
}

async function loadAppointments(email, showMessage = true) {
  if (!email) return;
  const results = $('#appointments-results');
  results.innerHTML = '<div class="loading-line"><span class="loader"></span>Looking up your visits…</div>';
  try {
    const result = await api(`/bookings?email=${encodeURIComponent(email)}&limit=50`);
    state.appointments = Array.isArray(result) ? result : (result.bookings || result.data || []);
    renderAppointments();
  } catch (error) {
    results.innerHTML = `<div class="appointments-error">${escapeHtml(error.message)}</div>`;
    if (showMessage) showToast(error.message, true);
  }
}

$('#appointments-form').addEventListener('submit', (event) => {
  event.preventDefault();
  loadAppointments($('#appointments-email').value.trim());
});
$('#provider-filter').addEventListener('input', renderSlots);
$('#clear-filter').addEventListener('click', () => { $('#provider-filter').value = ''; renderSlots(); });
$('#refresh-slots').addEventListener('click', loadSlots);
$('#settings-open').addEventListener('click', () => {
  const connection = getConnection();
  $('#api-base').value = connection.baseUrl;
  $('#api-key').value = connection.apiKey;
  settingsDialog.showModal();
});
$('#settings-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const baseUrl = $('#api-base').value.trim().replace(/\/+$/, '');
  const apiKey = $('#api-key').value.trim();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseUrl, apiKey }));
  settingsDialog.close();
  await loadSlots();
  if (!$('#appointments-email').value) return;
  await loadAppointments($('#appointments-email').value.trim(), false);
});

loadSlots();
