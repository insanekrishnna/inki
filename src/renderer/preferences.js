const DISPLAY_LABELS = ['0.5s', '1s', '2s', '5s', '10s', '15s', '30s', '∞'];

function sliderValueToLabel(v) {
  const idx = Math.min(Math.max(Math.round(v), 0), 7);
  return DISPLAY_LABELS[idx];
}

const recordingFormatSetting = document.querySelector('#recording-format-setting');
const recordingAutozoomSetting = document.querySelector('#recording-autozoom-setting');
const hideDesktopIconsSetting = document.querySelector('#hide-desktop-icons-setting');
const captureProjectSetting = document.querySelector('#capture-project-setting');
const autoHideDelaySetting = document.querySelector('#auto-hide-delay-setting');
const autoHideDelaySettingValue = document.querySelector('#auto-hide-delay-setting-value');
const autoHideDelayDecrement = document.querySelector('#auto-hide-delay-decrement');
const autoHideDelayIncrement = document.querySelector('#auto-hide-delay-increment');
const defaultSavePathSetting = document.querySelector('#default-save-path-setting');
const chooseDefaultSavePathSetting = document.querySelector('#choose-default-save-path-setting');
const clearDefaultSavePathSetting = document.querySelector('#clear-default-save-path-setting');
const licenseStatusSetting = document.querySelector('#license-status-setting');
const licenseEmailSetting = document.querySelector('#license-email-setting');
const buyLicenseSetting = document.querySelector('#buy-license-setting');
const activateLicenseSetting = document.querySelector('#activate-license-setting');
const licenseCopy = document.querySelector('.preferences-field--license .preferences-copy');
const licenseActiveState = document.querySelector('#license-active-state');
const licenseActivationForm = document.querySelector('#license-activation-form');
const licenseActiveEmail = document.querySelector('#license-active-email');
const licensePurchasedAt = document.querySelector('#license-purchased-at');
const licenseKeyDisplay = document.querySelector('#license-key-display');
const licenseDevicesDisplay = document.querySelector('#license-devices-display');
const licenseDeactivateBtn = document.querySelector('#license-deactivate-btn');
const preferencesTabs = Array.from(document.querySelectorAll('[data-preferences-tab]'));
const preferencesSections = Array.from(document.querySelectorAll('[data-preferences-section]'));


const settings = {
  format: 'mp4',
  autoZoom: true,
  hideDesktopIcons: true,
  captureProject: false,
  autoHideDelay: 0,
  defaultSavePath: '',
};

const RECORDING_SETTINGS_KEY = 'yourproject-recording-settings';
// Legacy key retained for one-time migration from builds branded as Project.
const LEGACY_RECORDING_SETTINGS_KEY = 'project-recording-settings';

