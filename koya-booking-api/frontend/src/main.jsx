import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
async function request(path, options = {}, apiKey = '') {
  if (!apiBaseUrl) {
    throw new Error('Frontend is missing VITE_API_BASE_URL. Set it before building and redeploy the frontend.');
  }
  const response = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey, ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.retryAfter = response.headers.get('Retry-After');
    throw error;
  }
  return data;
}
const dateLabel = (value, options) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, options).format(date);
};
const timeLabel = (value) => dateLabel(value, { hour: 'numeric', minute: '2-digit' });

function Brand() {
  return <a href="#home" aria-label="Koya Clinic home" className="inline-flex items-center gap-2.5 font-display text-[21px] font-extrabold tracking-[-1px] text-forest no-underline"><span className="grid h-[27px] w-[27px] rotate-[-8deg] grid-cols-2 gap-[3px]" aria-hidden="true"><i className="rounded-[8px_3px] bg-leaf"/><i className="rounded-[8px_3px] bg-[#a9c17b]"/><i className="rounded-[8px_3px] bg-[#a9c17b]"/><i className="rounded-[8px_3px] bg-leaf"/></span><span>koya<span className="font-medium text-[#829088]"> clinic</span></span></a>;
}
function Eyebrow({ children, light = false }) {
  return <div className={`flex items-center gap-2.5 text-[9px] font-bold tracking-[2px] ${light ? 'text-[#adbea9]' : 'text-[#72877b]'}`}><span className={light ? 'h-px w-[23px] bg-[#a1bc8f]' : 'h-px w-[23px] bg-[#95a98a]'}/>{children}</div>;
}
function HeroArt() {
  return <div aria-hidden="true" className="relative mx-auto h-[375px] w-full max-w-[430px] max-sm:scale-[.84] max-sm:origin-top">
    <div className="absolute left-1/2 top-1/2 h-[320px] w-[330px] -translate-x-1/2 -translate-y-1/2 rotate-[-11deg] rounded-[50%_45%_43%_48%] bg-[#e4ead8]"/><div className="absolute right-[85px] top-[34px] h-14 w-14 rounded-full bg-[#d7e3aa] max-sm:right-6"/>
    <div className="absolute right-6 top-[91px] h-[123px] w-[130px] rotate-[8deg] rounded-xl bg-white p-[18px] shadow-[0_20px_50px_rgba(57,76,59,.12)]"><span className="mb-[13px] block h-2 w-[42px] rounded-full bg-[#e6eed5]"/><span className="my-2 block h-[6px] w-[76px] rounded-full bg-[#ebeeea]"/><span className="my-2 block h-[6px] w-[50px] rounded-full bg-[#ebeeea]"/><span className="absolute bottom-3.5 right-4 grid h-[23px] w-[23px] place-items-center rounded-full bg-[#e7efd8] text-xs text-[#6a8c5f]">✓</span></div>
    <div className="absolute left-1/2 top-[83px] h-[211px] w-[259px] -translate-x-1/2 rotate-[-3deg] rounded-xl bg-white p-[21px_22px] shadow-[0_20px_50px_rgba(57,76,59,.12)] max-sm:top-[57px]"><div className="flex items-center justify-between text-[8px] font-bold tracking-[1.3px] text-[#849087]"><span>YOUR NEXT VISIT</span><span className="grid h-[23px] w-[23px] place-items-center rounded-full bg-[#f0f4e8] text-[13px] text-[#719064]">✳</span></div><div className="my-3 flex items-center gap-3 font-display text-[42px] font-semibold leading-none tracking-[-2px]">12 <span className="font-sans text-[11px] leading-[1.4] tracking-normal">Thursday<br/><small className="text-[9px] font-medium text-[#9aa39c]">November 2026</small></span></div><div className="h-px bg-[#edf0ec]"/><div className="mt-3.5 flex items-center gap-2"><span className="grid h-[31px] w-[31px] place-items-center rounded-full bg-[#d9e6d3] font-display text-xs text-[#54765f]">S</span><span><b className="block text-[10px] text-[#40584b]">Dr. Sarah Connor</b><small className="mt-[3px] block text-[8px] text-[#929b94]">Family medicine</small></span></div></div>
    <div className="absolute bottom-[29px] left-[25px] grid h-[104px] w-[104px] rotate-[-10deg] content-center rounded-full bg-[#d6e5b1] pl-[19px] text-[10px] leading-[1.45] text-[#52704e] shadow-[0_9px_22px_#9ba88528] max-sm:bottom-2">A healthier<br/><b className="text-[13px]">you, soon.</b><span className="absolute right-[15px] top-[15px] text-base">↗</span></div><span className="absolute left-[76px] top-[78px] text-[22px] text-[#a2b776]">✳</span><span className="absolute bottom-[71px] right-[61px] text-[17px] text-[#a2b776]">✦</span>
  </div>;
}
function SlotCard({ slot, onBook }) {
  return <article className="rounded-[9px] border border-[#e9ede7] bg-white p-[17px] transition duration-200 hover:-translate-y-[3px] hover:shadow-[0_12px_25px_#43584512]"><div className="flex items-start justify-between"><div className="grid grid-cols-[auto_auto] items-center gap-x-1.5"><span className="col-span-2 text-[9px] uppercase tracking-[.8px] text-[#839087]">{dateLabel(slot.start, { weekday: 'short' })}</span><strong className="font-display text-[25px] font-semibold leading-tight text-[#264336]">{dateLabel(slot.start, { day: '2-digit' })}</strong><span className="text-[10px] text-[#839087]">{dateLabel(slot.start, { month: 'short' })}</span></div><span className="flex items-center gap-[5px] rounded-full bg-[#f1f6ed] px-[7px] py-[5px] text-[9px] text-[#719073]"><i className="h-[5px] w-[5px] rounded-full bg-[#77a477]"/>Available</span></div><div className="my-[17px]"><h3 className="mb-[7px] text-[13px] font-semibold text-[#31473d]">{slot.provider || 'Koya care team'}</h3><p className="m-0 text-[10px] text-[#849088]">◷ <span className="ml-1.5">{timeLabel(slot.start)} – {timeLabel(slot.end)}</span></p></div><button onClick={() => onBook(slot)} className="flex h-[35px] w-full items-center justify-between rounded-[5px] border border-[#e4eae1] bg-[#fafbf9] px-2.5 text-[10px] font-semibold text-[#54755f] transition hover:bg-[#edf3e8]"><span>Book this time</span><span className="text-[15px]">↗</span></button></article>;
}
function Modal({ titleId, onClose, children }) {
  return <div className="fixed inset-0 z-20 grid place-items-center bg-[#1a312b]/50 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative w-full max-w-[440px] rounded-xl bg-white px-[37px] pb-[30px] pt-[35px] shadow-2xl max-sm:px-6"><button onClick={onClose} aria-label="Close" className="absolute right-[17px] top-[15px] grid h-[29px] w-[29px] place-items-center rounded-full bg-[#f2f5ef] text-xl text-[#718076]">×</button>{children}</section></div>;
}

