(function () {

const $ = (id) => document.getElementById(id);

const el = {
  title: $('l-title'),
  sub: $('l-sub'),
  main: $('l-main'),
  activate: $('l-activate'),
  success: $('l-success'),
  successText: $('l-success-text'),
  email: $('l-email'),
  msg: $('l-msg'),
  buy: $('l-buy'),
  activateLink: $('l-activate-link'),
  back: $('l-back'),
  activateBtn: $('l-activate-btn'),
};

function show(view) {
  el.main.hidden = view !== 'main';
  el.activate.hidden = view !== 'activate';
  el.success.hidden = view !== 'success';
}

function setMsg(text, type) {
  if (!el.msg) return;
  el.msg.textContent = text || '';
  el.msg.classList.toggle('error', type === 'error');
  el.msg.classList.toggle('success', type === 'success');
}

function render(state) {
  if (!state) return;
  const trial = state.trial || {};

  if (state.licensed) {
    el.sub.textContent = 'License active.';
    show('success');
    setTimeout(() => window.projectApi.closeWindow(), 1500);
    return;
  }

  if (trial.expired) {
    el.sub.textContent = 'Your 30-day trial has ended.';
  } else {
    el.sub.textContent = `${trial.daysRemaining} day${trial.daysRemaining === 1 ? '' : 's'} left in your trial.`;
  }

  show('main');
  if (state.email && el.email) el.email.value = state.email;
}

async function load() {
  try {
    render(await window.projectApi.getLicenseState());
  } catch (_) {
    setMsg('Could not load license status.', 'error');
  }
}

el.buy?.addEventListener('click', () => window.projectApi.openBuyLicense());

el.activateLink?.addEventListener('click', () => {
  setMsg('');
  show('activate');
});

el.back?.addEventListener('click', () => {
  setMsg('');
  show('main');
});

el.activateBtn?.addEventListener('click', async () => {
  const email = el.email?.value || '';
  setMsg('Activating...');
  el.activateBtn.disabled = true;
  try {
    const state = await window.projectApi.activateLicense(email);
    render(state);
    if (state?.licensed) window.projectApi.closeWindow();
  } catch (error) {
    const msg = String(error?.message || 'Activation failed.');
    const readable = msg.includes('license_not_found')
      ? 'Could not find a license for this email.'
      : msg.includes('activation_limit_reached')
        ? 'This license has reached its 2-device activation limit.'
        : msg;
    setMsg(readable, 'error');
  } finally {
    el.activateBtn.disabled = false;
  }
});

document.addEventListener('DOMContentLoaded', load);

})();
