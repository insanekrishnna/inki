(function () {
  if (window.projectApi) return;

  const noop = () => {};
  const callbacks = new Map();

  document.documentElement.classList.add('web-preview');
  window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('web-preview-mode');
  });

  function on(name, callback) {
    callbacks.set(name, callback);
  }

  function getPlatform() {
    const platform = navigator.platform || '';
    if (/mac/i.test(platform)) return 'darwin';
    if (/win/i.test(platform)) return 'win32';
    return 'linux';
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  function chooseImageFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        input.remove();
        resolve(file ? await readFileAsDataUrl(file) : null);
      }, { once: true });
      document.body.appendChild(input);
      input.click();
    });
  }

  async function captureDisplayFrame() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      return { success: false, error: 'Screen capture is not available in this browser.' };
    }

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement('video');
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      await new Promise((resolve) => {
        if (video.videoWidth > 0) resolve();
        else video.addEventListener('loadedmetadata', resolve, { once: true });
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      callbacks.get('load-capture')?.({ dataUrl: canvas.toDataURL('image/png'), source: 'capture', captureMode: 'web' });
      return { success: true };
    } catch (error) {
      return { success: false, error: error?.message || 'Capture canceled' };
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  }

  async function saveDataUrl(dataUrl, filename = 'your-project-capture.png') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return { success: true };
  }

  function dataUrlToBlob(dataUrl) {
    const [header, encoded] = dataUrl.split(',');
    const mimeType = header.match(/^data:(.*?);base64$/)?.[1] || 'image/png';
    const binary = atob(encoded || '');
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mimeType });
  }

  async function copyDataUrl(dataUrl) {
    try {
      const blob = dataUrlToBlob(dataUrl);
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error?.message || 'Clipboard write is unavailable in this browser.' };
    }
  }

  window.projectApi = {
    platform: getPlatform(),
    startCapture: captureDisplayFrame,
    startCaptureWindow: captureDisplayFrame,
    startCaptureFullscreen: captureDisplayFrame,
    openFile: chooseImageFile,
    saveFile: (dataUrl) => saveDataUrl(dataUrl),
    copyToClipboard: copyDataUrl,
    readClipboardImage: async () => null,
    getSettings: async () => ({}),
    saveSettings: async () => ({ success: true }),
    getLicenseState: async () => ({ licensed: true, trial: { expired: false } }),
    activateLicense: async () => ({ licensed: true, trial: { expired: false } }),
    deactivateLicense: async () => ({ licensed: false, trial: { expired: false } }),
    revalidateLicense: async () => ({ ok: true, state: { licensed: true, trial: { expired: false } } }),
    getAppUpdateState: async () => ({}),
    checkForAppUpdates: async () => ({ ok: false }),
    downloadAppUpdate: async () => ({ ok: false }),
    installAppUpdate: async () => ({ ok: false }),
    openBuyLicense: noop,
    openLicenseWindow: noop,
    openNativePreferences: noop,
    chooseDefaultSavePath: async () => null,
    closeWindow: noop,
    minimizeWindow: async () => {},
    setWindowMode: async () => {},
    toggleMaximizeWindow: async () => {},
    getDisplays: async () => [],
    startRecording: async () => {
      throw new Error('Screen recording preview is available in the Electron app only.');
    },
    stopRecording: async () => ({ discarded: true }),
    saveRecording: async () => ({ success: false, canceled: true }),
    trimRecording: async () => ({ success: false }),
    confirmRecordingWindowClose: noop,
    confirmAppWindowClose: noop,
    notifySettingsChanged: noop,
    onLoadCapture: (callback) => on('load-capture', callback),
    onLoadCaptureData: (callback) => on('load-capture-data', callback),
    onTriggerCapture: noop,
    onTriggerCaptureMenu: noop,
    onTriggerCaptureWindow: noop,
    onTriggerRecordScreen: noop,
    onTriggerCaptureFullscreen: noop,
    onShortcutCaptureReady: noop,
    onOpenPreferences: noop,
    onToolbarOpenRequested: noop,
    onCaptureModeStarted: noop,
    onCaptureFinished: noop,
    onRecordingStopRequested: noop,
    onRecordingWindowCloseRequested: noop,
    onAppWindowCloseRequested: noop,
    onSettingsChanged: noop,
    onSaveRecordingStarted: noop,
    onLicenseStatusChanged: noop,
    onAppUpdateState: noop,
  };
})();