function App() {
  const [slots, setSlots] = useState([]), [filter, setFilter] = useState(''), [loading, setLoading] = useState(true), [slotsError, setSlotsError] = useState(''), [connected, setConnected] = useState(false);
  const [bookingSlot, setBookingSlot] = useState(null), [bookingBusy, setBookingBusy] = useState(false), [bookingMessage, setBookingMessage] = useState(''), [bookingSuccess, setBookingSuccess] = useState(false);
  const [cancellation, setCancellation] = useState(null), [cancellationBusy, setCancellationBusy] = useState(false);
  const [email, setEmail] = useState(''), [appointments, setAppointments] = useState([]), [appointmentMessage, setAppointmentMessage] = useState(''), [appointmentBusy, setAppointmentBusy] = useState(false);
  const [apiKey, setApiKey] = useState(''), [apiKeyInput, setApiKeyInput] = useState('');
  const [authError, setAuthError] = useState(''), [authBusy, setAuthBusy] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true), [toast, setToast] = useState(null);
  const pendingBookingRef = useRef(null);
  const notify = (message, error = false) => { setToast({ message, error }); window.setTimeout(() => setToast(null), 3500); };
  async function loadSlots(key = apiKey) {
    setLoading(true); setSlotsError('');
    try { const data = await request('/slots', {}, key); setSlots(Array.isArray(data) ? data : (data.slots || [])); setConnected(true); }
    catch (error) { setSlotsError(error.message + '. Check your API URL and key in connection settings.'); setConnected(false); }
    finally { setLoading(false); }
  }
  async function loadAppointments(address, announce = true, key = apiKey) {
    if (!address) return;
    setAppointmentBusy(true); setAppointmentMessage('');
    try { const query = new URLSearchParams({ email: address, limit: '50' }); const data = await request('/bookings?' + query.toString(), {}, key); setAppointments(Array.isArray(data) ? data : (data.bookings || data.data || [])); }
    catch (error) { setAppointments([]); setAppointmentMessage(error.message); if (announce) notify(error.message, true); }
    finally { setAppointmentBusy(false); }
  }
  const visibleSlots = slots.filter((slot) => (slot.provider || '').toLowerCase().includes(filter.trim().toLowerCase()));
  async function connect(event) {
    event.preventDefault();
    const candidate = apiKeyInput.trim();
    if (!candidate) { setAuthError('Enter your API key to continue.'); return; }
    setAuthBusy(true); setAuthError('');
    try {
      await request('/health', {}, candidate);
      setApiKey(candidate);
      setConnected(true);
      setSettingsOpen(false);
      setApiKeyInput('');
      setWelcomeVisible(true);
      void loadSlots(candidate);
      window.setTimeout(() => setWelcomeVisible(false), 1350);
    } catch (error) {
      setConnected(false);
      const message = error.status === 401
        ? 'The API at the configured URL rejected this key. Confirm the frontend points to the intended backend and that the backend’s configured key matches.'
        : error.status === 429
          ? 'Too many incorrect API key attempts. Try again in ' + (error.retryAfter || 'a few') + ' seconds.'
          : `Could not connect to the API. ${error.message}`;
      setAuthError(message);
    } finally { setAuthBusy(false); }
  }
  async function book(event) {
    event.preventDefault(); setBookingBusy(true); setBookingMessage('');
    const fields = new FormData(event.currentTarget), patientEmail = String(fields.get('email')).trim();
    const payload = {
      slot_id: bookingSlot.id || bookingSlot._id,
      name: String(fields.get('name')).trim(),
      email: patientEmail,
    };
    const payloadSignature = JSON.stringify(payload);
    if (!pendingBookingRef.current || pendingBookingRef.current.payloadSignature !== payloadSignature) {
      pendingBookingRef.current = { payloadSignature, key: crypto.randomUUID() };
    }
    const idempotencyKey = pendingBookingRef.current.key;
    try {
      const result = await request('/bookings', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload) }, apiKey);
      pendingBookingRef.current = null;
      setBookingMessage('Booking confirmed. Your reference is ' + (result.id || result._id || 'confirmed') + '.'); setBookingSuccess(true); setEmail(patientEmail); notify('Appointment confirmed. See you soon!');
      await loadSlots(); await loadAppointments(patientEmail, false);
    } catch (error) {
      const message = error.status === 429
        ? 'Too many booking attempts. Try again in ' + (error.retryAfter || 'a') + ' seconds. Retrying this same booking will reuse its request key.'
        : error.status
          ? error.message
          : 'We could not confirm whether the booking completed. Retry the same details to safely check again.';
      setBookingMessage(message); notify(message, true);
    }
    finally { setBookingBusy(false); }
  }
  async function confirmCancellation() {
    if (!cancellation) return;
    setCancellationBusy(true);
    try {
      await request('/bookings/' + encodeURIComponent(cancellation.id || cancellation._id), { method: 'DELETE' }, apiKey);
      setCancellation(null);
      notify('Your appointment has been cancelled.');
      await loadAppointments(email);
      await loadSlots();
    } catch (error) { notify(error.message, true); }
    finally { setCancellationBusy(false); }
  }
  return <>
  <div id="home" aria-hidden={!apiKey || settingsOpen || welcomeVisible} inert={!apiKey || settingsOpen || welcomeVisible} className={`mx-auto max-w-[1440px] px-[7.1%] max-md:px-[5%] max-sm:px-5 ${!apiKey || settingsOpen || welcomeVisible ? 'pointer-events-none select-none blur-sm' : ''}`}>
    <header className="flex h-[92px] items-center justify-between border-b border-[#19332e]/10 max-sm:h-[72px]"><Brand/><nav aria-label="Main navigation" className="ml-[72px] flex gap-[38px] max-md:ml-0 max-md:gap-6 max-sm:hidden"><a className="relative py-2.5 text-[13px] font-semibold text-forest after:absolute after:bottom-[-21px] after:left-0 after:right-0 after:h-0.5 after:bg-[#668b64]" href="#book">Book a visit</a><a className="py-2.5 text-[13px] font-semibold text-[#7b8881] no-underline hover:text-forest" href="#appointments">My appointments</a></nav><button onClick={() => { setApiKeyInput(''); setAuthError(''); setSettingsOpen(true); }} className="flex items-center gap-2 rounded-full border border-[#dfe6dc] bg-white px-3.5 py-2.5 text-[11px] font-semibold text-[#5b6e63]"><i className={connected ? 'h-[7px] w-[7px] rounded-full bg-[#77a477]' : 'h-[7px] w-[7px] rounded-full bg-[#d5ab65]'}/>{connected ? 'Connection locked' : 'Connect API'}<span className="ml-0.5 text-sm text-[#88938b]">⚙</span></button></header>
    <main>
      <section id="book" className="grid min-h-[485px] grid-cols-2 items-center gap-4 py-10 max-sm:grid-cols-1 max-sm:pb-3 max-sm:pt-[54px]"><div className="pb-2"><Eyebrow>CARE THAT FITS YOUR LIFE</Eyebrow><h1 className="my-6 font-display text-[60px] font-semibold leading-[1.1] tracking-[-2.6px] text-forest max-md:text-[51px] max-sm:mb-4 max-sm:mt-5 max-sm:text-[50px]">A little time<br/>for <em className="not-italic text-moss">your health.</em></h1><p className="m-0 text-sm text-[#89948e]">Find a time that works for you. Thoughtful care, made easy.</p><div className="mt-10 flex items-center gap-3 text-[11px] leading-[1.6] text-[#849088] max-sm:mt-6"><span className="grid h-[31px] w-[31px] place-items-center rounded-full bg-[#e7eedb] text-[15px] text-[#668661]">✳</span><span>Simple booking. Real people.<br/><strong className="font-semibold text-[#506259]">Here when you need us.</strong></span></div></div><HeroArt/></section>
      <section aria-labelledby="slots-title" className="border-t border-[#19332e]/10 py-11 pb-[90px] max-sm:pb-[60px]"><div className="flex items-end justify-between gap-3"><div><Eyebrow>MAKE IT YOURS</Eyebrow><h2 id="slots-title" className="mb-2 mt-3.5 font-display text-4xl font-semibold tracking-[-1.7px] max-sm:text-[29px]">Choose your moment.</h2><p className="m-0 text-xs text-[#87938b]">Browse available visits and book in just a few steps.</p></div><button onClick={loadSlots} className="whitespace-nowrap py-3 text-[11px] font-semibold text-[#648467]"><span className="mr-1 text-lg">↻</span>Refresh times</button></div>
        <div className="my-[30px] flex items-center justify-between max-sm:mt-[23px]"><label className="flex h-10 w-[257px] items-center gap-2 rounded-md border border-[#e1e7df] bg-white px-3 text-[#8c9a91] max-sm:w-[210px]"><span className="text-[22px] leading-none">⌕</span><input value={filter} onChange={(event) => setFilter(event.target.value)} type="search" placeholder="Search by provider" aria-label="Search by provider" className="w-full bg-transparent text-xs text-forest outline-none placeholder:text-[#a5afa8]"/></label><span className="flex items-center gap-2 text-[10px] text-[#8a958d]"><i className="h-[7px] w-[7px] rounded-full bg-[#77a477]"/>{loading ? 'Finding available times…' : visibleSlots.length + ' ' + (visibleSlots.length === 1 ? 'time' : 'times') + ' available'}</span></div>
        {slotsError && <div role="alert" className="mb-4 rounded-md border border-[#f0d5ca] bg-[#fff1ed] p-3.5 text-xs text-[#a65340]">{slotsError}</div>}
        {loading ? <div className="flex h-[120px] items-center justify-center gap-3 text-xs text-[#849088]"><span className="animate-spin-soft h-[15px] w-[15px] rounded-full border-2 border-[#dce7d5] border-t-[#6b8b66]"/>Finding your next good time…</div> : visibleSlots.length ? <div className="grid grid-cols-3 gap-3.5 max-md:grid-cols-2 max-sm:grid-cols-1">{visibleSlots.map((slot) => <SlotCard key={slot.id || slot._id} slot={slot} onBook={(selected) => { setBookingSlot(selected); setBookingMessage(''); setBookingSuccess(false); }}/>)}</div> : !slotsError && <div className="rounded-lg border border-dashed border-[#dce5d8] bg-white py-12 text-center"><div className="text-3xl text-[#90a875]">☼</div><h3 className="mb-1 mt-3 font-display text-lg font-semibold">No times just yet</h3><p className="mt-0 text-xs text-[#89948e]">Try another provider or check back in a little while.</p>{filter && <button onClick={() => setFilter('')} className="mt-2 rounded border border-[#dce5d8] px-3 py-2 text-[10px] font-semibold text-[#55745e]">Show all providers</button>}</div>}
      </section>
      <section id="appointments" className="relative mb-[75px] grid min-h-[327px] grid-cols-[1fr_1.1fr] items-center gap-[55px] overflow-hidden rounded-xl bg-[#27473d] px-[6%] py-11 max-md:gap-[30px] max-md:px-[5%] max-sm:mb-[50px] max-sm:grid-cols-1 max-sm:gap-6 max-sm:px-[22px] max-sm:py-[33px]"><span aria-hidden="true" className="pointer-events-none absolute -bottom-[94px] -right-6 text-[260px] text-white/[.03]">✳</span><div className="relative z-[1]"><Eyebrow light>YOUR CARE, ALL IN ONE PLACE</Eyebrow><h2 className="mb-3 mt-[17px] font-display text-[37px] font-semibold leading-[1.13] tracking-[-1.7px] text-white max-sm:mb-2 max-sm:mt-[13px] max-sm:text-[34px]">Coming up<br/><em className="not-italic text-[#c4d99a]">for you.</em></h2><p className="m-0 max-w-[255px] text-[11px] leading-[1.75] text-[#b8c7c0]">Already booked? Enter your email to see your appointments and manage your plans.</p></div>
        <div className="relative z-[1] rounded-[9px] bg-white p-[22px_24px] shadow-[0_14px_35px_#142b222c] max-sm:p-[19px]"><div className="flex items-center justify-between"><div><span className="text-[8px] font-bold tracking-[1.3px] text-[#91a096]">PATIENT PORTAL</span><h3 className="mb-0 mt-1 font-display text-base font-semibold">Find your appointments</h3></div><span className="grid h-[29px] w-[29px] place-items-center rounded-full bg-[#f0f4e9] text-[#74916e]">↗</span></div><form onSubmit={(event) => { event.preventDefault(); loadAppointments(email); }} className="mt-[19px]"><label htmlFor="appointments-email" className="mb-2 block text-[10px] font-semibold text-[#697970]">Email address</label><div className="flex gap-2"><input id="appointments-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-[39px] min-w-0 flex-1 rounded-[5px] border border-[#e4e9e2] px-3 text-[11px] outline-none focus:border-[#8da984]"/><button disabled={appointmentBusy} className="whitespace-nowrap rounded-[5px] bg-[#29493e] px-3 text-[10px] font-semibold text-white disabled:opacity-70">{appointmentBusy ? 'Looking…' : <>Find visits <span className="ml-2">→</span></>}</button></div><p className="mb-0 mt-2 text-[9px] text-[#9aa49d]">We’ll use the email you booked with.</p></form>
          {appointmentBusy && <div className="mt-3 border-t border-[#edf0ec] pt-3 text-[10px] text-[#849088]">Looking up your visits…</div>}{!appointmentBusy && appointmentMessage && <div className="mt-3 border-t border-[#edf0ec] pt-3 text-[10px] text-[#b35d48]">{appointmentMessage}</div>}{!appointmentBusy && appointments.length > 0 && <div className="mt-3 max-h-[210px] overflow-auto border-t border-[#edf0ec] pt-2">{appointments.map((booking) => { const id = booking.id || booking._id; return <article key={id} className="flex items-center gap-2.5 border-b border-[#f0f2ef] py-2"><div className="min-w-[58px] text-center"><strong className="block font-display text-xs font-semibold text-[#48654f]">{dateLabel(booking.start, { month: 'short', day: 'numeric' })}</strong><span className="block text-[9px] text-[#6f8075]">{booking.start ? timeLabel(booking.start) : 'Time TBD'}</span></div><div className="min-w-0 flex-1"><b className="block truncate text-[10px] text-[#40554a]">{booking.provider || booking.name || 'Your appointment'}</b><span className="mt-[3px] block truncate text-[8px] text-[#909c94]">{booking.start && booking.end ? timeLabel(booking.start) + ' – ' + timeLabel(booking.end) : booking.name || 'Koya Clinic'}</span><small className="mt-[3px] block truncate text-[8px] text-[#909c94]">Booking id: {id}</small></div>{booking.status === 'confirmed' ? <button type="button" onClick={() => setCancellation(booking)} className="rounded border border-[#e8d7d2] px-2 py-1.5 text-[8px] font-semibold text-[#ac6654]">Cancel</button> : <span className="text-[8px] text-[#939c95]">Cancelled</span>}</article>; })}</div>}{!appointmentBusy && email && !appointmentMessage && appointments.length === 0 && <div className="mt-3 border-t border-[#edf0ec] pt-3 text-[10px] text-[#849088]">No appointments found for this email.</div>}</div>
      </section>
    </main>
    <footer className="flex min-h-[81px] items-center justify-between border-t border-[#e3e8e1] text-[10px] text-[#9aa49d] max-sm:min-h-[91px] max-sm:flex-wrap max-sm:gap-2 max-sm:py-4"><Brand/><span className="max-sm:hidden">Good care starts with feeling at ease.</span><span className="text-[#a5ada7]">© 2026 Koya Clinic</span></footer>
    {bookingSlot && <Modal titleId="booking-title" onClose={() => setBookingSlot(null)}><span className="mb-[19px] grid h-[39px] w-[39px] place-items-center rounded-full bg-[#edf3e5] text-[#729064]">✳</span><Eyebrow>YOUR VISIT</Eyebrow><h2 id="booking-title" className="mb-1 mt-2.5 font-display text-[27px] font-semibold tracking-[-1.1px]">Let’s make it official.</h2><p className="mb-5 text-[11px] leading-relaxed text-[#839087]">{dateLabel(bookingSlot.start, { weekday: 'long', month: 'long', day: 'numeric' })} · {timeLabel(bookingSlot.start)} with {bookingSlot.provider}</p>{bookingSuccess ? <div role="status" className="rounded-md bg-[#f1f6ec] p-3.5 text-[11px] leading-relaxed text-[#587450]"><strong className="font-display text-[15px]">You’re all booked.</strong><br/>{bookingMessage}</div> : <form onSubmit={book}><label htmlFor="patient-name" className="mb-2 block text-[10px] font-semibold text-[#697970]">Your name</label><input id="patient-name" name="name" autoComplete="name" placeholder="Full name" required className="mb-4 h-[42px] w-full rounded-[5px] border border-[#e4e9e2] px-3 text-[11px] outline-none"/><label htmlFor="patient-email" className="mb-2 block text-[10px] font-semibold text-[#697970]">Email address</label><input id="patient-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required className="mb-4 h-[42px] w-full rounded-[5px] border border-[#e4e9e2] px-3 text-[11px] outline-none"/>{bookingMessage && <p role="alert" className="mb-3 text-[11px] text-[#a65340]">{bookingMessage}</p>}<button disabled={bookingBusy} className="flex h-[43px] w-full items-center justify-between rounded-[5px] bg-[#345649] px-3.5 text-[11px] font-semibold text-white disabled:opacity-70"><span>{bookingBusy ? 'Booking your visit…' : 'Confirm appointment'}</span><span>→</span></button><p className="mb-0 mt-2 text-[9px] text-[#9aa49d]">By booking, your time will be reserved just for you.</p></form>}</Modal>}
    {cancellation && <Modal titleId="cancel-title" onClose={() => !cancellationBusy && setCancellation(null)}><span className="mb-[19px] grid h-[39px] w-[39px] place-items-center rounded-full bg-[#fbefeb] text-[#aa6b58]">!</span><Eyebrow>APPOINTMENT UPDATE</Eyebrow><h2 id="cancel-title" className="mb-2 mt-2.5 font-display text-[27px] font-semibold tracking-[-1.1px]">Cancel this visit?</h2><p className="mb-5 text-[11px] leading-relaxed text-[#839087]">You’re about to cancel your appointment{cancellation.provider ? ' with ' + cancellation.provider : ''}{cancellation.start ? ' on ' + dateLabel(cancellation.start, { weekday: 'long', month: 'long', day: 'numeric' }) + ' at ' + timeLabel(cancellation.start) : ''}. The time will be released for another patient.</p><div className="flex flex-col-reverse gap-2 sm:flex-row"><button type="button" disabled={cancellationBusy} onClick={() => setCancellation(null)} className="h-[43px] flex-1 rounded-[5px] border border-[#dfe6dc] bg-white text-[11px] font-semibold text-[#52665a] disabled:opacity-60">Keep appointment</button><button type="button" disabled={cancellationBusy} onClick={confirmCancellation} className="h-[43px] flex-1 rounded-[5px] bg-[#9d5142] text-[11px] font-semibold text-white disabled:opacity-60">{cancellationBusy ? 'Cancelling…' : 'Cancel appointment'}</button></div></Modal>}
    {toast && <div role="status" aria-live="polite" className={toast.error ? 'fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-md bg-[#944f3c] px-[18px] py-3 text-[11px] text-white shadow-xl' : 'fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-md bg-[#2d4b40] px-[18px] py-3 text-[11px] text-white shadow-xl'}>{toast.message}</div>}
  </div>
  {settingsOpen && <div className="fixed inset-0 z-40 grid place-items-center bg-[#19332e]/35 p-4 backdrop-blur-md"><section role="dialog" aria-modal="true" aria-labelledby="settings-title" className="relative w-full max-w-[430px] rounded-2xl border border-white/70 bg-white px-8 pb-8 pt-9 shadow-[0_28px_100px_rgba(18,43,33,.3)] max-sm:px-6"><Brand/>{apiKey && <button type="button" onClick={() => { setSettingsOpen(false); setAuthError(''); }} aria-label="Close connection settings" className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full bg-[#f2f5ef] text-xl text-[#718076]">×</button>}<div className="mt-8"><Eyebrow>{apiKey ? 'SESSION SECURITY' : 'SECURE API CONNECTION'}</Eyebrow><h1 id="settings-title" className="mb-2 mt-3 font-display text-[30px] font-semibold tracking-[-1.3px]">{apiKey ? 'Connection locked.' : 'Connect to Koya.'}</h1><p className="mb-6 text-[12px] leading-relaxed text-[#839087]">{apiKey ? 'Your credentials are locked for this session. Reload the page to connect with another key.' : 'Enter your API key to unlock appointment times and patient booking.'}</p>{apiKey ? <div><label htmlFor="locked-api-key" className="mb-2 block text-[10px] font-semibold text-[#697970]">X-API-Key</label><input id="locked-api-key" type="password" value={apiKey} readOnly disabled className="h-11 w-full rounded-md border border-[#e4e9e2] bg-[#f5f7f3] px-3 text-[12px] text-[#76847d]"/><p className="mb-0 mt-3 text-[9px] text-[#9aa49d]">This credential cannot be changed while the dashboard is open.</p></div> : <form onSubmit={connect}><label htmlFor="api-key" className="mb-2 block text-[10px] font-semibold text-[#697970]">X-API-Key</label><input id="api-key" type="password" value={apiKeyInput} onChange={(event) => setApiKeyInput(event.target.value)} autoComplete="off" autoFocus placeholder="Enter your API key" required className="mb-3 h-11 w-full rounded-md border border-[#e4e9e2] px-3 text-[12px] outline-none focus:border-[#8da984] focus:ring-2 focus:ring-[#d9e8d4]"/>{authError && <p role="alert" className="mb-3 rounded-md border border-[#f0d5ca] bg-[#fff1ed] px-3 py-2.5 text-[11px] text-[#a65340]">{authError}</p>}<button disabled={authBusy} className="flex h-11 w-full items-center justify-between rounded-md bg-[#345649] px-4 text-[11px] font-semibold text-white transition hover:bg-[#29473d] disabled:cursor-wait disabled:opacity-70"><span>{authBusy ? 'Checking API key…' : 'Continue securely'}</span><span>→</span></button><p className="mb-0 mt-4 text-[9px] leading-relaxed text-[#9aa49d]">Your key is held only for this browser session and is not saved to local storage.</p></form>}</div></section></div>}
  {welcomeVisible && <div aria-live="polite" className="fixed inset-0 z-50 grid place-items-center bg-[#19332e]/35 p-4 backdrop-blur-md"><div className="animate-[welcome-splash_1.35s_ease-in-out_forwards] text-center"><span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#e5edda] text-2xl text-[#668661] shadow-lg">✳</span><Eyebrow>KOYA CLINIC</Eyebrow><h1 className="mt-4 font-display text-4xl font-semibold tracking-[-1.5px] text-white">Welcome in.</h1><p className="mt-2 text-sm text-white/80">Your care, at your pace.</p></div></div>}
  </>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