function activatePreferencesTab(tabName = 'general') {
  preferencesTabs.forEach((tab) => {
    const isActive = tab.dataset.preferencesTab === tabName;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  preferencesSections.forEach((section) => {
    section.classList.toggle('active', section.dataset.preferencesSection === tabName);
  });

  renderAutoHideDelay();
}

function clampAutoHideDelay(value) {
  return Math.min(Math.max(Math.round(Number(value) || 0), 0), DISPLAY_LABELS.length - 1);
}

function renderAutoHideDelay(previousValue = settings.autoHideDelay) {
  if (!autoHideDelaySetting || !autoHideDelaySettingValue) return;
  const nextValue = clampAutoHideDelay(settings.autoHideDelay);
  const previous = clampAutoHideDelay(previousValue);
  settings.autoHideDelay = nextValue;
  autoHideDelaySetting.value = String(nextValue);
  autoHideDelaySettingValue.innerHTML = `<span class="odometer-digit">${sliderValueToLabel(nextValue)}</span>`;
  autoHideDelaySettingValue.classList.toggle('output-infinity', sliderValueToLabel(nextValue) === '∞');
  autoHideDelaySettingValue.classList.remove('is-increasing', 'is-decreasing');
  if (nextValue !== previous) {
    autoHideDelaySettingValue.classList.add(nextValue > previous ? 'is-increasing' : 'is-decreasing');
  }
  if (autoHideDelayDecrement) autoHideDelayDecrement.disabled = nextValue === 0;
  if (autoHideDelayIncrement) autoHideDelayIncrement.disabled = nextValue === DISPLAY_LABELS.length - 1;
}

function setAutoHideDelay(value, shouldSave = true) {
  const previousValue = settings.autoHideDelay;
  settings.autoHideDelay = clampAutoHideDelay(value);
  renderAutoHideDelay(previousValue);
  if (shouldSave && settings.autoHideDelay !== previousValue) saveSettings();
}

async function loadSettings() {
  try {
    const raw = localStorage.getItem(RECORDING_SETTINGS_KEY) || localStorage.getItem(LEGACY_RECORDING_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      settings.format = parsed?.format === 'gif' ? 'gif' : 'mp4';
      settings.autoZoom = parsed?.autoZoom !== false;
      settings.hideDesktopIcons = parsed?.hideDesktopIcons !== false;
      settings.captureProject = parsed?.captureProject === true;
      settings.autoHideDelay = typeof parsed?.autoHideDelay === 'number' ? clampAutoHideDelay(parsed.autoHideDelay) : 0;
    }
  } catch (_) {}

  try {
    const persistedSettings = await window.projectApi.getSettings();
    settings.defaultSavePath = typeof persistedSettings?.defaultSavePath === 'string' ? persistedSettings.defaultSavePath : settings.defaultSavePath;
  } catch (_) {}

  recordingFormatSetting.value = settings.format;
  recordingAutozoomSetting.checked = settings.autoZoom;
  hideDesktopIconsSetting.checked = settings.hideDesktopIcons;
  captureProjectSetting.checked = settings.captureProject;
  renderAutoHideDelay();
  defaultSavePathSetting.value = settings.defaultSavePath;
}

function setLicenseMessage(message = '', type = '') {
  if (!licenseStatusSetting) return;
  licenseStatusSetting.textContent = message;
  licenseStatusSetting.classList.toggle('error', type === 'error');
  licenseStatusSetting.classList.toggle('success', type === 'success');
}

function renderLicenseState(state) {
  if (!state || !licenseStatusSetting) return;
  if (licenseEmailSetting && state.email) licenseEmailSetting.value = state.email;

  if (state.licensed) {
    if (licenseCopy) {
      licenseCopy.style.display = 'none';
      document.querySelector('.preferences-field--license')?.classList.add('license-field--active');
    }
    if (licenseActiveState) {
      licenseActiveState.style.display = '';
      licenseActiveState.removeAttribute('hidden');
    }
    if (licenseActivationForm) licenseActivationForm.style.display = 'none';
    if (licenseActiveEmail && state.email) {
      licenseActiveEmail.textContent = state.email;
    } else if (licenseActiveEmail) {
      licenseActiveEmail.textContent = 'License active';
    }
    if (licensePurchasedAt) {
      const d = state.purchasedAt ? new Date(state.purchasedAt) : null;
      licensePurchasedAt.textContent = d && Number.isFinite(d.getTime())
        ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '—';
    }
    if (licenseKeyDisplay) {
      const key = state.licenseKey || '';
      const row = licenseKeyDisplay.closest('.license-row');
      if (key) {
        licenseKeyDisplay.textContent = key;
        licenseKeyDisplay.title = key;
        if (row) row.style.display = '';
      } else {
        if (row) row.style.display = 'none';
      }
    }
    if (licenseDevicesDisplay) {
      const used = state.devicesUsed ?? 0;
      const total = state.devicesTotal ?? 2;
      licenseDevicesDisplay.textContent = `${total - used} of ${total} available`;
    }
    return;
  }

  if (licenseCopy) {
    licenseCopy.style.display = '';
    document.querySelector('.preferences-field--license')?.classList.remove('license-field--active');
  }
  if (licenseActiveState) {
    licenseActiveState.style.display = 'none';
    licenseActiveState.setAttribute('hidden', '');
  }
  if (licenseActivationForm) licenseActivationForm.style.display = '';

  if (state.trial?.expired) {
    setLicenseMessage('Trial ended. Activate a license to continue.', '');
    return;
  }

  const days = state.trial?.daysRemaining ?? 0;
  setLicenseMessage(`${days} day${days === 1 ? '' : 's'} left in your trial.`, '');
}

async function loadLicenseState() {
  try {
    const result = await window.projectApi.revalidateLicense?.();
    const state = result?.ok ? result.state : await window.projectApi.getLicenseState();
    renderLicenseState(state);
  } catch (error) {
    if (licenseStatusSetting) licenseStatusSetting.textContent = 'Could not load license status.';
    setLicenseMessage(error?.message || 'License status unavailable.', 'error');
  }
}

async function saveSettings() {
  localStorage.setItem(RECORDING_SETTINGS_KEY, JSON.stringify(settings));
  localStorage.removeItem(LEGACY_RECORDING_SETTINGS_KEY);
  try {
    await window.projectApi.saveSettings({
      defaultSavePath: settings.defaultSavePath,
      hideDesktopIcons: settings.hideDesktopIcons,
      captureProject: settings.captureProject,
    });
  } catch (_) {}
  window.projectApi.notifySettingsChanged?.();
}

recordingFormatSetting.addEventListener('change', () => {
  settings.format = recordingFormatSetting.value === 'gif' ? 'gif' : 'mp4';
  saveSettings();
});

recordingAutozoomSetting.addEventListener('change', () => {
  settings.autoZoom = Boolean(recordingAutozoomSetting.checked);
  saveSettings();
});

hideDesktopIconsSetting.addEventListener('change', () => {
  settings.hideDesktopIcons = Boolean(hideDesktopIconsSetting.checked);
  saveSettings();
});

captureProjectSetting.addEventListener('change', () => {
  settings.captureProject = Boolean(captureProjectSetting.checked);
  saveSettings();
});

autoHideDelayDecrement?.addEventListener('click', () => {
  setAutoHideDelay(settings.autoHideDelay - 1);
});

autoHideDelayIncrement?.addEventListener('click', () => {
  setAutoHideDelay(settings.autoHideDelay + 1);
});

document.addEventListener('DOMContentLoaded', loadSettings);
document.addEventListener('DOMContentLoaded', loadLicenseState);
document.addEventListener('DOMContentLoaded', () => activatePreferencesTab('general'));

preferencesTabs.forEach((tab) => {
  tab.addEventListener('click', () => activatePreferencesTab(tab.dataset.preferencesTab));
});

chooseDefaultSavePathSetting.addEventListener('click', async () => {
  const result = await window.projectApi.chooseDefaultSavePath(settings.defaultSavePath);
  if (!result?.canceled && typeof result?.path === 'string') {
    settings.defaultSavePath = result.path;
    defaultSavePathSetting.value = settings.defaultSavePath;
    saveSettings();
  }
});

clearDefaultSavePathSetting.addEventListener('click', () => {
  settings.defaultSavePath = '';
  defaultSavePathSetting.value = '';
  saveSettings();
});

buyLicenseSetting?.addEventListener('click', () => {
  window.projectApi.openBuyLicense?.();
});

activateLicenseSetting?.addEventListener('click', async () => {
  const email = licenseEmailSetting?.value || '';
  setLicenseMessage('Activating...', '');
  activateLicenseSetting.disabled = true;
  try {
    renderLicenseState(await window.projectApi.activateLicense(email));
  } catch (error) {
    const message = String(error?.message || 'Activation failed.');
    const readable = message.includes('license_not_found')
      ? 'We could not find a license for this email. Use the same email you entered at checkout, or buy a license first.'
      : message.includes('activation_limit_reached')
        ? 'This license has reached its 2-device activation limit.'
        : message;
    setLicenseMessage(readable, 'error');
  } finally {
    activateLicenseSetting.disabled = false;
  }
});

licenseDeactivateBtn?.addEventListener('click', async () => {
  if (!confirm('Deactivate the license on this device? You can activate it again later.')) return;
  licenseDeactivateBtn.disabled = true;
  try {
    renderLicenseState(await window.projectApi.deactivateLicense());
  } catch (error) {
    setLicenseMessage(error?.message || 'Deactivation failed.', 'error');
  } finally {
    licenseDeactivateBtn.disabled = false;
  }
});
