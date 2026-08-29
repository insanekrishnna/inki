/**
 * Your Project - Renderer Process
 * Canvas drawing, tools, and UI interaction
 */

// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// App State
// ------------------------------------------------------------------------------

// Web Fallback Polyfill (For Vercel/Browser Deployments)
// This intercepts Electron-specific API calls and polyfills them with standard Web APIs 
// so the app remains fully functional as a web-based image editor.
if (!window.projectApi) {
  window.projectApi = {
    platform: 'web',
    setWindowMode: async () => {},
    onCaptureModeStarted: () => {},
    onCaptureFinished: () => {},
    getLicenseState: async () => ({ isPro: false, type: 'web' }),
    onTriggerCapture: () => {},
    onTriggerCaptureMenu: () => {},
    onTriggerCaptureWindow: () => {},
    onTriggerRecordScreen: () => {},
    onTriggerCaptureFullscreen: () => {},
    onShortcutCaptureReady: () => {},
    onOpenPreferences: () => {},
    onLoadCapture: () => {},
    onLoadCaptureData: () => {},
    onToolbarOpenRequested: () => {},
    onRecordingStopRequested: () => {},
    onRecordingWindowCloseRequested: () => {},
    onAppWindowCloseRequested: () => {},
    onSettingsChanged: () => {},
    onSaveRecordingStarted: () => {},
    onLicenseStatusChanged: () => {},
    startCapture: async () => ({ success: false, error: 'Native screen capture requires the desktop app.' }),
    startCaptureWindow: async () => ({ success: false, error: 'Native screen capture requires the desktop app.' }),
    startCaptureFullscreen: async () => ({ success: false, error: 'Native screen capture requires the desktop app.' }),
    openFile: async () => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return resolve(null);
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.readAsDataURL(file);
        };
        input.click();
      });
    },
    saveFile: async (dataUrl) => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'icodraw-export.png';
      a.click();
      return { success: true };
    },
    copyToClipboard: async (dataUrl) => {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },
    readClipboardImage: async () => null,
    minimizeWindow: async () => {}
  };
}

// Expose functions for React sidebar
window.editorUndo = () => undo();
window.editorRedo = () => redo();
window.editorClear = () => clearCanvas();
window.editorCopy = () => copyToClipboard();
window.editorSave = () => saveFile();
window.editorCrop = () => toggleCrop();
window.editorSelectColor = (c) => selectColor(c);
window.editorSelectStrokeWidth = (w) => selectStrokeWidth(w);
window.editorSelectTextBold = () => selectTextBold();
window.editorSelectTextItalic = () => selectTextItalic();
window.editorSelectTextUnderline = () => selectTextUnderline();
window.editorSelectFontFamily = (f) => selectTextFontFamily(f);
window.editorSelectFontSize = (s) => selectTextFontSize(s);


const state = {
  image: null,
  imageWidth: 0,
  imageHeight: 0,
  zoom: 1,
  renderScaleX: 1,
  renderScaleY: 1,
  currentTool: null,
  currentColor: '#111111',
  strokeWidth: 4,
  textFontSize: 30,
  textFontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif',
  textBold: false,
  textItalic: false,
  textUnderline: false,
  isDrawing: false,
  startX: 0,
  startY: 0,
  annotations: [],
  history: [],
  historyIndex: -1,
  isEditingText: false,
  pendingTextPos: null,
  isDraggingText: false,
  dragTextIndex: -1,
  dragOffsetX: 0,
  dragOffsetY: 0,
  isDraggingAnnotation: false,
  dragAnnotationIndex: -1,
  dragStartX: 0,
  dragStartY: 0,
  selectedAnnotationIndex: -1,
  selectedImage: false,
  imageOffsetX: 0,
  imageOffsetY: 0,
  isDraggingCanvas: false,
  dragCanvasStartX: 0,
  dragCanvasStartY: 0,
  dragCanvasOrigX: 0,
  dragCanvasOrigY: 0,
  isResizingImage: false,
  imageResizeHandle: null,
  imageResizeOrig: null,
  imageResizeFrame: null,
  pendingImageResizeEvent: null,
  isResizingAnnotation: false,
  resizeHandle: null,
  windowContainerApplied: false,
  containerGradient: 'none',
  containerBgBlur: 0,
  containerColorPreset: 'normal',
  studioPadding: 64,
  studioImageScale: 100,
  studioRotation: 0,
  studioLockPosition: false,
  studioCornerRadius: 16,
  studioShadow: 25,
  studioShadowDistance: 25,
  studioShadowBlur: 45,
  studioShadowOpacity: 35,
  studioShadowOffsetX: 0,
  studioShadowOffsetY: 0,
  studioTitlebar: true,
  studioBorder: true,
  windowFrameTheme: 'macos',
  studioBrowserUrl: 'example.com',
  studioPitch: 0,
  studioYaw: 0,
  studioRoll: 0,
  studioCameraDepth: 1200,
  studioBrightness: 100,
  studioContrast: 100,
  studioSaturation: 100,
  studioHue: 0,
  studioNoise: 0,
  studioNoiseLayer: 'both',
  studioFilmGrain: 0,
  studioAsciiEnabled: false,
  studioAsciiPattern: '.',
  studioAsciiSize: 16,
  studioAsciiOpacity: 25,
  studioAsciiLayer: 'image',
  studioAsciiColor: '#ffffff',
  studioWatermarkMode: 'off',
  studioWatermarkPlatform: 'x',
  studioWatermarkText: '@icodraw',
  studioWatermarkLayer: 'image',
  studioWatermarkPosition: 'bottom-right',
  studioWatermarkSize: 'default',
  studioWatermarkBlur: 20,
  originalImageBeforeContainer: null,
  // The bare screenshot the studio frame is rebuilt from, plus where that
  // screenshot currently sits inside the framed canvas. Annotations live in
  // canvas coordinates and are remapped between successive content rects, so
  // restyling the frame never rasterizes or discards them.
  studioSourceImage: null,
  studioContentRect: null,
  baseOriginalImage: null,
  pendingStudioDisplaySize: null,
  studioDisplaySizeLock: null,
  studioReapplyTimer: null,
  studioReapplyInFlight: false,
  studioReapplyQueued: false,
  // Crop state
  cropActive: false,
  cropX: 0,
  cropY: 0,
  cropW: 0,
  cropH: 0,
  cropDragging: null, // which handle or 'move'
  cropDragStartX: 0,
  cropDragStartY: 0,
  cropOrigRect: null,
  isRecording: false,
  recordingFormat: 'mp4',
  recordingMode: 'region',
  isSavingRecording: false,
  recordingLoop: true,
  recordingSettings: { format: 'mp4', autoZoom: true, autoHideDelay: 0, captureProject: false },
  captureSettings: { hideDesktopIcons: true },
  imageModified: false,
  _queueStatusUpdate: false,
};

const AUTO_HIDE_DELAYS = [500, 1000, 2000, 5000, 10000, 15000, 30000, Infinity];
const INITIAL_IMAGE_ZOOM = 0.49;

// ------------------------------------------------------------------------------
// DOM Elements
// ------------------------------------------------------------------------------

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let resetToolbarDismissState = () => {};
let scheduleAutoHideFn = () => {};
let isCaptureMode = false;
let timelineGenerationAbort = false;
let timelineRangeInitialized = false;
const RECORDING_SETTINGS_KEY = 'yourproject-recording-settings';
// Legacy key retained for one-time migration from builds branded as Project.
const LEGACY_RECORDING_SETTINGS_KEY = 'project-recording-settings';
const THEME_SETTING_KEY = 'yourproject-theme';

const elements = {
  canvas: $('#canvas'),
  ctx: null,
  container: $('#canvas-container'),
  emptyState: $('#empty-state'),
  btnCopy: $('#btn-copy'),
  btnSave: $('#btn-save'),
  btnCrop: $('#btn-crop'),
  btnUndo: $('#btn-undo'),
  btnRedo: $('#btn-redo'),
  btnClear: $('#btn-clear'),
  preferencesDialog: $('#preferences-dialog'),
  hideDesktopIconsSetting: $('#hide-desktop-icons-setting'),
  captureProjectSetting: $('#capture-project-setting'),
  btnCaptureRegion: $('#btn-capture-region'),
  btnCaptureWindow: $('#btn-capture-window'),
  btnCaptureFullscreen: $('#btn-capture-fullscreen'),
  btnUploadFile: $('#btn-upload-file'),
  btnToggleTheme: $('#btn-toggle-theme'),
  emptyCapture: $('#empty-capture'),
  emptyOpen: $('#empty-open'),
  toolBtns: $$('.toolbar-group.tools .tool-btn'),
  bottomToolBtns: $$('.bt-btn'),
  colorSwatches: $$('.color-swatch'),
  strokePicker: $('#stroke-picker'),
  strokeCurrentLine: $('#stroke-current-line'),
  strokeMenu: $('#stroke-menu'),
  strokeBtns: $$('.stroke-option'),
  statusTool: $('#status-tool'),
  statusZoom: $('#status-zoom'),
  btnZoomOut: $('#btn-zoom-out'),
  btnZoomIn: $('#btn-zoom-in'),
  btnZoomReset: $('#btn-zoom-reset'),
  textWrapper: $('#text-input-wrapper'),
  textInput: $('#inline-text-input'),
  tooltip: $('#app-tooltip'),
  fontPicker: $('#font-picker'),
  fontCurrentLabel: $('#font-current-label'),
  sizePicker: $('#size-picker'),
  sizeCurrentLabel: $('#size-current-label'),
  textStyleGroup: $('#text-style-group'),
  textStyleSeparator: $('#text-style-separator'),
  textStyleBold: $('#text-style-bold'),
  textStyleItalic: $('#text-style-italic'),
  cropOverlay: $('#crop-overlay'),
  cropBox: $('#crop-box'),
  cropHint: $('#crop-hint'),
};

function on(el, event, handler) { if (el) el.addEventListener(event, handler); }

function setAppWindowMode(mode, options = {}) {
  return window.projectApi?.setWindowMode?.(mode, options)?.catch?.(() => {});
}

function resetFloatingToolbar() {
  resetToolbarDismissState();
}

// ------------------------------------------------------------------------------
// Initialization
// ------------------------------------------------------------------------------

function init() {
  document.body.classList.add(`platform-${window.projectApi.platform}`);
  initThemeToggle();
  elements.ctx = elements.canvas.getContext('2d');
  bindToolbar();
  bindCanvas();
  bindZoomControls();
  bindKeyboard();
  bindIPC();
  bindInlineText();
  bindContextMenu();
  bindRightSidebar();
  bindStudioControls();
  bindPaste();
  bindCrop();
  bindTooltips();
  if (elements.fontCurrentLabel) {
    elements.fontCurrentLabel.textContent = fontFamilyToLabel(state.textFontFamily);
    elements.fontCurrentLabel.style.fontFamily = state.textFontFamily;
  }
  if (elements.sizeCurrentLabel) {
    elements.sizeCurrentLabel.textContent = String(state.textFontSize);
  }
  // loadRecordingSettings();
  refreshLicenseState();
  selectStrokeWidth(state.strokeWidth);
  bindFontPicker();
  bindSizePicker();
  toggleTextStyleControls();
  updateStatus();
  document.activeElement?.blur();

  window.projectApi.onCaptureModeStarted(() => {
    isCaptureMode = true;
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) toolbar.classList.remove('auto-hidden');
    resetFloatingToolbar();
  });

  window.projectApi.onCaptureFinished(() => {
    isCaptureMode = false;
    setCaptureModeButton(null);
    resetFloatingToolbar();
  });
}

function initThemeToggle() {
  // Always default to light theme on page load
  localStorage.removeItem(THEME_SETTING_KEY);
  localStorage.removeItem('theme');
  localStorage.removeItem('vite-ui-theme');
  const initialTheme = 'light';
  document.body.classList.remove('theme-dark');
  document.body.classList.add('theme-light');
  document.documentElement.classList.remove('dark');
  document.documentElement.classList.add('light');
  elements.btnToggleTheme?.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    document.body.classList.toggle('theme-dark', nextTheme === 'dark');
    document.body.classList.toggle('theme-light', nextTheme !== 'dark');
    localStorage.setItem(THEME_SETTING_KEY, nextTheme);
  });
}

// ------------------------------------------------------------------------------
// Event Binding
// ------------------------------------------------------------------------------

function setCaptureModeButton(mode = null) {
  const selected = mode === 'window'
    ? elements.btnCaptureWindow
    : mode === 'fullscreen'
      ? elements.btnCaptureFullscreen
      : mode === 'region'
        ? elements.btnCaptureRegion
        : null;
  [elements.btnCaptureRegion, elements.btnCaptureWindow, elements.btnCaptureFullscreen].forEach((btn) => {
    if (!btn) return;
    btn.classList.toggle('active', btn === selected);
  });
}

let _cachedLicenseState = null;

// Expose capture methods to React
window.startCaptureRegion = () => { setCaptureModeButton('region'); startCapture({ mode: 'region' }); };
window.startCaptureWindow = () => { setCaptureModeButton('window'); startCapture({ mode: 'window' }); };
window.startCaptureFullscreen = () => { setCaptureModeButton('fullscreen'); startCapture({ mode: 'fullscreen' }); };

// Listen to React custom tool selection
window.addEventListener('react-tool-select', (e) => {
  selectTool(e.detail.tool);
});

function updateLicenseDialog(licenseState) {
  if (!licenseState) return;
  _cachedLicenseState = licenseState;
}

async function refreshLicenseState() {
  try {
    const licenseState = await window.projectApi.getLicenseState();
    updateLicenseDialog(licenseState);
  } catch (error) {
    console.error('[license] failed to load state:', error?.message);
  }
}

function bindToolbar() {
  on(elements.btnCaptureRegion, 'click', () => { elements.btnCaptureRegion.blur(); setCaptureModeButton('region'); startCapture(); });
  on(elements.btnCaptureWindow, 'click', () => { elements.btnCaptureWindow.blur(); setCaptureModeButton('window'); startCaptureWindow(); });
  on(elements.btnCaptureFullscreen, 'click', () => { elements.btnCaptureFullscreen.blur(); setCaptureModeButton('fullscreen'); startCaptureFullscreen(); });
  
  on(elements.btnCopy, 'click', copyToClipboard);
  on(elements.btnSave, 'click', saveFile);
  on(elements.btnCrop, 'click', toggleCrop);
  on(elements.btnUndo, 'click', undo);
  on(elements.btnRedo, 'click', redo);
  on(elements.btnClear, 'click', clearCanvas);

  elements.emptyCapture.addEventListener('click', startCapture);
  elements.emptyOpen.addEventListener('click', openFile);
  if (elements.btnUploadFile) {
    elements.btnUploadFile.addEventListener('click', openFile);
  }

  elements.toolBtns.forEach(btn => {
    btn.addEventListener('click', () => selectTool(btn.dataset.tool));
  });
  if (elements.bottomToolBtns) {
    elements.bottomToolBtns.forEach(btn => {
      btn.addEventListener('click', () => selectTool(btn.dataset.tool));
    });
  }
  elements.colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => selectColor(swatch.dataset.color));
  });
  bindStrokePicker();

  on(elements.textStyleBold, 'click', () => selectTextBold());
  on(elements.textStyleItalic, 'click', () => selectTextItalic());
}


function bindStrokePicker() {
  let closeTimer = null;
  const setOpen = (open) => {
    if (!elements.strokePicker || !elements.strokeMenu) return;
    elements.strokePicker.classList.toggle('open', open);
    elements.strokeMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
    const btn = document.getElementById('stroke-current');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  const scheduleClose = () => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => setOpen(false), 180);
  };
  on(elements.strokePicker, 'mouseenter', () => { clearTimeout(closeTimer); setOpen(true); });
  on(elements.strokePicker, 'mouseleave', scheduleClose);
  on(elements.strokePicker, 'focusin', () => { clearTimeout(closeTimer); setOpen(true); });
  on(elements.strokePicker, 'focusout', scheduleClose);
  document.querySelectorAll('.stroke-option').forEach(btn => {
    btn.addEventListener('click', () => {
      selectStrokeWidth(parseInt(btn.dataset.width));
      setOpen(false);
    });
  });
}


function bindFontPicker() {
  const picker = elements.fontPicker;
  if (!picker) return;
  let closeTimer = null;
  const btn = document.getElementById('font-current');
  const setOpen = (open) => {
    if (!picker) return;
    picker.classList.toggle('open', open);
    const menu = document.getElementById('font-menu');
    if (menu) menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  const scheduleClose = () => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => setOpen(false), 180);
  };
  on(picker, 'mouseenter', () => { clearTimeout(closeTimer); setOpen(true); });
  on(picker, 'mouseleave', scheduleClose);
  on(picker, 'focusin', () => { clearTimeout(closeTimer); setOpen(true); });
  on(picker, 'focusout', scheduleClose);
  document.querySelectorAll('.font-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      selectTextFontFamily(opt.dataset.family);
      setOpen(false);
    });
  });
  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}


function bindSizePicker() {
  const picker = elements.sizePicker;
  if (!picker) return;
  let closeTimer = null;
  const btn = document.getElementById('size-current');
  const setOpen = (open) => {
    if (!picker) return;
    picker.classList.toggle('open', open);
    const menu = document.getElementById('size-menu');
    if (menu) menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  const scheduleClose = () => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => setOpen(false), 180);
  };
  on(picker, 'mouseenter', () => { clearTimeout(closeTimer); setOpen(true); });
  on(picker, 'mouseleave', scheduleClose);
  on(picker, 'focusin', () => { clearTimeout(closeTimer); setOpen(true); });
  on(picker, 'focusout', scheduleClose);
  document.querySelectorAll('.size-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      selectTextFontSize(parseInt(opt.dataset.size, 10));
      setOpen(false);
    });
  });
  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}


function bindTooltips() {
  const tooltip = elements.tooltip;
  if (!tooltip) return;

  const hide = () => {
    tooltip.classList.remove('visible');
    tooltip.setAttribute('aria-hidden', 'true');
  };

  const show = (event) => {
    const target = event.currentTarget;
    const text = target?.dataset?.tooltip;
    if (!text) return;
    tooltip.textContent = text;
    tooltip.classList.add('visible');
    tooltip.setAttribute('aria-hidden', 'false');

    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const x = Math.max(8, Math.min(window.innerWidth - tooltipRect.width - 8, rect.left + (rect.width - tooltipRect.width) / 2));
    let y = rect.bottom + 10;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  };

  document.addEventListener('click', hide);
  document.querySelectorAll('[data-tooltip]').forEach((node) => {
    node.addEventListener('mouseenter', show);
    node.addEventListener('mouseleave', hide);
    node.addEventListener('blur', hide);
  });
}

function bindCanvas() {
  elements.canvas.addEventListener('pointerdown', onCanvasPointerDown);
  elements.canvas.addEventListener('pointermove', onCanvasMouseMove);
  elements.canvas.addEventListener('pointerup', onCanvasPointerUp);
  elements.canvas.addEventListener('pointercancel', onCanvasPointerUp);
  elements.container.addEventListener('wheel', onWheel, { passive: false });
}

function isEditableTarget(target) {
  return target instanceof HTMLElement && (
    target.matches('input, textarea, select, [contenteditable="true"]') || target.isContentEditable
  );
}

function bindKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (state.isEditingText || isEditableTarget(e.target)) return;
    const isMac = window.projectApi.platform === 'darwin';
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    // Crop mode keyboard shortcuts
    if (state.cropActive) {
      if (e.key === 'Enter') { e.preventDefault(); applyCrop(); return; }
      if (e.key === 'Escape') { e.preventDefault(); cancelCrop(); return; }
      return; // Block other shortcuts while cropping
    }
    
    if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); startCapture(); return; }
    if (cmdOrCtrl && e.key.toLowerCase() === 'o') { e.preventDefault(); openFile(); return; }
    if (cmdOrCtrl && e.key.toLowerCase() === 'e') { e.preventDefault(); saveFile(); return; }
    if (cmdOrCtrl && e.key.toLowerCase() === 'c' && state.image) { e.preventDefault(); copyToClipboard(); return; }
    if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); redo(); return; }
    if (cmdOrCtrl && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    
    switch (e.key.toLowerCase()) {
      case 'r': selectTool('rect'); break;
      case 'e': selectTool('ellipse'); break;
      case 'a': selectTool('arrow'); break;
      case 'l': selectTool('line'); break;
      case 't': selectTool('text'); break;
      case '=': case '+': setZoomPercent(Math.round(state.zoom * 100) + 3); break;
      case '-': setZoomPercent(Math.round(state.zoom * 100) - 3); break;
      case '0': fitToWindow(); break;
      case 'w': applyWindowContainer(); break;
      case '[': elements.strokeWidthSlider.value = Math.max(1, parseInt(elements.strokeWidthSlider.value) - 1); state.strokeWidth = parseInt(elements.strokeWidthSlider.value); updateToolbarState(); render(); break;
      case ']': elements.strokeWidthSlider.value = Math.min(20, parseInt(elements.strokeWidthSlider.value) + 1); state.strokeWidth = parseInt(elements.strokeWidthSlider.value); updateToolbarState(); render(); break;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (isEditableTarget(e.target)) return;
    if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Del' || e.key === 'Suppr') {
      const selected = state.annotations[state.selectedAnnotationIndex];
      const canDelete = state.selectedAnnotationIndex >= 0 && (state.currentTool === 'select' || selected?.type === 'text');
      if (canDelete) {
        e.preventDefault();
        deleteSelectedAnnotation();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (state.selectedAnnotationIndex >= 0) {
        state.selectedAnnotationIndex = -1;
        render();
      }
      return;
    }
  });
}

function bindIPC() {
  window.projectApi.onTriggerCapture(() => {
    console.log('[your-project][renderer] received trigger-capture');
    startCapture();
  });
  window.projectApi.onTriggerCaptureMenu((options = {}) => {
    console.log('[your-project][renderer] received trigger-capture-menu');
    showWindow();
    startCapture(options);
  });
  window.projectApi.onTriggerCaptureWindow(() => startCaptureWindow());
  window.projectApi.onTriggerRecordScreen((event) => onRecordButtonClick(event));
  window.projectApi.onTriggerCaptureFullscreen(() => startCaptureFullscreen());
  window.projectApi.onShortcutCaptureReady(() => {
    showWindow();
  });
  window.projectApi.onOpenPreferences(() => openPreferences());
  window.projectApi.onLoadCapture((payload) => {
    const capturePayload = typeof payload === 'string' ? { dataUrl: payload } : payload;
    loadImage(capturePayload?.dataUrl, {
      showPreview: capturePayload?.source === 'capture',
      captureMode: capturePayload?.captureMode || 'region',
    });
  });
  window.projectApi.onLoadCaptureData((captureData) => loadCaptureData(captureData));
  window.projectApi.onToolbarOpenRequested?.(() => {
    resetFloatingToolbar({ fromMenu: true });
  });
  window.projectApi.onRecordingStopRequested(() => {
    if (state.isRecording) toggleRecording();
  });
  window.projectApi.onRecordingWindowCloseRequested?.(() => {
    stopRecordingForWindowClose();
  });
  window.projectApi.onAppWindowCloseRequested?.(() => {
    prepareForAppWindowClose();
  });
  window.projectApi.onSettingsChanged?.(() => { scheduleAutoHideFn(); });
  window.projectApi.onSaveRecordingStarted?.(() => setRecordingSaveProgress(true));
  window.projectApi.onLicenseStatusChanged?.(() => refreshLicenseState());
}

function bindInlineText() {
  elements.textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitInlineText(); }
    if (e.key === 'Escape') { cancelInlineText(); }
  });
  elements.textInput.addEventListener('input', autoResizeTextInput);

  document.addEventListener('mousedown', (e) => {
    if (!state.isEditingText) return;
    if (elements.textWrapper.contains(e.target)) return;
    commitInlineText();
  });
}

function bindPaste() {
  document.addEventListener('paste', (e) => {
    if (state.isEditingText) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            if (state.cropActive) cancelCrop();
            loadImage(reader.result);
            showToast('Image pasted from clipboard', 'success');
          };
          reader.readAsDataURL(blob);
        }
        return;
      }
    }
  });
}

// ------------------------------------------------------------------------------
// Crop Tool (Handle-based)
// ------------------------------------------------------------------------------

function bindCrop() {
  // Handle dragging on crop handles and crop box
  const handles = elements.cropBox.querySelectorAll('.crop-handle');
  handles.forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      state.cropDragging = handle.dataset.handle;
      state.cropDragStartX = e.clientX;
      state.cropDragStartY = e.clientY;
      state.cropOrigRect = { x: state.cropX, y: state.cropY, w: state.cropW, h: state.cropH };
    });
  });

  // Drag to move the entire crop box
  elements.cropBox.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('crop-handle')) return;
    e.preventDefault();
    state.cropDragging = 'move';
    state.cropDragStartX = e.clientX;
    state.cropDragStartY = e.clientY;
    state.cropOrigRect = { x: state.cropX, y: state.cropY, w: state.cropW, h: state.cropH };
  });

  // Double-click on crop box to apply
  elements.cropBox.addEventListener('dblclick', (e) => {
    e.preventDefault();
    applyCrop();
  });

  document.addEventListener('mousemove', onCropMouseMove);
  document.addEventListener('mouseup', onCropMouseUp);
}

function toggleCrop() {
  if (state.cropActive) {
    cancelCrop();
  } else {
    startCrop();
  }
}

function startCrop() {
  if (!state.image) return;
  state.cropActive = true;
  // Select the full image
  state.cropX = 0;
  state.cropY = 0;
  state.cropW = state.imageWidth;
  state.cropH = state.imageHeight;
  elements.cropOverlay.classList.add('active');
  if (elements.btnCrop) elements.btnCrop.classList.add('active');
  updateCropUI();
}

function cancelCrop() {
  state.cropActive = false;
  state.cropDragging = null;
  elements.cropOverlay.classList.remove('active');
  if (elements.btnCrop) elements.btnCrop.classList.remove('active');
  if (state.currentTool === 'crop') {
    state.currentTool = 'select';
    updateToolbarState();
  }
}

function applyCrop() {
  if (!state.cropActive || !state.image) return;

  const x = Math.max(0, Math.round(state.cropX));
  const y = Math.max(0, Math.round(state.cropY));
  const w = Math.min(Math.round(state.cropW), state.imageWidth - x);
  const h = Math.min(Math.round(state.cropH), state.imageHeight - y);

  if (w < 5 || h < 5) {
    showToast('Crop area too small', 'error');
    cancelCrop();
    return;
  }

  // Composite image + annotations, then crop
  const compositeDataUrl = getCompositeImage();
  const compositeImg = new Image();
  compositeImg.onload = () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(compositeImg, x, y, w, h, 0, 0, w, h);
    
    const croppedDataUrl = tempCanvas.toDataURL('image/png');
    state.annotations = [];
    state.history = [];
    state.historyIndex = -1;
    state.selectedAnnotationIndex = -1;
    state.selectedImage = false;
    state.windowContainerApplied = false;
    state.originalImageBeforeContainer = null;
    state.studioSourceImage = null;
    state.studioContentRect = null;
    cancelCrop();
    loadImage(croppedDataUrl);
    showToast('Image cropped', 'success');
  };
  compositeImg.src = compositeDataUrl;
}

function onCropMouseMove(e) {
  if (!state.cropDragging || !state.cropActive) return;

  const canvasRect = elements.canvas.getBoundingClientRect();
  const dx = e.clientX - state.cropDragStartX;
  const dy = e.clientY - state.cropDragStartY;
  
  // Convert pixel delta to image coordinate delta
  const scaleX = state.imageWidth / canvasRect.width;
  const scaleY = state.imageHeight / canvasRect.height;
  const imgDx = dx * scaleX;
  const imgDy = dy * scaleY;

  const orig = state.cropOrigRect;
  const minSize = 20;

  if (state.cropDragging === 'move') {
    state.cropX = Math.max(0, Math.min(state.imageWidth - orig.w, orig.x + imgDx));
    state.cropY = Math.max(0, Math.min(state.imageHeight - orig.h, orig.y + imgDy));
  } else {
    let nx = orig.x, ny = orig.y, nw = orig.w, nh = orig.h;

    if (state.cropDragging.includes('w')) {
      const newX = Math.max(0, Math.min(orig.x + orig.w - minSize, orig.x + imgDx));
      nw = orig.w + (orig.x - newX);
      nx = newX;
    }
    if (state.cropDragging.includes('e')) {
      nw = Math.max(minSize, Math.min(state.imageWidth - orig.x, orig.w + imgDx));
    }
    if (state.cropDragging.includes('n')) {
      const newY = Math.max(0, Math.min(orig.y + orig.h - minSize, orig.y + imgDy));
      nh = orig.h + (orig.y - newY);
      ny = newY;
    }
    if (state.cropDragging.includes('s')) {
      nh = Math.max(minSize, Math.min(state.imageHeight - orig.y, orig.h + imgDy));
    }

    state.cropX = nx;
    state.cropY = ny;
    state.cropW = nw;
    state.cropH = nh;
  }

  updateCropUI();
}

function onCropMouseUp() {
  state.cropDragging = null;
  state.cropOrigRect = null;
}

function updateCropUI() {
  if (!state.cropActive) return;

  const canvasRect = elements.canvas.getBoundingClientRect();
  const containerRect = elements.container.getBoundingClientRect();
  
  // Convert image coords to screen coords
  const scaleX = canvasRect.width / state.imageWidth;
  const scaleY = canvasRect.height / state.imageHeight;
  
  const left = canvasRect.left - containerRect.left + state.cropX * scaleX;
  const top = canvasRect.top - containerRect.top + state.cropY * scaleY;
  const width = state.cropW * scaleX;
  const height = state.cropH * scaleY;

  elements.cropBox.style.left = left + 'px';
  elements.cropBox.style.top = top + 'px';
  elements.cropBox.style.width = width + 'px';
  elements.cropBox.style.height = height + 'px';

  // Position hint below the crop box
  if (elements.cropHint) {
    elements.cropHint.style.left = (left + width / 2) + 'px';
    elements.cropHint.style.top = (top + height + 12) + 'px';
  }

  // Update mask (dark area outside crop)
  const mask = document.getElementById('crop-mask');
  mask.style.clipPath = `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
    ${left}px ${top}px, ${left}px ${top + height}px, ${left + width}px ${top + height}px, ${left + width}px ${top}px, ${left}px ${top}px
  )`;
}

// ------------------------------------------------------------------------------
// File Operations
// ------------------------------------------------------------------------------


function showWindow() {
  // window.focus(); // Avoid forcing a macOS space switch when opening capture UI
}

async function startCapture(options = {}) {
  if (state.cropActive) cancelCrop();
  try {
    const result = await window.projectApi.startCapture({
      hideDesktopIcons: options?.hideDesktopIcons ?? state.captureSettings.hideDesktopIcons,
      showToolbar: options?.showToolbar,
      captureProject: state.recordingSettings.captureProject,
    });
    if (!result.success) showToast(result.error || 'Failed to start capture', 'error');
  } catch (err) {
    showToast(err?.message || 'Failed to start capture', 'error');
  } finally {
    setCaptureModeButton();
  }
}

async function startCaptureWindow() {
  if (state.cropActive) cancelCrop();
  try {
    const result = await window.projectApi.startCaptureWindow({
      hideDesktopIcons: state.captureSettings.hideDesktopIcons,
      captureProject: state.recordingSettings.captureProject,
    });
    if (!result.success) showToast(result.error || 'Failed to capture window', 'error');
  } catch (err) {
    showToast(err?.message || 'Failed to capture window', 'error');
  } finally {
    setCaptureModeButton();
  }
}

async function startCaptureFullscreen() {
  if (state.cropActive) cancelCrop();
  try {
    const result = await window.projectApi.startCaptureFullscreen({
      hideDesktopIcons: state.captureSettings.hideDesktopIcons,
      captureProject: state.recordingSettings.captureProject,
    });
    if (!result.success) {
      showToast(result.error || 'Failed to capture screen', 'error');
    }
  } catch (err) {
    showToast(err?.message || 'Failed to capture screen', 'error');
  } finally {
    setCaptureModeButton();
  }
}

async function openFile() {
  if (state.cropActive) cancelCrop();
  const dataUrl = await window.projectApi.openFile();
  if (dataUrl) loadImage(dataUrl);
}

async function saveFile() {
  if (!state.image) return;
  const dataUrl = getCompositeImage();
  const result = await window.projectApi.saveFile(dataUrl);
  if (result.success) {
    showToast('Image saved successfully', 'success');
  } else {
    showToast('Failed to save image', 'error');
  }
}

async function copyToClipboard() {
  if (!state.image) return;
  const dataUrl = getCompositeImage();
  const result = await window.projectApi.copyToClipboard(dataUrl);
  if (result.success) showToast('Copied to clipboard', 'success');
  else showToast('Failed to copy to clipboard', 'error');
}

async function pasteFromClipboard() {
  try {
    const dataUrl = await window.projectApi.readClipboardImage();
    if (dataUrl) {
      if (state.cropActive) cancelCrop();
      loadImage(dataUrl);
      showToast('Image pasted from clipboard', 'success');
    } else {
      showToast('No image in clipboard', 'info');
    }
  } catch (err) {
    showToast('Failed to paste from clipboard', 'error');
  }
}

function clearCanvas() {
  if (state.cropActive) cancelCrop();

  // Cancel any active text input
  if (state.isEditingText) {
    cancelInlineText();
  }
  
  // Deselect current tool to reset to a clean state
  selectTool(null);

  // IMMEDIATELY CLEAR ANNOTATIONS AND HISTORY
  state.annotations = [];
  state.history = [];
  state.historyIndex = -1;
  state.selectedAnnotationIndex = -1;
  state.selectedImage = false;

  // Reset container background settings
  state.windowContainerApplied = false;
  state.originalImageBeforeContainer = null;
  state.studioSourceImage = null;
  state.studioContentRect = null;
  state.pendingStudioDisplaySize = null;
  state.studioDisplaySizeLock = null;
  state.containerGradient = 'none';
  state.containerBgBlur = 0;
  state.containerColorPreset = 'normal';
  
  // Update sidebar active states
  const rsGradientSwatches = document.querySelectorAll('.rs-gradient-swatch');
  rsGradientSwatches.forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.rs-color-preset').forEach(s => s.classList.toggle('active', s.dataset.colorPreset === 'normal'));
  const gradientSwatches = document.querySelectorAll('.gradient-swatch');
  gradientSwatches.forEach(s => s.classList.remove('active'));
  const frameSwatches = document.querySelectorAll('.rs-frame-swatch');
  frameSwatches.forEach(s => s.classList.toggle('active', s.dataset.theme === 'default'));
  const btnWindowContainer = document.getElementById('btn-window-container');
  if (btnWindowContainer) btnWindowContainer.classList.remove('active');

  // Return to the empty start screen instead of reloading the previous image.
  elements.ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  state.image = null;
  state.imageWidth = 0;
  state.imageHeight = 0;
  state.baseOriginalImage = null;
  state.imageModified = false;
  elements.canvas.width = 1;
  elements.canvas.height = 1;
  elements.canvas.style.width = '';
  elements.canvas.style.height = '';
  elements.canvas.classList.remove('visible');
  elements.emptyState.classList.remove('hidden');
  document.body.classList.remove('has-image');
  document.body.classList.add('has-content');
  updateStatus();
  updateToolbarState();
  window.dispatchEvent(new CustomEvent('editor-state-change', {
    detail: { hasSelection: false, hasImage: false }
  }));
}

// ------------------------------------------------------------------------------
// Image Loading
// ------------------------------------------------------------------------------

async function loadCaptureData(captureData, options = {}) {
  if (captureData.type === 'single') {
    loadImage(captureData.dataUrl, options);
    return;
  }
  // Sort screens left-to-right and align at the top edge. Use each display's
  // actual bitmap size so fullscreen capture stays sharp on Retina/HiDPI Macs
  // instead of being downscaled to logical display bounds.
  const sorted = [...captureData.screens].sort((a, b) => a.bounds.x - b.bounds.x);
  const images = await Promise.all(sorted.map((screen) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = screen.dataUrl;
  })));
  const pixelWidthFor = (screen, image) => screen.pixelSize?.width || image.naturalWidth || image.width || screen.bounds.width;
  const pixelHeightFor = (screen, image) => screen.pixelSize?.height || image.naturalHeight || image.height || screen.bounds.height;
  const totalWidth = sorted.reduce((sum, screen, index) => sum + pixelWidthFor(screen, images[index]), 0);
  const maxHeight = Math.max(...sorted.map((screen, index) => pixelHeightFor(screen, images[index])));
  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = maxHeight;
  const ctx = canvas.getContext('2d');
  let offsetX = 0;
  sorted.forEach((screen, index) => {
    const image = images[index];
    const width = pixelWidthFor(screen, image);
    const height = pixelHeightFor(screen, image);
    ctx.drawImage(image, offsetX, 0, width, height);
    offsetX += width;
  });
  loadImage(canvas.toDataURL('image/png'), options);
}

function loadImage(dataUrl, options = {}) {
  const previousZoom = Number.isFinite(state.zoom) ? state.zoom : INITIAL_IMAGE_ZOOM;
  const previousDisplaySize = {
    width: state.imageWidth > 0 ? state.imageWidth * state.renderScaleX : 0,
    height: state.imageHeight > 0 ? state.imageHeight * state.renderScaleY : 0,
  };
  // Where the canvas sits right now. An internal re-render swaps in a bitmap of a
  // different size, and anchoring its centre here keeps it under the same point
  // instead of snapping back to the middle of the workspace.
  const previousCenter = state.image && previousDisplaySize.width > 0
    ? {
        x: state.imageOffsetX + previousDisplaySize.width / 2,
        y: state.imageOffsetY + previousDisplaySize.height / 2,
      }
    : null;
  const preserveDisplaySize = options.preserveDisplaySize ?? options.isInternal;
  const preserveZoom = options.preserveZoom ?? false;
  const keepAnnotations = options.keepAnnotations ?? false;
  const img = new Image();
  img.onload = () => {
    state.image = img;
    state.imageWidth = img.width;
    state.imageHeight = img.height;
    if (!options.isInternal) {
      state.baseOriginalImage = dataUrl;
      state.originalImageBeforeContainer = null;
      state.studioSourceImage = null;
      state.studioContentRect = null;
      state.windowContainerApplied = false;
      state.pendingStudioDisplaySize = null;
      state.studioDisplaySizeLock = null;
    } else {
      if (!state.windowContainerApplied) state.originalImageBeforeContainer = null;
    }
    if (!keepAnnotations) {
      state.annotations = [];
      state.history = [];
      state.historyIndex = -1;
      state.selectedAnnotationIndex = -1;
      clearToolSelection();
    }
    elements.canvas.width = img.width;
    elements.canvas.height = img.height;
    elements.canvas.classList.add('visible');
    elements.emptyState.classList.add('hidden');
    document.body.classList.add('has-image');
    document.body.classList.remove('has-content');
    resetFloatingToolbar();
    setAppWindowMode('editor');
    elements.statusTool?.parentElement?.classList.add('visible');
    if (preserveDisplaySize) {
      setLoadedImageDisplaySize(
        typeof preserveDisplaySize === 'object' ? preserveDisplaySize : previousDisplaySize,
        previousZoom,
        options.anchorCenter === false ? null : previousCenter
      );
    } else if (preserveZoom) {
      setLoadedImageZoom(previousZoom);
    } else {
      setInitialImageZoom();
    }
    options.beforeRender?.();
    render();
    updateStatus();
    updateToolbarState();
    options.onLoaded?.();
  };
  img.src = dataUrl;
}

// ------------------------------------------------------------------------------
// Zoom & Pan
// ------------------------------------------------------------------------------

function setZoom(newZoom) {
  const previousZoom = Math.max(0.1, state.zoom || 1);
  state.zoom = Math.max(0.1, Math.min(10, newZoom));
  const ratio = state.zoom / previousZoom;
  state.renderScaleX = Math.max(0.1, Math.min(10, state.renderScaleX * ratio));
  state.renderScaleY = Math.max(0.1, Math.min(10, state.renderScaleY * ratio));
  applyZoom();
  updateStatus();
  if (state.cropActive) updateCropUI();
}

function setZoomPercent(percent) {
  const value = Number(percent);
  if (!Number.isFinite(value)) {
    updateStatus();
    return;
  }
  setZoom(value / 100);
}

function applyZoom() {
  elements.canvas.style.width = (state.imageWidth * state.renderScaleX) + 'px';
  elements.canvas.style.height = (state.imageHeight * state.renderScaleY) + 'px';
  applyCanvasPosition();
}

function getRenderScale() {
  return Math.min(state.renderScaleX, state.renderScaleY);
}

function applyCanvasPosition() {
  elements.canvas.style.left = `${state.imageOffsetX}px`;
  elements.canvas.style.top = `${state.imageOffsetY}px`;
}

function getVisibleElementRect(selector) {
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 1 || rect.height <= 1) return null;
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return null;
  return rect;
}

function getVisualWorkspaceRect() {
  const containerRect = elements.container.getBoundingClientRect();
  let left = containerRect.left;
  let right = containerRect.right;
  let top = containerRect.top;
  let bottom = containerRect.bottom;

  const leftSidebarRect = getVisibleElementRect('#editor-sidebar-root [data-sidebar="sidebar"]');
  if (leftSidebarRect) left = Math.max(left, leftSidebarRect.right);

  const rightSidebarRect = getVisibleElementRect('#right-sidebar');
  if (rightSidebarRect) right = Math.min(right, rightSidebarRect.left);

  const toolbarRect = getVisibleElementRect('.toolbar');
  if (toolbarRect) top = Math.max(top, toolbarRect.bottom);

  const bottomToolbarRect = getVisibleElementRect('#bottom-toolbar');
  if (bottomToolbarRect) bottom = Math.min(bottom, bottomToolbarRect.top);

  const statusbarRect = getVisibleElementRect('.statusbar.visible');
  if (statusbarRect) bottom = Math.min(bottom, statusbarRect.top);

  if (right - left < 240) {
    left = containerRect.left;
    right = containerRect.right;
  }
  if (bottom - top < 180) {
    top = containerRect.top;
    bottom = containerRect.bottom;
  }

  return { left, right, top, bottom, width: right - left, height: bottom - top };
}

function centerCanvasInWorkspace() {
  if (!state.image) return;
  const workspace = getVisualWorkspaceRect();
  const containerRect = elements.container.getBoundingClientRect();
  const displayW = state.imageWidth * state.renderScaleX;
  const displayH = state.imageHeight * state.renderScaleY;

  state.imageOffsetX = workspace.left - containerRect.left + elements.container.scrollLeft + (workspace.width - displayW) / 2;
  state.imageOffsetY = workspace.top - containerRect.top + elements.container.scrollTop + (workspace.height - displayH) / 2;
  applyCanvasPosition();
}

function setLoadedImageZoom(zoom) {
  const workspace = getVisualWorkspaceRect();
  if (workspace.width <= 0 || workspace.height <= 0) {
    requestAnimationFrame(() => setLoadedImageZoom(zoom));
    return;
  }

  state.zoom = Math.max(0.1, Math.min(10, zoom));
  state.renderScaleX = state.zoom;
  state.renderScaleY = state.zoom;
  applyZoom();
  centerCanvasInWorkspace();
  updateStatus();
}

function setLoadedImageDisplaySize(displaySize, fallbackZoom = INITIAL_IMAGE_ZOOM, anchorCenter = null) {
  const sourceWidth = state.imageWidth;
  const sourceHeight = state.imageHeight;
  const scaleX = displaySize.width > 0 && sourceWidth > 0 ? displaySize.width / sourceWidth : fallbackZoom;
  const scaleY = displaySize.height > 0 && sourceHeight > 0 ? displaySize.height / sourceHeight : fallbackZoom;
  state.renderScaleX = Math.max(0.1, Math.min(10, Number.isFinite(scaleX) && scaleX > 0 ? scaleX : fallbackZoom));
  state.renderScaleY = Math.max(0.1, Math.min(10, Number.isFinite(scaleY) && scaleY > 0 ? scaleY : fallbackZoom));
  applyZoom();
  if (anchorCenter) {
    // Keep the surface exactly where the user left it. The studio frame grows and
    // shrinks symmetrically around its centre, so pinning the centre means only a
    // manual drag ever moves the image.
    state.imageOffsetX = anchorCenter.x - (state.imageWidth * state.renderScaleX) / 2;
    state.imageOffsetY = anchorCenter.y - (state.imageHeight * state.renderScaleY) / 2;
    applyCanvasPosition();
  } else {
    centerCanvasInWorkspace();
  }
}

function setInitialImageZoom() {
  const workspace = getVisualWorkspaceRect();
  if (workspace.width <= 0 || workspace.height <= 0) {
    requestAnimationFrame(() => setInitialImageZoom());
    return;
  }

  const availableWidth = Math.max(120, workspace.width - 56);
  const availableHeight = Math.max(120, workspace.height - 56);
  const fitZoom = Math.min(availableWidth / state.imageWidth, availableHeight / state.imageHeight, 1);
  setLoadedImageZoom(Number.isFinite(fitZoom) && fitZoom > 0 ? fitZoom : INITIAL_IMAGE_ZOOM);
}

function fitToWindow() {
  if (!state.image) return;
  const workspace = getVisualWorkspaceRect();
  
  // If container hasn't laid out yet, retry on next frame
  if (workspace.width <= 0 || workspace.height <= 0) {
    requestAnimationFrame(() => fitToWindow());
    return;
  }
  
  // Ensure we don't get negative or tiny sizes on small screens
  const safeAvailW = Math.max(workspace.width - 48, workspace.width * 0.6);
  const safeAvailH = Math.max(workspace.height - 48, workspace.height * 0.6);

  const scaleX = safeAvailW / state.imageWidth;
  const scaleY = safeAvailH / state.imageHeight;
  setLoadedImageZoom(Math.min(scaleX, scaleY, 1));
}

function onWheel(e) {
  if (!state.image || (!e.ctrlKey && !e.metaKey)) return;
  e.preventDefault();
  setZoom(state.zoom * (e.deltaY > 0 ? 0.9 : 1.1));
}

function bindSubtleSidebarScroll(sidebar) {
  let targetScroll = sidebar.scrollTop;
  let frameId = 0;

  const step = () => {
    const distance = targetScroll - sidebar.scrollTop;
    if (Math.abs(distance) < 0.5) {
      sidebar.scrollTop = targetScroll;
      frameId = 0;
      return;
    }

    sidebar.scrollTop += distance * 0.45;
    frameId = requestAnimationFrame(step);
  };

  sidebar.addEventListener('wheel', (event) => {
    if (!sidebar.classList.contains('expanded') || event.ctrlKey || event.metaKey) return;

    const maxScroll = sidebar.scrollHeight - sidebar.clientHeight;
    if (maxScroll <= 0) return;

    event.preventDefault();
    targetScroll = Math.max(0, Math.min(maxScroll, targetScroll + event.deltaY * 0.88));

    if (!frameId) {
      frameId = requestAnimationFrame(step);
    }
  }, { passive: false });
}

function bindZoomControls() {
  on(elements.btnZoomOut, 'click', () => setZoomPercent(Math.round(state.zoom * 100) - 3));
  on(elements.btnZoomIn, 'click', () => setZoomPercent(Math.round(state.zoom * 100) + 3));
  on(elements.btnZoomReset, 'click', () => {
    if (state.image) fitToWindow();
  });
  on(elements.statusZoom, 'focus', () => {
    elements.statusZoom.select?.();
  });
  on(elements.statusZoom, 'keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      elements.statusZoom.blur();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      updateStatus();
      elements.statusZoom.blur();
    }
  });
  on(elements.statusZoom, 'blur', () => {
    const value = String(elements.statusZoom.value || '').replace(/[^\d.]/g, '');
    setZoomPercent(value);
  });
}

// ------------------------------------------------------------------------------
// Tool Selection
// ------------------------------------------------------------------------------

const DRAWING_TOOLS = ['rect', 'ellipse', 'arrow', 'line', 'text', 'pixelate', 'blur', 'badge'];

function selectTool(tool) {
  if (state.currentTool === tool && tool !== 'select') return;
  
  if (state.isEditingText) commitInlineText();
  
  if (tool === 'crop') {
    if (!state.cropActive) startCrop();
    else cancelCrop();
    state.currentTool = tool;
    if (elements.toolBtns) elements.toolBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tool === tool));
    if (elements.bottomToolBtns) elements.bottomToolBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tool === tool));
    updateToolbarState();
    return;
  }
  
  if (state.cropActive && tool !== 'crop') {
    cancelCrop();
  }
  
  state.currentTool = tool;
  
  if (elements.toolBtns) {
    elements.toolBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tool === tool));
  }
  if (elements.bottomToolBtns) {
    elements.bottomToolBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tool === tool));
  }
  elements.container.className = tool ? `canvas-container tool-${tool}` : 'canvas-container';
  elements.canvas.style.cursor = !tool ? 'default' : (tool === 'text' ? 'text' : (tool === 'select' ? 'default' : 'crosshair'));
  render();
  updateToolbarState();

  if (DRAWING_TOOLS.includes(tool)) {
    selectColor(state.currentColor || '#111111');
  }
  toggleTextStyleControls();
  updateStatus();
}

function clearToolSelection() {
  selectTool(null);
  state.selectedAnnotationIndex = -1;
  state.selectedImage = false;
  render();
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function selectColor(color) {
  state.currentColor = color;
  elements.colorSwatches.forEach(s => s.classList.toggle('active', s.dataset.color === color));
  if (state.isEditingText) elements.textInput.style.color = color;
  if (elements.textStyleBold) {
    elements.textStyleBold.style.setProperty('--style-active-color', color);
    elements.textStyleBold.style.setProperty('--style-active-bg', hexToRgba(color, 0.2));
  }
  if (elements.textStyleItalic) {
    elements.textStyleItalic.style.setProperty('--style-active-color', color);
    elements.textStyleItalic.style.setProperty('--style-active-bg', hexToRgba(color, 0.2));
  }

  if (state.selectedAnnotationIndex >= 0) {
    const selected = state.annotations[state.selectedAnnotationIndex];
    if (selected) {
      selected.color = color;
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push([...state.annotations.map(a => ({ ...a }))]);
      state.historyIndex = state.history.length - 1;
      render();
      updateToolbarState();
    }
  }
}

function selectStrokeWidth(width) {
  state.strokeWidth = width;
  document.querySelectorAll('.stroke-option').forEach(btn =>
    btn.classList.toggle('active', parseInt(btn.dataset.width) === width)
  );
  const line = document.getElementById('stroke-current-line');
  if (line) {
    const h = width === 2 ? 1.5 : width === 8 ? 5.5 : 3;
    line.style.height = `${h}px`;
  }
}

function selectTextFontSize(size) {
  if (!Number.isFinite(size) || size <= 0) return;
  state.textFontSize = size;
  if (elements.sizeCurrentLabel) {
    elements.sizeCurrentLabel.textContent = String(size);
  }
  document.querySelectorAll('.size-option').forEach((opt) => {
    opt.classList.toggle('active', parseInt(opt.dataset.size, 10) === size);
  });
  if ((state.currentTool === 'select' || state.currentTool === 'text') && state.selectedAnnotationIndex >= 0) {
    const selected = state.annotations[state.selectedAnnotationIndex];
    if (selected?.type === 'text') {
      selected.fontSize = size;
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push([...state.annotations.map(a => ({ ...a }))]);
      state.historyIndex = state.history.length - 1;
      render();
      updateToolbarState();
    }
  }
  if (state.isEditingText) {
    elements.textInput.style.fontSize = Math.round(size * getRenderScale()) + 'px';
    autoResizeTextInput();
  }
}

function fontFamilyToLabel(family) {
  const option = document.querySelector(`.font-option[data-family="${CSS.escape(family)}"]`);
  return option ? option.textContent : family;
}

function selectTextFontFamily(family) {
  state.textFontFamily = family;
  if (elements.fontCurrentLabel) {
    elements.fontCurrentLabel.textContent = fontFamilyToLabel(family);
    elements.fontCurrentLabel.style.fontFamily = family;
  }
  document.querySelectorAll('.font-option').forEach((opt) => {
    opt.classList.toggle('active', opt.dataset.family === family);
  });
  if ((state.currentTool === 'select' || state.currentTool === 'text') && state.selectedAnnotationIndex >= 0) {
    const selected = state.annotations[state.selectedAnnotationIndex];
    if (selected?.type === 'text') {
      selected.fontFamily = family;
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push([...state.annotations.map(a => ({ ...a }))]);
      state.historyIndex = state.history.length - 1;
      render();
      updateToolbarState();
    }
  }
  if (state.isEditingText) elements.textInput.style.fontFamily = family;
}

function buildFontString(annotation) {
  const bold = annotation.fontBold !== undefined ? annotation.fontBold : state.textBold;
  const italic = annotation.fontItalic !== undefined ? annotation.fontItalic : state.textItalic;
  const weight = bold ? 'bold' : 'normal';
  const style = italic ? 'italic' : 'normal';
  const size = annotation.fontSize || state.textFontSize || 30;
  const family = annotation.fontFamily || state.textFontFamily || '-apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif';
  return `${style} ${weight} ${size}px ${family}`;
}

function selectTextBold() {
  state.textBold = !state.textBold;
  if (elements.textStyleBold) elements.textStyleBold.setAttribute('aria-pressed', String(state.textBold));
  if ((state.currentTool === 'select' || state.currentTool === 'text') && state.selectedAnnotationIndex >= 0) {
    const selected = state.annotations[state.selectedAnnotationIndex];
    if (selected?.type === 'text') {
      selected.fontBold = state.textBold;
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push([...state.annotations.map(a => ({ ...a }))]);
      state.historyIndex = state.history.length - 1;
      render();
      updateToolbarState();
    }
  }
  if (state.isEditingText) {
    elements.textInput.style.fontWeight = state.textBold ? 'bold' : 'normal';
  }
}

function selectTextItalic() {
  state.textItalic = !state.textItalic;
  if (elements.textStyleItalic) elements.textStyleItalic.setAttribute('aria-pressed', String(state.textItalic));
  if ((state.currentTool === 'select' || state.currentTool === 'text') && state.selectedAnnotationIndex >= 0) {
    const selected = state.annotations[state.selectedAnnotationIndex];
    if (selected?.type === 'text') {
      selected.fontItalic = state.textItalic;
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push([...state.annotations.map(a => ({ ...a }))]);
      state.historyIndex = state.history.length - 1;
      render();
      updateToolbarState();
    }
  }
  if (state.isEditingText) {
    elements.textInput.style.fontStyle = state.textItalic ? 'italic' : 'normal';
  }
}

function selectTextUnderline() {
  state.textUnderline = !state.textUnderline;
  if ((state.currentTool === 'select' || state.currentTool === 'text') && state.selectedAnnotationIndex >= 0) {
    const selected = state.annotations[state.selectedAnnotationIndex];
    if (selected?.type === 'text') {
      selected.fontUnderline = state.textUnderline;
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push([...state.annotations.map(a => ({ ...a }))]);
      state.historyIndex = state.history.length - 1;
      render();
      updateToolbarState();
    }
  }
  if (state.isEditingText) {
    elements.textInput.style.textDecoration = state.textUnderline ? 'underline' : 'none';
  }
}

function getTextBounds(annotation) {
  const ctx = elements.ctx;
  const fontSize = annotation.fontSize || state.textFontSize || 24;
  const lines = annotation.text.split('\n');
  const lineHeight = fontSize * 1.2;
  ctx.save();
  ctx.font = buildFontString(annotation);
  const maxWidth = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);
  ctx.restore();
  return {
    x: annotation.x,
    y: annotation.y - lineHeight,
    width: Math.max(1, maxWidth),
    height: Math.max(1, lineHeight * Math.max(lines.length, 1)),
    lineHeight,
  };
}

function toggleTextStyleControls() {
  const selected = state.annotations[state.selectedAnnotationIndex];
  const visible = state.currentTool === 'text' || (state.currentTool === 'select' && selected?.type === 'text');
  elements.textStyleGroup?.classList.toggle('text-style-hidden', !visible);
  elements.textStyleSeparator?.classList.toggle('text-style-hidden', !visible);

  if (visible) {
    if (selected?.type === 'text') {
      if (elements.fontCurrentLabel) {
        const fam = selected.fontFamily || state.textFontFamily;
        elements.fontCurrentLabel.textContent = fontFamilyToLabel(fam);
        elements.fontCurrentLabel.style.fontFamily = fam;
      }
      if (elements.sizeCurrentLabel) {
        elements.sizeCurrentLabel.textContent = String(selected.fontSize || state.textFontSize);
      }
      if (elements.textStyleBold) elements.textStyleBold.setAttribute('aria-pressed', String(selected.fontBold !== undefined ? selected.fontBold : state.textBold));
      if (elements.textStyleItalic) elements.textStyleItalic.setAttribute('aria-pressed', String(selected.fontItalic !== undefined ? selected.fontItalic : state.textItalic));
    } else {
      if (elements.fontCurrentLabel) {
        elements.fontCurrentLabel.textContent = fontFamilyToLabel(state.textFontFamily);
        elements.fontCurrentLabel.style.fontFamily = state.textFontFamily;
      }
      if (elements.sizeCurrentLabel) {
        elements.sizeCurrentLabel.textContent = String(state.textFontSize);
      }
      if (elements.textStyleBold) elements.textStyleBold.setAttribute('aria-pressed', String(state.textBold));
      if (elements.textStyleItalic) elements.textStyleItalic.setAttribute('aria-pressed', String(state.textItalic));
    }
  }
}

// ------------------------------------------------------------------------------
// Canvas Drawing Events
// ------------------------------------------------------------------------------

function getCanvasCoords(e) {
  const rect = elements.canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (state.imageWidth / rect.width),
    y: (e.clientY - rect.top) * (state.imageHeight / rect.height),
  };
}

function cloneAnnotations() {
  return state.annotations.map(a => ({ ...a }));
}

function setImageCanvasSize(width, height) {
  state.imageWidth = Math.max(1, Math.round(width));
  state.imageHeight = Math.max(1, Math.round(height));
  elements.canvas.width = state.imageWidth;
  elements.canvas.height = state.imageHeight;
  applyZoom();
}

function makeImageHistoryEntry(imageDataUrl = getImageDataUrl(), annotations = cloneAnnotations()) {
  return {
    image: imageDataUrl,
    width: state.imageWidth,
    height: state.imageHeight,
    annotations,
  };
}

function isPointInImage(coords) {
  return coords.x >= 0 && coords.x <= state.imageWidth && coords.y >= 0 && coords.y <= state.imageHeight;
}

function findTextAnnotationAt(coords) {
  for (let i = state.annotations.length - 1; i >= 0; i--) {
    const ann = state.annotations[i];
    if (ann.type !== 'text') continue;
    const bounds = getTextBounds(ann);
    if (coords.x >= bounds.x - 5 && coords.x <= bounds.x + bounds.width + 5 &&
        coords.y >= bounds.y && coords.y <= bounds.y + bounds.height) {
      return i;
    }
  }
  return -1;
}

function findAnnotationAt(coords) {
  for (let i = state.annotations.length - 1; i >= 0; i--) {
    const a = state.annotations[i];
    if (a.type === 'text' && findTextAnnotationAt(coords) === i) return i;
    if (a.type === 'rect' || a.type === 'highlight' || a.type === 'blur' || a.type === 'ellipse' || a.type === 'pixelate') {
      if (coords.x >= a.x && coords.x <= a.x + a.width && coords.y >= a.y && coords.y <= a.y + a.height) return i;
    }
    if (a.type === 'badge') {
      if (Math.hypot(coords.x - a.x, coords.y - a.y) <= 18) return i;
    }
    if (a.type === 'line' || a.type === 'arrow') {
      const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
      const len2 = dx*dx + dy*dy || 1;
      const t = Math.max(0, Math.min(1, ((coords.x-a.x1)*dx + (coords.y-a.y1)*dy)/len2));
      const px = a.x1 + t*dx, py = a.y1 + t*dy;
      if (Math.hypot(coords.x-px, coords.y-py) <= 8) return i;
    }
  }
  return -1;
}

function moveAnnotation(annotation, dx, dy) {
  if ('x' in annotation) annotation.x += dx;
  if ('y' in annotation) annotation.y += dy;
  if ('x1' in annotation) { annotation.x1 += dx; annotation.x2 += dx; }
  if ('y1' in annotation) { annotation.y1 += dy; annotation.y2 += dy; }
}

function onCanvasPointerDown(e) {
  if (e.button !== 0) return;
  elements.canvas.setPointerCapture(e.pointerId);
  onCanvasMouseDown(e);
}

function onCanvasPointerUp(e) {
  onCanvasMouseUp(e);
  if (elements.canvas.hasPointerCapture(e.pointerId)) {
    elements.canvas.releasePointerCapture(e.pointerId);
  }
}

function onCanvasMouseDown(e) {
  if (!state.image || state.cropActive) return;
  if (state.isEditingText) { commitInlineText(); return; }
  
  const coords = getCanvasCoords(e);

  if (!state.currentTool && isPointInImage(coords)) {
    selectTool('select');
  }

  if (state.currentTool === 'select') {
    const imageHandle = findImageResizeHandleAt(coords);
    if (imageHandle) {
      state.isResizingImage = true;
      state.imageResizeHandle = imageHandle;
      state.selectedImage = true;
      state.selectedAnnotationIndex = -1;
      state.imageResizeOrig = {
        clientX: e.clientX,
        clientY: e.clientY,
        width: state.imageWidth,
        height: state.imageHeight,
        offsetX: state.imageOffsetX,
        offsetY: state.imageOffsetY,
        scaleX: state.renderScaleX,
        scaleY: state.renderScaleY,
        image: getImageDataUrl(),
        annotations: cloneAnnotations(),
        contentRect: state.studioContentRect ? { ...state.studioContentRect } : null,
      };
      elements.canvas.style.cursor = imageHandle.cursor;
      render();
      return;
    }

    const handle = findResizeHandleAt(coords);
    if (handle) {
      state.isResizingAnnotation = true;
      state.resizeHandle = handle;
      state.selectedImage = false;
      state.dragStartX = coords.x;
      state.dragStartY = coords.y;
      elements.canvas.style.cursor = handle.cursor;
      return;
    }

    const idx = findAnnotationAt(coords);
    state.selectedAnnotationIndex = idx;
    state.selectedImage = idx < 0 && isPointInImage(coords);
    if (idx >= 0) {
      state.isDraggingAnnotation = true;
      state.dragAnnotationIndex = idx;
      state.dragStartX = coords.x;
      state.dragStartY = coords.y;
      elements.canvas.style.cursor = 'grabbing';
    } else if (state.selectedImage) {
      state.isDraggingCanvas = true;
      state.dragCanvasStartX = e.clientX;
      state.dragCanvasStartY = e.clientY;
      state.dragCanvasOrigX = state.imageOffsetX;
      state.dragCanvasOrigY = state.imageOffsetY;
      elements.canvas.style.cursor = 'grabbing';
    }
    updateToolbarState();
    render();
    return;
  }
  
  if (state.currentTool === 'text') {
    const textIdx = findTextAnnotationAt(coords);
    if (textIdx >= 0) {
      state.selectedAnnotationIndex = textIdx;
      state.selectedImage = false;
      state.isDraggingText = true;
      state.dragTextIndex = textIdx;
      state.dragOffsetX = coords.x - state.annotations[textIdx].x;
      state.dragOffsetY = coords.y - state.annotations[textIdx].y;
      elements.canvas.style.cursor = 'grabbing';
      updateToolbarState();
      render();
      return;
    }
    state.selectedAnnotationIndex = -1;
    state.selectedImage = false;
    updateToolbarState();
    openInlineText(coords);
    e.stopPropagation();
    return;
  }
  
  if (state.currentTool === 'magic-wand') {
    startMagicWandSelection(coords.x, coords.y);
    return;
  }

  if (state.currentTool === 'badge') {
    state.selectedImage = false;
    const maxBadge = state.annotations.reduce((max, a) => (a.type === 'badge' && a.number > max) ? a.number : max, 0);
    state.annotations.push({
      type: 'badge',
      x: coords.x,
      y: coords.y,
      number: maxBadge + 1,
      color: state.currentColor
    });
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push([...state.annotations.map(a => ({ ...a }))]);
    state.historyIndex = state.history.length - 1;
    render();
    return;
  }

  state.selectedImage = false;
  state.isDrawing = true;
  state.startX = coords.x;
  state.startY = coords.y;
}

function onCanvasMouseMove(e) {
  if (!state.image || state.cropActive) return;
  
  if (state.isResizingImage) {
    scheduleImageResize(e);
    return;
  }

  if (state.isDraggingAnnotation) {
    const coords = getCanvasCoords(e);
    const dx = coords.x - state.dragStartX;
    const dy = coords.y - state.dragStartY;
    state.dragStartX = coords.x;
    state.dragStartY = coords.y;
    moveAnnotation(state.annotations[state.dragAnnotationIndex], dx, dy);
    render();
    return;
  }
  if (state.isDraggingCanvas) {
    state.imageOffsetX = state.dragCanvasOrigX + e.clientX - state.dragCanvasStartX;
    state.imageOffsetY = state.dragCanvasOrigY + e.clientY - state.dragCanvasStartY;
    applyCanvasPosition();
    return;
  }
  if (state.isResizingAnnotation) {
    const coords = getCanvasCoords(e);
    resizeSelectedAnnotation(coords);
    render();
    return;
  }
  if (state.isDraggingText) {
    const coords = getCanvasCoords(e);
    state.annotations[state.dragTextIndex].x = coords.x - state.dragOffsetX;
    state.annotations[state.dragTextIndex].y = coords.y - state.dragOffsetY;
    render();
    return;
  }
  
  if (state.currentTool === 'select' && !state.isDrawing && !state.isDraggingAnnotation) {
    const coords = getCanvasCoords(e);
    const handle = findImageResizeHandleAt(coords) || findResizeHandleAt(coords);
    if (handle) elements.canvas.style.cursor = handle.cursor;
    else elements.canvas.style.cursor = findAnnotationAt(coords) >= 0 || isPointInImage(coords) ? 'grab' : 'default';
  }

  if (state.currentTool === 'text' && !state.isDrawing) {
    const coords = getCanvasCoords(e);
    elements.canvas.style.cursor = findTextAnnotationAt(coords) >= 0 ? 'grab' : 'text';
  }

  if (!state.isDrawing) return;
  const coords = getCanvasCoords(e);
  render();
  drawPreview(state.startX, state.startY, coords.x, coords.y);
}

function onCanvasMouseUp(e) {
  if (state.isResizingImage) {
    flushImageResize(e);
    const changed = state.imageResizeOrig &&
      (state.imageWidth !== state.imageResizeOrig.width || state.imageHeight !== state.imageResizeOrig.height);
    if (changed) {
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push({
        image: state.imageResizeOrig.image,
        width: state.imageResizeOrig.width,
        height: state.imageResizeOrig.height,
        annotations: state.imageResizeOrig.annotations,
      });
      state.historyIndex = state.history.length - 1;
    }
    state.isResizingImage = false;
    state.imageResizeHandle = null;
    state.imageResizeOrig = null;
    elements.canvas.style.cursor = state.currentTool === 'select' ? 'default' : elements.canvas.style.cursor;
    updateStatus();
    updateToolbarState();
    render();
    return;
  }

  if (state.isDraggingAnnotation) {
    state.isDraggingAnnotation = false;
    state.dragAnnotationIndex = -1;
    elements.canvas.style.cursor = state.currentTool === 'select' ? 'default' : elements.canvas.style.cursor;
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push([...state.annotations.map(a => ({...a}))]);
    state.historyIndex = state.history.length - 1;
    updateToolbarState();
    render();
    return;
  }
  if (state.isDraggingCanvas) {
    state.isDraggingCanvas = false;
    elements.canvas.style.cursor = state.currentTool === 'select' ? 'grab' : elements.canvas.style.cursor;
    render();
    return;
  }
  if (state.isResizingAnnotation) {
    state.isResizingAnnotation = false;
    state.resizeHandle = null;
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push([...state.annotations.map(a => ({...a}))]);
    state.historyIndex = state.history.length - 1;
    updateToolbarState();
    elements.canvas.style.cursor = 'default';
    render();
    return;
  }
  if (state.isDraggingText) {
    state.isDraggingText = false;
    elements.canvas.style.cursor = 'text';
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push([...state.annotations.map(a => ({...a}))]);
    state.historyIndex = state.history.length - 1;
    updateToolbarState();
    elements.canvas.style.cursor = state.currentTool === 'select' ? 'default' : elements.canvas.style.cursor;
    return;
  }

  if (!state.isDrawing || !state.image) return;
  const coords = getCanvasCoords(e);
  state.isDrawing = false;
  
  if (Math.abs(coords.x - state.startX) < 5 && Math.abs(coords.y - state.startY) < 5) {
    render();
    return;
  }
  
  addAnnotation(createAnnotation(state.startX, state.startY, coords.x, coords.y));
}

// ------------------------------------------------------------------------------
// Inline Text Editing
// ------------------------------------------------------------------------------

function openInlineText(coords) {
  state.isEditingText = true;
  state.pendingTextPos = coords;
  
  const canvasRect = elements.canvas.getBoundingClientRect();
  const containerRect = elements.container.getBoundingClientRect();
  const scaleX = canvasRect.width / state.imageWidth;
  const scaleY = canvasRect.height / state.imageHeight;
  
  const x = canvasRect.left + coords.x * scaleX - containerRect.left + elements.container.scrollLeft;
  const y = canvasRect.top + coords.y * scaleY - containerRect.top + elements.container.scrollTop;
  
  const wrapper = elements.textWrapper;
  wrapper.style.left = x + 'px';
  wrapper.style.top = y + 'px';
  wrapper.classList.add('visible');
  
  const input = elements.textInput;
  input.value = '';
  input.style.color = state.currentColor;
  input.style.fontSize = Math.round(state.textFontSize * getRenderScale()) + 'px';
  input.style.fontFamily = state.textFontFamily;
  input.style.fontWeight = state.textBold ? 'bold' : 'normal';
  input.style.fontStyle = state.textItalic ? 'italic' : 'normal';
  input.style.textDecoration = state.textUnderline ? 'underline' : 'none';
  setTimeout(() => input.focus(), 0);
  autoResizeTextInput();
}

function commitInlineText() {
  const text = elements.textInput.value.trim();
  state.isEditingText = false;
  elements.textWrapper.classList.remove('visible');
  
  if (text && state.pendingTextPos) {
    addAnnotation({
      type: 'text',
      x: state.pendingTextPos.x,
      y: state.pendingTextPos.y,
      text,
      color: state.currentColor,
      fontSize: state.textFontSize,
      fontFamily: state.textFontFamily,
      fontBold: state.textBold,
      fontItalic: state.textItalic,
      fontUnderline: state.textUnderline,
    });
  }
  state.pendingTextPos = null;
}

function cancelInlineText() {
  state.isEditingText = false;
  elements.textWrapper.classList.remove('visible');
  state.pendingTextPos = null;
}

function autoResizeTextInput() {
  const input = elements.textInput;
  input.style.height = 'auto';
  input.style.height = input.scrollHeight + 'px';
  input.style.width = Math.max(120, input.scrollWidth + 20) + 'px';
}

// ------------------------------------------------------------------------------
// Annotation Creation & History
// ------------------------------------------------------------------------------

function createAnnotation(x1, y1, x2, y2) {
  const base = { type: state.currentTool, color: state.currentColor, strokeWidth: state.strokeWidth };
  switch (state.currentTool) {
    case 'rect': case 'ellipse': case 'highlight': case 'blur': case 'pixelate':
      return { ...base, x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
    case 'arrow': case 'line':
      return { ...base, x1, y1, x2, y2 };
    default: return base;
  }
}

function addAnnotation(annotation) {
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push([...state.annotations, annotation]);
  state.historyIndex = state.history.length - 1;
  state.annotations = [...state.annotations, annotation];
  state.selectedAnnotationIndex = -1;
  render();
  updateStatus();
  updateToolbarState();
}

function undo() {
  if (state.cropActive) cancelCrop();
  if (state.historyIndex < 0) return;

  const entry = state.history[state.historyIndex];

  if (entry && entry.image) {
    state.history[state.historyIndex] = makeImageHistoryEntry();
    state.historyIndex--;
    const img = new Image();
    img.onload = () => {
      state.image = img;
      setImageCanvasSize(entry.width || img.width, entry.height || img.height);
      state.annotations = entry.annotations ? [...entry.annotations.map(a => ({...a}))] : [];
      state.selectedAnnotationIndex = -1;
      state.selectedImage = false;
      render();
      updateStatus();
      updateToolbarState();
    };
    img.src = entry.image;
  } else {
    state.historyIndex--;
    state.annotations = state.historyIndex >= 0 ? [...state.history[state.historyIndex].map(a => ({...a}))] : [];
    if (state.selectedAnnotationIndex >= state.annotations.length) state.selectedAnnotationIndex = -1;
    render();
    updateStatus();
    updateToolbarState();
  }
}

function redo() {
  if (state.cropActive) cancelCrop();
  if (state.historyIndex >= state.history.length - 1) return;

  state.historyIndex++;
  const entry = state.history[state.historyIndex];

  if (entry && entry.image) {
    state.history[state.historyIndex] = makeImageHistoryEntry();
    const img = new Image();
    img.onload = () => {
      state.image = img;
      setImageCanvasSize(entry.width || img.width, entry.height || img.height);
      state.annotations = entry.annotations ? [...entry.annotations.map(a => ({...a}))] : [];
      state.selectedAnnotationIndex = -1;
      state.selectedImage = false;
      render();
      updateStatus();
      updateToolbarState();
    };
    img.src = entry.image;
  } else {
    state.annotations = [...entry.map(a => ({...a}))];
    if (state.selectedAnnotationIndex >= state.annotations.length) state.selectedAnnotationIndex = -1;
    render();
    updateStatus();
    updateToolbarState();
  }
}

// ------------------------------------------------------------------------------
// Rendering
// ------------------------------------------------------------------------------

function render() {
  if (!state.image) return;
  const ctx = elements.ctx;
  ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  ctx.drawImage(state.image, 0, 0, state.imageWidth, state.imageHeight);
  state.annotations.forEach(drawAnnotation);
  drawSelectionHandles();
}

function drawPreview(x1, y1, x2, y2) {
  const ctx = elements.ctx;
  ctx.save();
  ctx.strokeStyle = state.currentColor;
  ctx.lineWidth = state.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([5, 5]);
  switch (state.currentTool) {
    case 'rect': ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); break;
    case 'ellipse': drawEllipse(ctx, Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); break;
    case 'arrow': drawArrow(ctx, x1, y1, x2, y2, false); break;
    case 'line': ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); break;
    case 'highlight': ctx.fillStyle = state.currentColor + '40'; ctx.setLineDash([]); ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); break;
    case 'blur': ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); break;
    case 'pixelate': ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); break;
  }
  ctx.restore();
}

function drawAnnotation(ann) {
  const ctx = elements.ctx;
  ctx.save();
  ctx.strokeStyle = ann.color;
  ctx.fillStyle = ann.color;
  ctx.lineWidth = ann.strokeWidth || 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (ann.type) {
    case 'rect':
      ctx.beginPath();
      ctx.roundRect(ann.x, ann.y, ann.width, ann.height, 8);
      ctx.stroke();
      break;
    case 'ellipse': drawEllipse(ctx, ann.x, ann.y, ann.width, ann.height); break;
    case 'arrow': drawArrow(ctx, ann.x1, ann.y1, ann.x2, ann.y2, true); break;
    case 'line': ctx.beginPath(); ctx.moveTo(ann.x1, ann.y1); ctx.lineTo(ann.x2, ann.y2); ctx.stroke(); break;
    case 'text': {
      ctx.font = buildFontString(ann);
      const lines = ann.text.split('\n');
      const lineHeight = (ann.fontSize || 24) * 1.2;
      lines.forEach((line, i) => {
        const lineY = ann.y + i * lineHeight;
        ctx.fillText(line, ann.x, lineY);
        if (ann.fontUnderline) {
          const m = ctx.measureText(line);
          const lineYOffset = lineY + (ann.fontSize || 24) * 0.15;
          const w = m.width;
          const underlineThickness = Math.max(1, (ann.fontSize || 24) / 12);
          ctx.fillRect(ann.x, lineYOffset, w, underlineThickness);
        }
      });
      break;
    }
    case 'highlight': ctx.fillStyle = ann.color + '40'; ctx.fillRect(ann.x, ann.y, ann.width, ann.height); break;
    case 'blur': applyBlur(ctx, ann.x, ann.y, ann.width, ann.height); break;
    case 'pixelate': applyPixelate(ctx, ann.x, ann.y, ann.width, ann.height); break;
    case 'badge':
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.arc(ann.x, ann.y, 16, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Inter, system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ann.number, ann.x, ann.y + 1);
      break;
  }
  ctx.restore();
}

function drawEllipse(ctx, x, y, width, height) {
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawArrow(ctx, x1, y1, x2, y2, solid) {
  const headLength = Math.max(20, (ctx.lineWidth || 4) * 3.5);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const lineEndX = x2 - headLength * 0.5 * Math.cos(angle);
  const lineEndY = y2 - headLength * 0.5 * Math.sin(angle);
  ctx.lineTo(lineEndX, lineEndY);
  ctx.stroke();
  
  if (solid) ctx.setLineDash([]);
  
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 8), y2 - headLength * Math.sin(angle - Math.PI / 8));
  ctx.lineTo(x2 - headLength * 0.6 * Math.cos(angle), y2 - headLength * 0.6 * Math.sin(angle));
  ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 8), y2 - headLength * Math.sin(angle + Math.PI / 8));
  ctx.closePath();
  ctx.fill();
}

function applyBlur(ctx, x, y, width, height) {
  const pixelSize = 10;
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;
  for (let py = 0; py < height; py += pixelSize) {
    for (let px = 0; px < width; px += pixelSize) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = 0; dy < pixelSize && py + dy < height; dy++) {
        for (let dx = 0; dx < pixelSize && px + dx < width; dx++) {
          const i = ((py + dy) * width + (px + dx)) * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
        }
      }
      r = Math.floor(r / count); g = Math.floor(g / count); b = Math.floor(b / count);
      for (let dy = 0; dy < pixelSize && py + dy < height; dy++) {
        for (let dx = 0; dx < pixelSize && px + dx < width; dx++) {
          const i = ((py + dy) * width + (px + dx)) * 4;
          data[i] = r; data[i + 1] = g; data[i + 2] = b;
        }
      }
    }
  }
  ctx.putImageData(imageData, x, y);
}

function applyPixelate(ctx, x, y, width, height) {
  const pixelSize = 8;
  if (width <= 0 || height <= 0) return;
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.ceil(width / pixelSize));
  off.height = Math.max(1, Math.ceil(height / pixelSize));
  const offCtx = off.getContext('2d');
  offCtx.imageSmoothingEnabled = false;
  offCtx.drawImage(ctx.canvas, x, y, width, height, 0, 0, off.width, off.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, 0, 0, off.width, off.height, x, y, width, height);
  ctx.imageSmoothingEnabled = true;
}

function deleteSelectedAnnotation() {
  if (state.selectedAnnotationIndex < 0) return;
  state.annotations.splice(state.selectedAnnotationIndex, 1);
  state.selectedAnnotationIndex = -1;
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push([...state.annotations.map(a => ({...a}))]);
  state.historyIndex = state.history.length - 1;
  render();
  updateToolbarState();
}

function getAnnotationBounds(annotation) {
  if (!annotation) return null;
  if (annotation.type === 'rect' || annotation.type === 'ellipse' || annotation.type === 'highlight' || annotation.type === 'blur' || annotation.type === 'pixelate') {
    return { x: annotation.x, y: annotation.y, width: annotation.width, height: annotation.height, type: 'box' };
  }
  if (annotation.type === 'line' || annotation.type === 'arrow') {
    return {
      x: Math.min(annotation.x1, annotation.x2),
      y: Math.min(annotation.y1, annotation.y2),
      width: Math.abs(annotation.x2 - annotation.x1),
      height: Math.abs(annotation.y2 - annotation.y1),
      type: 'line',
      x1: annotation.x1, y1: annotation.y1, x2: annotation.x2, y2: annotation.y2,
    };
  }
  if (annotation.type === 'text') {
    const bounds = getTextBounds(annotation);
    return { ...bounds, type: 'box' };
  }
  return null;
}

function findResizeHandleAt(coords) {
  if (state.selectedAnnotationIndex < 0) return null;
  const ann = state.annotations[state.selectedAnnotationIndex];
  const bounds = getAnnotationBounds(ann);
  if (!bounds) return null;
  const size = 10;

  if (bounds.type === 'line') {
    if (Math.hypot(coords.x - bounds.x1, coords.y - bounds.y1) <= size) return { kind: 'line-start', cursor: 'pointer' };
    if (Math.hypot(coords.x - bounds.x2, coords.y - bounds.y2) <= size) return { kind: 'line-end', cursor: 'pointer' };
    return null;
  }

  const handles = [
    { kind: 'nw', x: bounds.x, y: bounds.y, cursor: 'nwse-resize' },
    { kind: 'ne', x: bounds.x + bounds.width, y: bounds.y, cursor: 'nesw-resize' },
    { kind: 'sw', x: bounds.x, y: bounds.y + bounds.height, cursor: 'nesw-resize' },
    { kind: 'se', x: bounds.x + bounds.width, y: bounds.y + bounds.height, cursor: 'nwse-resize' },
  ];
  return handles.find(h => Math.abs(coords.x - h.x) <= size && Math.abs(coords.y - h.y) <= size) || null;
}

function getImageResizeHandles() {
  const w = state.imageWidth;
  const h = state.imageHeight;
  return [
    { kind: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
    { kind: 'n', x: w / 2, y: 0, cursor: 'ns-resize' },
    { kind: 'ne', x: w, y: 0, cursor: 'nesw-resize' },
    { kind: 'e', x: w, y: h / 2, cursor: 'ew-resize' },
    { kind: 'se', x: w, y: h, cursor: 'nwse-resize' },
    { kind: 's', x: w / 2, y: h, cursor: 'ns-resize' },
    { kind: 'sw', x: 0, y: h, cursor: 'nesw-resize' },
    { kind: 'w', x: 0, y: h / 2, cursor: 'ew-resize' },
  ];
}

function findImageResizeHandleAt(coords) {
  if (!state.selectedImage || state.selectedAnnotationIndex >= 0) return null;
  const size = Math.max(10, 12 / Math.max(getRenderScale(), 0.1));
  return getImageResizeHandles().find(h => Math.abs(coords.x - h.x) <= size && Math.abs(coords.y - h.y) <= size) || null;
}

function getStudioContentRect() {
  const rect = state.studioContentRect;
  if (rect && rect.width > 0 && rect.height > 0) return rect;
  // No frame yet: the canvas is the screenshot.
  return { x: 0, y: 0, width: state.imageWidth, height: state.imageHeight };
}

// Move every annotation from one content box to another, so a shape stays glued
// to the same pixels of the screenshot when the frame around it is rebuilt at a
// different size or offset.
function remapAnnotations(from, to) {
  if (!from || !to) return;
  if (!(from.width > 0) || !(from.height > 0) || !(to.width > 0) || !(to.height > 0)) return;
  const scaleX = to.width / from.width;
  const scaleY = to.height / from.height;
  if (scaleX === 1 && scaleY === 1 && from.x === to.x && from.y === to.y) return;
  const strokeScale = Math.max(scaleX, scaleY);
  const mapX = (value) => to.x + (value - from.x) * scaleX;
  const mapY = (value) => to.y + (value - from.y) * scaleY;

  state.annotations.forEach((annotation) => {
    if ('x' in annotation) annotation.x = mapX(annotation.x);
    if ('y' in annotation) annotation.y = mapY(annotation.y);
    if ('x1' in annotation) annotation.x1 = mapX(annotation.x1);
    if ('y1' in annotation) annotation.y1 = mapY(annotation.y1);
    if ('x2' in annotation) annotation.x2 = mapX(annotation.x2);
    if ('y2' in annotation) annotation.y2 = mapY(annotation.y2);
    if ('width' in annotation) annotation.width *= scaleX;
    if ('height' in annotation) annotation.height *= scaleY;
    if (annotation.strokeWidth) annotation.strokeWidth *= strokeScale;
    if (annotation.type === 'text' && annotation.fontSize) {
      annotation.fontSize = Math.max(8, Math.round(annotation.fontSize * strokeScale));
    }
  });
}

function scaleAnnotation(annotation, scaleX, scaleY) {
  if ('x' in annotation) annotation.x *= scaleX;
  if ('y' in annotation) annotation.y *= scaleY;
  if ('width' in annotation) annotation.width *= scaleX;
  if ('height' in annotation) annotation.height *= scaleY;
  if ('x1' in annotation) annotation.x1 *= scaleX;
  if ('x2' in annotation) annotation.x2 *= scaleX;
  if ('y1' in annotation) annotation.y1 *= scaleY;
  if ('y2' in annotation) annotation.y2 *= scaleY;
  if (annotation.type === 'text' && annotation.fontSize) {
    annotation.fontSize = Math.max(8, Math.round(annotation.fontSize * Math.max(scaleX, scaleY)));
  }
}

function resizeSelectedImage(event) {
  const orig = state.imageResizeOrig;
  const handle = state.imageResizeHandle?.kind;
  if (!orig || !handle) return;

  const dx = (event.clientX - orig.clientX) / Math.max(orig.scaleX, 0.1);
  const dy = (event.clientY - orig.clientY) / Math.max(orig.scaleY, 0.1);
  let width = orig.width;
  let height = orig.height;

  if (handle.includes('e')) width = orig.width + dx;
  if (handle.includes('w')) width = orig.width - dx;
  if (handle.includes('s')) height = orig.height + dy;
  if (handle.includes('n')) height = orig.height - dy;

  width = Math.max(20, width);
  height = Math.max(20, height);

  // Keep the edge opposite the dragged handle fixed in place.
  state.imageOffsetX = handle.includes('w')
    ? orig.offsetX + (orig.width - width) * orig.scaleX
    : orig.offsetX;
  state.imageOffsetY = handle.includes('n')
    ? orig.offsetY + (orig.height - height) * orig.scaleY
    : orig.offsetY;

  setImageCanvasSize(width, height);

  const scaleX = state.imageWidth / orig.width;
  const scaleY = state.imageHeight / orig.height;
  state.annotations = orig.annotations.map((annotation) => {
    const scaled = { ...annotation };
    scaleAnnotation(scaled, scaleX, scaleY);
    return scaled;
  });

  // The screenshot inside the frame stretches with the canvas, so the box the
  // next studio rebuild remaps annotations out of has to stretch with it too.
  state.studioContentRect = orig.contentRect
    ? {
        x: orig.contentRect.x * scaleX,
        y: orig.contentRect.y * scaleY,
        width: orig.contentRect.width * scaleX,
        height: orig.contentRect.height * scaleY,
      }
    : null;
}

function resizeSelectedAnnotation(coords) {
  const ann = state.annotations[state.selectedAnnotationIndex];
  if (!ann || !state.resizeHandle) return;
  if (ann.type === 'line' || ann.type === 'arrow') {
    if (state.resizeHandle.kind === 'line-start') { ann.x1 = coords.x; ann.y1 = coords.y; }
    if (state.resizeHandle.kind === 'line-end') { ann.x2 = coords.x; ann.y2 = coords.y; }
    return;
  }
  const bounds = ann.type === 'text' ? getTextBounds(ann) : { x: ann.x, y: ann.y, width: ann.width, height: ann.height };
  const x1 = bounds.x, y1 = bounds.y, x2 = bounds.x + bounds.width, y2 = bounds.y + bounds.height;
  let nx1 = x1, ny1 = y1, nx2 = x2, ny2 = y2;
  if (state.resizeHandle.kind.includes('n')) ny1 = coords.y;
  if (state.resizeHandle.kind.includes('s')) ny2 = coords.y;
  if (state.resizeHandle.kind.includes('w')) nx1 = coords.x;
  if (state.resizeHandle.kind.includes('e')) nx2 = coords.x;
  ann.x = Math.min(nx1, nx2);
  ann.y = Math.min(ny1, ny2);
  ann.width = Math.max(1, Math.abs(nx2 - nx1));
  ann.height = Math.max(1, Math.abs(ny2 - ny1));

  if (ann.type === 'text') {
    const currentBounds = getTextBounds(ann);
    const scaleY = ann.height / Math.max(1, currentBounds.height);
    ann.fontSize = Math.max(8, Math.round((ann.fontSize || 24) * scaleY));
    ann.x = Math.min(nx1, nx2);
    ann.y = Math.min(ny1, ny2) + (ann.fontSize * 1.2);
    delete ann.width;
    delete ann.height;
  }
}

function drawSelectionHandles() {
  if (state.currentTool !== 'select') return;
  if (state.selectedImage && state.selectedAnnotationIndex < 0) {
    drawImageSelectionHandles();
    return;
  }
  if (state.selectedAnnotationIndex < 0) return;
  const ann = state.annotations[state.selectedAnnotationIndex];
  const bounds = getAnnotationBounds(ann);
  if (!bounds) return;
  const ctx = elements.ctx;
  ctx.save();
  ctx.strokeStyle = '#3b82f6';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 2;

  if (bounds.type === 'line') {
    drawHandle(bounds.x1, bounds.y1);
    drawHandle(bounds.x2, bounds.y2);
  } else {
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.setLineDash([]);
    drawHandle(bounds.x, bounds.y);
    drawHandle(bounds.x + bounds.width, bounds.y);
    drawHandle(bounds.x, bounds.y + bounds.height);
    drawHandle(bounds.x + bounds.width, bounds.y + bounds.height);
  }

  ctx.restore();

  function drawHandle(x, y) {
    const s = 8;
    ctx.beginPath();
    ctx.rect(x - s / 2, y - s / 2, s, s);
    ctx.fill();
    ctx.stroke();
  }
}

function drawImageSelectionHandles() {
  const ctx = elements.ctx;
  ctx.save();
  ctx.strokeStyle = '#3b82f6';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, 2 / Math.max(getRenderScale(), 0.1));
  ctx.setLineDash([6, 5]);
  ctx.strokeRect(0, 0, state.imageWidth, state.imageHeight);
  ctx.setLineDash([]);

  getImageResizeHandles().forEach((handle) => {
    drawHandle(handle.x, handle.y);
  });
  ctx.restore();

  function drawHandle(x, y) {
    const s = Math.max(8, 8 / Math.max(getRenderScale(), 0.1));
    const hx = Math.max(s / 2, Math.min(state.imageWidth - s / 2, x));
    const hy = Math.max(s / 2, Math.min(state.imageHeight - s / 2, y));
    ctx.beginPath();
    ctx.rect(hx - s / 2, hy - s / 2, s, s);
    ctx.fill();
    ctx.stroke();
  }
}

// ------------------------------------------------------------------------------
// Composite & UI
// ------------------------------------------------------------------------------

function getCompositeImage() {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = state.imageWidth;
  tempCanvas.height = state.imageHeight;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(state.image, 0, 0, state.imageWidth, state.imageHeight);
  const orig = elements.ctx;
  elements.ctx = tempCtx;
  state.annotations.forEach(drawAnnotation);
  elements.ctx = orig;
  return tempCanvas.toDataURL('image/png');
}

function updateStatus() {
  const names = { select: 'Select', rect: 'Rectangle', ellipse: 'Ellipse', arrow: 'Arrow', line: 'Line', text: 'Text', highlight: 'Highlight', blur: 'Blur', pixelate: 'Pixelate' };
  elements.statusTool.textContent = state.cropActive ? 'Crop' : (names[state.currentTool] || 'Ready');
  if (elements.statusZoom) {
    const zoomLabel = `${Math.round(state.zoom * 100)}%`;
    if ('value' in elements.statusZoom) elements.statusZoom.value = zoomLabel;
    else elements.statusZoom.textContent = zoomLabel;
  }
}

function updateToolbarState() {
  if (elements.btnCopy) elements.btnCopy.disabled = !state.image;
  if (elements.btnSave) elements.btnSave.disabled = !state.image;
  if (elements.btnCrop) elements.btnCrop.disabled = !state.image;
  if (elements.btnUndo) elements.btnUndo.disabled = state.historyIndex < 0;
  if (elements.btnRedo) elements.btnRedo.disabled = state.historyIndex >= state.history.length - 1;
  if (elements.btnClear) elements.btnClear.disabled = !state.image;

  let textBold = state.textBold;
  let textItalic = state.textItalic;
  let textUnderline = state.textUnderline;
  let textFontFamily = state.textFontFamily;
  let textFontSize = state.textFontSize;

  if ((state.currentTool === 'select' || state.currentTool === 'text') && state.selectedAnnotationIndex >= 0) {
    const selected = state.annotations[state.selectedAnnotationIndex];
    if (selected?.type === 'text') {
      if (selected.fontBold !== undefined) textBold = selected.fontBold;
      if (selected.fontItalic !== undefined) textItalic = selected.fontItalic;
      if (selected.fontUnderline !== undefined) textUnderline = selected.fontUnderline;
      if (selected.fontFamily !== undefined) textFontFamily = selected.fontFamily;
      if (selected.fontSize !== undefined) textFontSize = selected.fontSize;
    }
  }

  window.dispatchEvent(new CustomEvent('editor-state-change', {
    detail: {
      currentTool: state.currentTool,
      currentColor: state.currentColor,
      strokeWidth: state.strokeWidth,
      hasImage: !!state.image,
      textBold,
      textItalic,
      textUnderline,
      textFontFamily,
      textFontSize
    }
  }));
}


function showToast() {}

function queueUpdateStatus() {
  if (!state._queueStatusUpdate) {
    state._queueStatusUpdate = true;
    requestAnimationFrame(() => { state._queueStatusUpdate = false; updateStatus(); });
  }
}

function getImageDataUrl() {
  const c = document.createElement('canvas');
  c.width = state.imageWidth;
  c.height = state.imageHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(state.image, 0, 0, state.imageWidth, state.imageHeight);
  return c.toDataURL('image/png');
}

function replaceImage(dataUrl, cb) {
  const img = new Image();
  img.onload = () => {
    state.image = img;
    setImageCanvasSize(img.width, img.height);
    if (cb) cb();
    render();
    updateStatus();
    updateToolbarState();
  };
  img.src = dataUrl;
}

// (Magic Wand was removed)

function getStudioFilter() {
  const brightness = state.studioBrightness || 100;
  const contrast = state.studioContrast || 100;
  const saturation = state.studioSaturation || 100;
  const hue = state.studioHue || 0;
  // An identity filter is not free: setting ctx.filter to anything but 'none'
  // routes the draw through the filter pipeline, costing an extra full-size
  // composite and softening the result for no visible gain.
  if (brightness === 100 && contrast === 100 && saturation === 100 && hue === 0) {
    return 'none';
  }
  return [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${saturation}%)`,
    `hue-rotate(${hue}deg)`,
  ].join(' ');
}

function isStudioLayerEnabled(setting, layer) {
  return setting === 'both' || setting === layer;
}

function addStudioNoise(ctx, width, height, layer = 'image') {
  const pixelAmount = isStudioLayerEnabled(state.studioNoiseLayer || 'both', layer) ? Number(state.studioNoise || 0) : 0;
  const filmAmount = isStudioLayerEnabled(state.studioNoiseLayer || 'both', layer) ? Number(state.studioFilmGrain || 0) : 0;
  const amount = Math.max(pixelAmount, filmAmount);
  if (!amount) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const strength = pixelAmount * 1.6;
  const filmStrength = filmAmount * 0.9;
  for (let i = 0; i < data.length; i += 4) {
    const pixelNoise = strength ? (Math.random() - 0.5) * strength : 0;
    const filmNoise = filmStrength ? (Math.random() - 0.5) * filmStrength : 0;
    const noise = pixelNoise + filmNoise;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
}

function drawAsciiPattern(ctx, width, height, layer = 'image') {
  if (!state.studioAsciiEnabled || !isStudioLayerEnabled(state.studioAsciiLayer || 'image', layer)) return;
  const size = Math.max(8, Number(state.studioAsciiSize || 16));
  const opacity = Math.max(0, Math.min(0.8, Number(state.studioAsciiOpacity || 25) / 100));
  if (!opacity) return;
  const pattern = String(state.studioAsciiPattern || '.');
  const step = Math.max(10, size * 1.85);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = state.studioAsciiColor || '#ffffff';
  ctx.font = `${size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = step * 0.55; y < height; y += step) {
    for (let x = step * 0.55; x < width; x += step) {
      ctx.fillText(pattern, x, y);
    }
  }
  ctx.restore();
}

function scheduleImageResize(event) {
  state.pendingImageResizeEvent = {
    clientX: event.clientX,
    clientY: event.clientY,
  };
  if (state.imageResizeFrame !== null) return;

  state.imageResizeFrame = requestAnimationFrame(() => {
    state.imageResizeFrame = null;
    const nextEvent = state.pendingImageResizeEvent;
    state.pendingImageResizeEvent = null;
    if (!state.isResizingImage || !nextEvent) return;
    resizeSelectedImage(nextEvent);
    render();
  });
}

function flushImageResize(event) {
  if (state.imageResizeFrame !== null) {
    cancelAnimationFrame(state.imageResizeFrame);
    state.imageResizeFrame = null;
  }
  state.pendingImageResizeEvent = null;
  resizeSelectedImage(event);
}

// Chrome supports ctx.letterSpacing, which keeps the string shaped as one run
// instead of being positioned glyph by glyph. Kept behind a capability check so
// the per-character fallback still works anywhere it is missing.
const SUPPORTS_LETTER_SPACING = typeof CanvasRenderingContext2D !== 'undefined'
  && 'letterSpacing' in CanvasRenderingContext2D.prototype;

function measureLetterSpacedText(ctx, text, spacing = 0) {
  const value = String(text || '');
  if (!value) return 0;
  if (SUPPORTS_LETTER_SPACING) {
    const previous = ctx.letterSpacing;
    ctx.letterSpacing = `${spacing}px`;
    const width = ctx.measureText(value).width;
    ctx.letterSpacing = previous;
    return width;
  }
  const chars = Array.from(value);
  return chars.reduce((width, char) => width + ctx.measureText(char).width, 0) + spacing * (chars.length - 1);
}

function drawLetterSpacedText(ctx, text, x, y, spacing = 0, maxWidth = Infinity) {
  const value = String(text || '');
  const chars = Array.from(value);
  if (!chars.length) return;

  let effectiveSpacing = spacing;
  let totalWidth = measureLetterSpacedText(ctx, value, effectiveSpacing);
  if (Number.isFinite(maxWidth) && totalWidth > maxWidth && chars.length > 1) {
    effectiveSpacing = Math.min(spacing, Math.max(0, (maxWidth - measureLetterSpacedText(ctx, value, 0)) / (chars.length - 1)));
    totalWidth = measureLetterSpacedText(ctx, value, effectiveSpacing);
  }

  const align = ctx.textAlign;
  let drawX = x;
  if (align === 'center') drawX = x - totalWidth / 2;
  if (align === 'right' || align === 'end') drawX = x - totalWidth;
  // Snap the run to a whole pixel: a half-pixel origin makes every glyph land on
  // its own subpixel phase, which is what turns small labels to mush.
  drawX = Math.round(drawX);

  const previousAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  if (SUPPORTS_LETTER_SPACING) {
    const previousSpacing = ctx.letterSpacing;
    ctx.letterSpacing = `${effectiveSpacing}px`;
    ctx.fillText(value, drawX, y);
    ctx.letterSpacing = previousSpacing;
  } else {
    chars.forEach((char) => {
      ctx.fillText(char, drawX, y);
      drawX += ctx.measureText(char).width + effectiveSpacing;
    });
  }
  ctx.textAlign = previousAlign;
}

function drawStudioWatermark(ctx, canvasW, canvasH, options = {}) {
  if ((state.studioWatermarkMode || 'off') === 'off') return;
  const text = (state.studioWatermarkText || '').trim();
  const label = text || '@icodraw';
  const area = {
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? canvasW,
    height: options.height ?? canvasH,
  };
  const sizeScale = { small: 0.78, default: 1, large: 1.24 }[state.studioWatermarkSize] || 1;
  const fontSize = Math.max(11, Math.round(Math.min(area.width, area.height) * 0.022 * sizeScale));
  const padX = fontSize * (state.studioWatermarkSize === 'small' ? 0.68 : state.studioWatermarkSize === 'large' ? 0.98 : 0.8);
  const padY = fontSize * (state.studioWatermarkSize === 'small' ? 0.4 : state.studioWatermarkSize === 'large' ? 0.64 : 0.52);

  ctx.save();
  // Thin, unspaced and full contrast. The old 700 weight with per-glyph spacing
  // over a 66%-opaque pill let the backdrop bleed through the strokes.
  const textSpacing = 0;
  ctx.font = `500 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
  const badgeW = measureLetterSpacedText(ctx, label, textSpacing) + padX * 2;
  const badgeH = fontSize + padY * 2;
  const margin = Math.max(10, Math.min(area.width, area.height) * 0.035);
  const position = state.studioWatermarkPosition || 'bottom-right';
  let x = area.x + area.width - badgeW - margin;
  let y = area.y + area.height - badgeH - margin;
  if (position.includes('left')) x = area.x + margin;
  if (position.includes('center')) x = area.x + (area.width - badgeW) / 2;
  if (position.includes('top')) y = area.y + margin;
  x = Math.round(Math.max(area.x + margin, Math.min(area.x + area.width - badgeW - margin, x)));
  y = Math.round(Math.max(area.y + margin, Math.min(area.y + area.height - badgeH - margin, y)));
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
  ctx.shadowBlur = Math.max(8, 18 * sizeScale);
  ctx.shadowOffsetY = Math.max(4, 8 * sizeScale);
  const radius = Math.min(18 * sizeScale, badgeH / 2);
  const blur = Math.max(0, Number(state.studioWatermarkBlur || 0));
  drawFrostedWatermarkPill(ctx, x, y, badgeW, badgeH, radius, blur);
  ctx.fillStyle = state.studioWatermarkMode === 'badge' ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.86)';
  ctx.beginPath();
  roundRect(ctx, x, y, badgeW, badgeH, radius);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#0b0b0b';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  drawLetterSpacedText(ctx, label, Math.round(x + padX), Math.round(y + badgeH / 2), textSpacing);
  ctx.restore();
}

function applyBackdropColorPreset(ctx, width, height) {
  const preset = state.containerColorPreset || 'normal';
  if (preset === 'normal') return;

  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch (error) {
    return;
  }

  const data = imageData.data;
  const clamp = (value) => Math.max(0, Math.min(255, value));
  const contrast = (value, amount) => (value - 128) * amount + 128;
  const applySaturation = (r, g, b, amount) => {
    const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
    return [
      luma + (r - luma) * amount,
      luma + (g - luma) * amount,
      luma + (b - luma) * amount,
    ];
  };

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const luma = r * 0.299 + g * 0.587 + b * 0.114;

    if (preset === 'mono') {
      r = g = b = contrast(luma, 1.08);
    } else if (preset === 'contrast') {
      [r, g, b] = applySaturation(r, g, b, 1.22);
      r = contrast(r, 1.28);
      g = contrast(g, 1.28);
      b = contrast(b, 1.28);
    } else if (preset === 'sunset') {
      [r, g, b] = applySaturation(r, g, b, 1.12);
      r = contrast(r * 1.12 + 10, 1.08);
      g = contrast(g * 1.03 + 4, 1.04);
      b = contrast(b * 0.86 - 4, 1.02);
    } else if (preset === 'sepia') {
      const nr = r * 0.393 + g * 0.769 + b * 0.189;
      const ng = r * 0.349 + g * 0.686 + b * 0.168;
      const nb = r * 0.272 + g * 0.534 + b * 0.131;
      r = contrast(nr, 1.06);
      g = contrast(ng, 1.02);
      b = contrast(nb, 0.96);
    } else if (preset === 'mint') {
      [r, g, b] = applySaturation(r, g, b, 0.9);
      r = contrast(r * 0.9 + 4, 1.03);
      g = contrast(g * 1.08 + 12, 1.06);
      b = contrast(b * 1.1 + 10, 1.04);
    } else if (preset === 'neon') {
      [r, g, b] = applySaturation(r, g, b, 1.55);
      r = contrast(r * 1.06 + 14, 1.22);
      g = contrast(g * 0.98 + 2, 1.14);
      b = contrast(b * 1.18 + 18, 1.24);
    } else if (preset === 'noir') {
      [r, g, b] = applySaturation(r, g, b, 0.35);
      r = contrast(luma * 0.85 + 6, 1.26);
      g = contrast(luma * 0.91 + 9, 1.22);
      b = contrast(luma * 1.08 + 18, 1.28);
    }

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }

  ctx.putImageData(imageData, 0, 0);
}

function drawFrostedWatermarkPill(ctx, x, y, width, height, radius, blur) {
  if (!blur) return;
  ctx.save();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.beginPath();
  roundRect(ctx, x, y, width, height, radius);
  ctx.clip();
  const sx = Math.max(0, x - blur);
  const sy = Math.max(0, y - blur);
  const ex = Math.min(ctx.canvas.width, x + width + blur);
  const ey = Math.min(ctx.canvas.height, y + height + blur);
  const sw = Math.max(1, ex - sx);
  const sh = Math.max(1, ey - sy);
  ctx.filter = `blur(${blur}px) saturate(1.18)`;
  ctx.drawImage(ctx.canvas, sx, sy, sw, sh, sx, sy, sw, sh);
  ctx.filter = 'none';
  ctx.restore();
}

function drawStudioWindow(ctx, frameCanvas, centerX, centerY, width, height) {
  const forceFlat = state.windowFrameTheme === 'glass';
  const pitch = (forceFlat ? 0 : (state.studioPitch || 0)) * Math.PI / 180;
  const yaw = (forceFlat ? 0 : (state.studioYaw || 0)) * Math.PI / 180;
  const roll = ((state.studioRotation || 0) + (forceFlat ? 0 : (state.studioRoll || 0))) * Math.PI / 180;
  const depth = Math.max(400, Number(state.studioCameraDepth || 1200));
  const depthInfluence = Math.max(0.76, Math.min(1.18, depth / 1200));
  const scaleX = Math.max(0.42, Math.cos(yaw) * depthInfluence);
  const scaleY = Math.max(0.42, Math.cos(pitch) * depthInfluence);
  const skewX = Math.sin(yaw) * 0.22;
  const skewY = -Math.sin(pitch) * 0.16;

  // With the camera at rest this matrix is the identity, but going through it
  // anyway resamples every pixel of the screenshot through a fractional
  // translate. Blit on whole pixels instead and the capture stays 1:1 sharp.
  const isFlat = roll === 0 && skewX === 0 && skewY === 0
    && Math.abs(scaleX - 1) < 1e-6 && Math.abs(scaleY - 1) < 1e-6;
  if (isFlat) {
    ctx.drawImage(
      frameCanvas,
      Math.round(centerX - width / 2),
      Math.round(centerY - height / 2),
      width,
      height,
    );
    return;
  }

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(roll);
  ctx.transform(scaleX, skewY, skewX, scaleY, 0, 0);
  ctx.drawImage(frameCanvas, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function getCurrentStudioDisplaySize() {
  // Preserve the full editor canvas. Padding, shadows, backdrops, and camera
  // headroom all belong to this surface and must not change its on-screen size.
  const bounds = { width: state.imageWidth, height: state.imageHeight };
  return {
    width: bounds.width * state.renderScaleX,
    height: bounds.height * state.renderScaleY,
  };
}

function applyWindowContainer(options = {}) {
  if (!state.image) return;

  // Toggling the frame off. Annotations survive it: they are mapped from where
  // they sit on the framed canvas back onto the bare screenshot. A restyle passes
  // reapply:true so it is never mistaken for this toggle.
  if (!options.reapply && state.windowContainerApplied && state.studioSourceImage) {
    const fromRect = getStudioContentRect();
    state.windowContainerApplied = false;
    const btn = document.getElementById('btn-window-container');
    if (btn) btn.classList.remove('active');
    loadImage(state.studioSourceImage, {
      isInternal: true,
      keepAnnotations: true,
      beforeRender: () => {
        state.studioContentRect = null;
        state.studioSourceImage = null;
        remapAnnotations(fromRect, { x: 0, y: 0, width: state.imageWidth, height: state.imageHeight });
        state.history = [];
        state.historyIndex = -1;
      },
      onLoaded: options.onComplete,
    });
    showToast('Window container removed', 'success');
    return;
  }

  const windowChrome = state.windowFrameTheme || 'macos';
  const isBrowserChrome = windowChrome === 'browser';
  const isFramelessChrome = windowChrome === 'frameless';
  const isGlassChrome = windowChrome === 'glass';
  const titleBarBase = !isFramelessChrome && state.studioTitlebar ? 48 : 0;
  const cornerRadius = Math.max(0, Number(state.studioCornerRadius || 16));
  const padding = Math.max(0, Number(state.studioPadding || 64));
  const shadowBlur = Math.max(0, Number(state.studioShadowBlur ?? state.studioShadow ?? 45));
  const shadowDistance = Math.max(0, Number(state.studioShadowDistance ?? state.studioShadow ?? 25));
  const shadowOpacity = Math.max(0, Math.min(0.8, Number(state.studioShadowOpacity ?? 35) / 100));
  const shadowOffsetX = Number(state.studioShadowOffsetX || 0);
  const shadowOffsetY = Number(state.studioShadowOffsetY || 0);
  const shadowColor = `rgba(24, 18, 12, ${shadowOpacity})`;
  const frameThemes = {
    macos: { titleBar: '#1f1f23', windowBg: '#ffffff', divider: 'rgba(0, 0, 0, 0.12)' },
    browser: { titleBar: '#141418', windowBg: '#ffffff', divider: 'rgba(0, 0, 0, 0.1)' },
    frameless: { titleBar: '#ffffff', windowBg: '#ffffff', divider: 'transparent' },
    glass: { titleBar: 'rgba(245, 248, 255, 0.34)', windowBg: 'rgba(255, 255, 255, 0.45)', divider: 'rgba(255, 255, 255, 0.42)' },
    dark: { titleBar: '#1f1f23', windowBg: '#ffffff', divider: 'rgba(0, 0, 0, 0.12)' },
    light: { titleBar: '#1f1f23', windowBg: '#ffffff', divider: 'rgba(0, 0, 0, 0.12)' },
    midnight: { titleBar: '#141418', windowBg: '#ffffff', divider: 'rgba(0, 0, 0, 0.1)' },
    minimal: { titleBar: '#ffffff', windowBg: '#ffffff', divider: 'transparent' },
    contrast: { titleBar: '#111111', windowBg: '#000000', divider: 'rgba(255, 255, 255, 0.12)' }
  };

  const selectedTheme = frameThemes[windowChrome] || frameThemes.macos;
  const titleBarColor = selectedTheme.titleBar;
  const windowBgColor = selectedTheme.windowBg;

  const gradients = {
    none: ['#dfc8ac', '#cfb18f'],
    sunset: ['#f97316', '#ec4899'],
    ocean: ['#06b6d4', '#3b82f6'],
    forest: ['#22c55e', '#14b8a6'],
    purple: ['#8b5cf6', '#ec4899'],
    midnight: ['#1e1b4b', '#312e81'],
    warm: ['#fbbf24', '#f97316'],
    aurora: ['#34d399', '#818cf8'],
    coral: ['#fb7185', '#facc15'],
  };

  // Authored against a 1200px-wide window; every chrome measurement below is a
  // multiple of chromeScale so the bar keeps the same proportions on a 900px
  // capture and a 3000px Retina one.
  const lights = [
    { color: '#ff5f57', x: 20 },
    { color: '#febc2e', x: 40 },
    { color: '#28c840', x: 60 },
  ];

  // Frame the bare screenshot, never a composite of it with the annotations.
  // Baking them in here is what used to destroy them: the next restyle rebuilt
  // from a flattened image and cleared the annotation list.
  const sourceRect = getStudioContentRect();
  const compositeDataUrl = state.studioSourceImage || getImageDataUrl();
  state.studioSourceImage = compositeDataUrl;
  state.originalImageBeforeContainer = compositeDataUrl;
  const targetDisplaySize = state.pendingStudioDisplaySize;
  state.pendingStudioDisplaySize = null;

  const compositeImg = new Image();
  compositeImg.onload = () => {
    const imageScale = Math.max(0.4, Math.min(1.6, Number(state.studioImageScale || 100) / 100));
    // Whole pixels throughout. A fractional window size or offset forces the
    // browser to resample the screenshot on every draw, which is what made
    // exports look softer than the capture they came from.
    const imgW = Math.round(compositeImg.width * imageScale);
    const imgH = Math.round(compositeImg.height * imageScale);

    const chromeScale = Math.max(0.85, Math.min(3, imgW / 1200));
    const titleBarHeight = Math.round(titleBarBase * chromeScale);
    const lightRadius = 6 * chromeScale;

    const windowW = imgW;
    const windowH = imgH + titleBarHeight;
    let canvasW = windowW + padding * 2;
    let canvasH = windowH + padding * 2;

    if (state.containerAspectRatio && state.containerAspectRatio !== 'native') {
      const [ratioW, ratioH] = state.containerAspectRatio.split(':').map(Number);
      if (ratioW && ratioH) {
        const currentRatio = canvasW / canvasH;
        const targetRatio = ratioW / ratioH;
        if (currentRatio < targetRatio) {
          canvasW = canvasH * targetRatio;
        } else if (currentRatio > targetRatio) {
          canvasH = canvasW / targetRatio;
        }
      }
    }

    const orbitHeadroom = Math.max(
      32,
      shadowBlur + Math.abs(state.studioPitch || 0) * 1.2 + Math.abs(state.studioYaw || 0) * 1.2 + Math.abs((state.studioRotation || 0) + (state.studioRoll || 0)) * 2
    );
    canvasW = Math.round(canvasW + orbitHeadroom * 2);
    canvasH = Math.round(canvasH + orbitHeadroom * 2);

    const windowX = Math.round((canvasW - windowW) / 2);
    const windowY = Math.round((canvasH - windowH) / 2);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasW;
    tempCanvas.height = canvasH;
    const ctx = tempCanvas.getContext('2d');

    const drawRest = () => {
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = windowW;
      frameCanvas.height = windowH;
      const frameCtx = frameCanvas.getContext('2d');

      frameCtx.save();
      frameCtx.beginPath();
      roundRect(frameCtx, 0, 0, windowW, windowH, cornerRadius);
      frameCtx.clip();
      frameCtx.fillStyle = windowBgColor;
      frameCtx.fillRect(0, 0, windowW, windowH);

      if (titleBarHeight > 0) {
        frameCtx.fillStyle = titleBarColor;
        frameCtx.fillRect(0, 0, windowW, titleBarHeight);
        frameCtx.strokeStyle = selectedTheme.divider;
        frameCtx.lineWidth = 1;
        frameCtx.beginPath();
        frameCtx.moveTo(0, titleBarHeight);
        frameCtx.lineTo(windowW, titleBarHeight);
        frameCtx.stroke();

        const lightY = titleBarHeight / 2;
        lights.forEach(light => {
          frameCtx.beginPath();
          frameCtx.arc(light.x * chromeScale, lightY, lightRadius, 0, Math.PI * 2);
          frameCtx.fillStyle = light.color;
          frameCtx.fill();
        });

        if (isBrowserChrome) {
          const urlText = normalizeBrowserUrlLabel(state.studioBrowserUrl);
          const pillW = Math.round(Math.min(
            Math.max(190 * chromeScale, windowW * 0.46),
            Math.max(120 * chromeScale, windowW - 120 * chromeScale),
          ));
          const pillH = Math.round(28 * chromeScale);
          const pillX = Math.round(Math.max(76 * chromeScale, (windowW - pillW) / 2));
          const pillY = Math.round((titleBarHeight - pillH) / 2);
          const urlFontSize = Math.max(11, Math.round(15 * chromeScale));
          const urlLetterSpacing = 0;
          const urlMaxWidth = pillW - 48 * chromeScale;
          frameCtx.save();
          frameCtx.fillStyle = 'rgba(255, 255, 255, 0.13)';
          frameCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          frameCtx.lineWidth = Math.max(1, chromeScale);
          frameCtx.beginPath();
          roundRect(frameCtx, pillX, pillY, pillW, pillH, 5 * chromeScale);
          frameCtx.fill();
          frameCtx.stroke();
          // No text shadow. A 1.5px blur under a label this size smears it far
          // more than it lifts it off the bar, and the bar is already dark.
          frameCtx.fillStyle = 'rgba(255, 255, 255, 0.96)';
          frameCtx.font = `400 ${urlFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif`;
          frameCtx.textAlign = 'center';
          frameCtx.textBaseline = 'middle';
          const urlBaseline = Math.round(pillY + pillH / 2);
          drawLetterSpacedText(frameCtx, urlText, pillX + pillW / 2 + 8 * chromeScale, urlBaseline, urlLetterSpacing, urlMaxWidth);
          frameCtx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
          frameCtx.lineWidth = Math.max(1, 1.5 * chromeScale);
          const urlWidth = Math.min(measureLetterSpacedText(frameCtx, urlText, urlLetterSpacing), urlMaxWidth);
          const lockX = Math.round(pillX + Math.max(14 * chromeScale, pillW / 2 - urlWidth / 2 - 12 * chromeScale));
          const lockY = urlBaseline;
          const lockUnit = 3.5 * chromeScale;
          frameCtx.strokeRect(lockX - lockUnit, lockY - chromeScale, lockUnit * 2, 6 * chromeScale);
          frameCtx.beginPath();
          frameCtx.arc(lockX, lockY - chromeScale, lockUnit, Math.PI, 0);
          frameCtx.stroke();
          frameCtx.restore();
        }
      }

      frameCtx.filter = getStudioFilter();
      frameCtx.drawImage(compositeImg, 0, titleBarHeight, imgW, imgH);
      frameCtx.filter = 'none';
      addStudioNoise(frameCtx, frameCanvas.width, frameCanvas.height, 'image');
      drawAsciiPattern(frameCtx, frameCanvas.width, frameCanvas.height, 'image');
      if ((state.studioWatermarkLayer || 'image') === 'image') {
        drawStudioWatermark(frameCtx, frameCanvas.width, frameCanvas.height, {
          x: 0,
          y: titleBarHeight,
          width: windowW,
          height: imgH,
        });
      }
      frameCtx.restore();

      if (isGlassChrome) {
        frameCtx.save();
        frameCtx.globalCompositeOperation = 'source-over';
        frameCtx.beginPath();
        roundRect(frameCtx, 0, 0, windowW, windowH, cornerRadius);
        frameCtx.clip();
        const rim = Math.max(12, Math.min(24, windowW * 0.035));
        const glassGradient = frameCtx.createLinearGradient(0, 0, windowW, windowH);
        glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
        glassGradient.addColorStop(0.42, 'rgba(235, 248, 255, 0.2)');
        glassGradient.addColorStop(1, 'rgba(255, 255, 255, 0.34)');
        frameCtx.fillStyle = glassGradient;
        frameCtx.beginPath();
        roundRect(frameCtx, 0, 0, windowW, windowH, cornerRadius);
        roundRect(frameCtx, rim, titleBarHeight + rim, Math.max(0, windowW - rim * 2), Math.max(0, windowH - titleBarHeight - rim * 2), Math.max(0, cornerRadius - rim));
        frameCtx.fill('evenodd');
        frameCtx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        frameCtx.lineWidth = 2;
        frameCtx.beginPath();
        roundRect(frameCtx, 1, 1, windowW - 2, windowH - 2, Math.max(0, cornerRadius - 1));
        frameCtx.stroke();
        frameCtx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
        frameCtx.lineWidth = 1;
        frameCtx.beginPath();
        roundRect(frameCtx, rim, titleBarHeight + rim, Math.max(0, windowW - rim * 2), Math.max(0, windowH - titleBarHeight - rim * 2), Math.max(0, cornerRadius - rim));
        frameCtx.stroke();
        frameCtx.restore();
      }

      if ((state.studioBorder && !isFramelessChrome) || isGlassChrome) {
        frameCtx.save();
        frameCtx.strokeStyle = isGlassChrome ? 'rgba(255, 255, 255, 0.78)' : 'rgba(255, 255, 255, 0.35)';
        frameCtx.lineWidth = isGlassChrome ? 2 : 1;
        frameCtx.beginPath();
        roundRect(frameCtx, 0.5, 0.5, windowW - 1, windowH - 1, Math.max(0, cornerRadius - 0.5));
        frameCtx.stroke();
        frameCtx.restore();
      }

      ctx.save();
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = shadowOffsetX;
      ctx.shadowOffsetY = shadowDistance + shadowOffsetY;
      drawStudioWindow(ctx, frameCanvas, windowX + windowW / 2, windowY + windowH / 2, windowW, windowH);
      ctx.restore();
      if ((state.studioWatermarkLayer || 'image') === 'canvas') {
        drawStudioWatermark(ctx, canvasW, canvasH);
      }
      applyBackdropColorPreset(ctx, tempCanvas.width, tempCanvas.height);

      const resultDataUrl = tempCanvas.toDataURL('image/png');
      // Where the screenshot itself landed inside the framed canvas.
      const contentRect = { x: windowX, y: windowY + titleBarHeight, width: imgW, height: imgH };
      state.windowContainerApplied = true;
      const btn = document.getElementById('btn-window-container');
      if (btn) btn.classList.add('active');
      loadImage(resultDataUrl, {
        isInternal: true,
        keepAnnotations: true,
        preserveDisplaySize: targetDisplaySize || undefined,
        beforeRender: () => {
          remapAnnotations(sourceRect, contentRect);
          state.studioContentRect = contentRect;
          // Undo entries still point at the previous geometry, so they cannot be
          // replayed onto this one; the annotations themselves carry over.
          state.history = [];
          state.historyIndex = -1;
        },
        onLoaded: options.onComplete,
      });
      showToast('Window container applied', 'success');
    };

    if (state.containerBgImage) {
      const bgImg = new Image();
      bgImg.onload = () => {
        const scale = Math.max(canvasW / bgImg.width, canvasH / bgImg.height);
        const bgBlur = Math.max(0, Number(state.containerBgBlur || 0));
        const overscan = bgBlur ? Math.ceil(bgBlur * 2.5) : 0;
        const drawW = bgImg.width * scale + overscan * 2;
        const drawH = bgImg.height * scale + overscan * 2;
        const drawX = (canvasW - drawW) / 2;
        const drawY = (canvasH - drawH) / 2;

        ctx.save();
        if (bgBlur) {
          ctx.filter = `blur(${bgBlur}px)`;
        }
        ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
        ctx.restore();
        addStudioNoise(ctx, tempCanvas.width, tempCanvas.height, 'canvas');
        drawAsciiPattern(ctx, tempCanvas.width, tempCanvas.height, 'canvas');
        
        drawRest();
      };
      bgImg.onerror = () => {
        ctx.fillStyle = '#d7bea2';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        addStudioNoise(ctx, tempCanvas.width, tempCanvas.height, 'canvas');
        drawAsciiPattern(ctx, tempCanvas.width, tempCanvas.height, 'canvas');
        drawRest();
      };
      bgImg.src = state.containerBgImage;
    } else {
      const gradientColors = gradients[state.containerGradient || 'none'];
      if (gradientColors) {
        const grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
        grad.addColorStop(0, gradientColors[0]);
        grad.addColorStop(1, gradientColors[1]);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#d7bea2';
      }
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      addStudioNoise(ctx, tempCanvas.width, tempCanvas.height, 'canvas');
      drawAsciiPattern(ctx, tempCanvas.width, tempCanvas.height, 'canvas');
      drawRest();
    }
  };
  compositeImg.src = compositeDataUrl;
}

function normalizeBrowserUrlLabel(value) {
  const clean = String(value || '').trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '');
  return clean || 'example.com';
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}


function bindContextMenu() {
  const menu = document.getElementById('context-menu');
  const ctxContainer = document.getElementById('ctx-window-container');
  const ctxSavePng = document.getElementById('ctx-save-png');
  const ctxCopy = document.getElementById('ctx-copy');
  const gradientSwatches = document.querySelectorAll('.gradient-swatch');

  elements.container.addEventListener('contextmenu', (e) => {
    if (!state.image || state.cropActive) return;
    e.preventDefault();

    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.classList.add('visible');

    ctxContainer.classList.toggle('active', state.windowContainerApplied);

    gradientSwatches.forEach(s => {
      s.classList.toggle('active', s.dataset.gradient === (state.containerGradient || 'none'));
    });

    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
      }
      if (rect.bottom > window.innerHeight) {
        menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
      }
    });
  });

  document.addEventListener('mousedown', (e) => {
    if (!menu.contains(e.target)) {
      menu.classList.remove('visible');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') menu.classList.remove('visible');
  });

  ctxContainer.addEventListener('click', () => {
    menu.classList.remove('visible');
    applyWindowContainer();
  });

  ctxCopy.addEventListener('click', () => {
    menu.classList.remove('visible');
    copyToClipboard();
  });

  ctxSavePng.addEventListener('click', () => {
    menu.classList.remove('visible');
    saveFile();
  });

  gradientSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      const gradient = swatch.dataset.gradient;
      state.containerGradient = gradient;
      state.containerBgImage = null;
      gradientSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');

      if (state.windowContainerApplied) {
        reapplyStudioContainer();
      } else if (state.image) {
        // Auto-apply window container when background is clicked without prior activation
        applyWindowContainer();
      }
      menu.classList.remove('visible');
    });
  });
}

function reapplyStudioContainer() {
  if (!state.image) return;

  if (!state.studioDisplaySizeLock) {
    state.studioDisplaySizeLock = getCurrentStudioDisplaySize();
  }
  state.studioReapplyQueued = true;

  // Throttle, not debounce: a held slider fires 'input' every few ms, and
  // restarting the timer on each one would postpone the render until the drag
  // paused. Let the pending timer run so the canvas refreshes every ~40ms while
  // dragging; runStudioReapply() always picks up the latest state.
  if (state.studioReapplyInFlight || state.studioReapplyTimer !== null) return;

  state.studioReapplyTimer = setTimeout(runStudioReapply, 40);
}

function runStudioReapply() {
  state.studioReapplyTimer = null;
  if (!state.studioReapplyQueued || state.studioReapplyInFlight || !state.image) return;

  state.studioReapplyQueued = false;
  state.studioReapplyInFlight = true;
  state.pendingStudioDisplaySize = state.studioDisplaySizeLock;
  const complete = () => {
    state.studioReapplyInFlight = false;
    if (state.studioReapplyQueued) {
      state.studioReapplyTimer = setTimeout(runStudioReapply, 0);
    } else {
      state.pendingStudioDisplaySize = null;
      state.studioDisplaySizeLock = null;
    }
  };

  // The frame is always rebuilt from state.studioSourceImage, so there is no
  // longer an unframe/reframe image round-trip to perform first.
  applyWindowContainer({ onComplete: complete, reapply: true });
}

function updateStudioValueLabels() {
  const labels = {
    'studio-padding-value': `${state.studioPadding}px`,
    'studio-scale-value': `${state.studioImageScale}%`,
    'studio-rotation-value': `${state.studioRotation} deg`,
    'studio-radius-value': `${state.studioCornerRadius}px`,
    'studio-shadow-value': `${state.studioShadow}px`,
    'studio-shadow-distance-value': `${state.studioShadowDistance}px`,
    'studio-shadow-blur-value': `${state.studioShadowBlur}px`,
    'studio-shadow-opacity-value': `${state.studioShadowOpacity}%`,
    'studio-shadow-x-value': `${state.studioShadowOffsetX}px`,
    'studio-shadow-y-value': `${state.studioShadowOffsetY}px`,
    'studio-pitch-value': `${state.studioPitch} deg`,
    'studio-yaw-value': `${state.studioYaw} deg`,
    'studio-roll-value': `${state.studioRoll} deg`,
    'studio-depth-value': `${state.studioCameraDepth}px`,
    'studio-brightness-value': `${state.studioBrightness}%`,
    'studio-contrast-value': `${state.studioContrast}%`,
    'studio-saturation-value': `${state.studioSaturation}%`,
    'studio-hue-value': `${state.studioHue} deg`,
    'studio-noise-value': `${state.studioNoise}%`,
    'studio-film-grain-value': `${state.studioFilmGrain}%`,
    'container-bg-blur-value': `${state.containerBgBlur}px`,
    'studio-watermark-blur-value': `${state.studioWatermarkBlur}px`,
    'studio-ascii-size-value': `${state.studioAsciiSize}px`,
    'studio-ascii-opacity-value': `${state.studioAsciiOpacity}%`,
  };
  Object.entries(labels).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
  updateRangeProgress();
}

function updateRangeProgress(target) {
  const ranges = target ? [target] : document.querySelectorAll('.rs-range');
  ranges.forEach((input) => {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value || 0);
    const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;
    input.style.setProperty('--range-progress', `${Math.max(0, Math.min(100, progress))}%`);
  });
}

function ensureRangeResetButtons() {
  document.querySelectorAll('.rs-control-row .rs-range').forEach((input) => {
    const row = input.closest('.rs-control-row');
    if (!row || row.querySelector('.rs-range-reset')) return;
    const output = row.querySelector('output');
    if (!output) return;

    const button = document.createElement('button');
    const labelText = (row.firstChild?.textContent || input.id || 'slider').trim();
    button.type = 'button';
    button.className = 'rs-range-reset';
    button.title = 'Reset';
    button.setAttribute('aria-label', `Reset ${labelText}`);
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const key = input.dataset.stateKey;
      const fallback = input.getAttribute('value') ?? input.defaultValue ?? input.min ?? '0';
      input.value = fallback;
      if (key) state[key] = input.type === 'checkbox' ? input.checked : Number(input.value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    row.insertBefore(button, output);
  });
}

function updateBrowserUrlVisibility() {
  const row = document.getElementById('rs-browser-url-row');
  if (row) row.classList.toggle('hidden', state.windowFrameTheme !== 'browser');
}

function syncStudioInput(key) {
  const input = document.querySelector(`.studio-input[data-state-key="${key}"]`);
  if (!input) return;
  input[input.type === 'checkbox' ? 'checked' : 'value'] = state[key];
  if (input.classList.contains('rs-range')) updateRangeProgress(input);
}

function applyWindowChromeDefaults(chrome) {
  if (chrome === 'browser' || chrome === 'macos') {
    state.studioTitlebar = true;
  } else if (chrome === 'frameless') {
    state.studioTitlebar = false;
  } else if (chrome === 'glass') {
    Object.assign(state, {
      studioTitlebar: true,
      studioBorder: true,
      studioRotation: 0,
      studioPitch: 0,
      studioYaw: 0,
      studioRoll: 0,
    });
  }
  ['studioTitlebar', 'studioBorder', 'studioRotation', 'studioPitch', 'studioYaw', 'studioRoll'].forEach(syncStudioInput);
  updateStudioValueLabels();
}

function bindStudioControls() {
  const tabs = document.querySelectorAll('.rs-studio-tab');
  const panels = document.querySelectorAll('.rs-studio-panel');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.studioTab;
      tabs.forEach((item) => item.classList.toggle('active', item === tab));
      panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.studioPanel === target));
      document.getElementById('right-sidebar')?.classList.add('expanded');
    });
  });

  ensureRangeResetButtons();

  const commitStudioInput = (input) => {
    const key = input.dataset.stateKey;
    if (!key) return;
    state[key] = input.type === 'checkbox' ? input.checked : Number(input.value);
    updateStudioValueLabels();
    if (input.classList.contains('rs-range')) updateRangeProgress(input);
    // Live preview: reapplyStudioContainer() self-coalesces (40ms debounce +
    // in-flight queue), so firing it on every 'input' tick keeps the canvas in
    // sync while the handle is still held instead of waiting for release.
    if (state.image) reapplyStudioContainer();
  };

  document.querySelectorAll('.studio-input').forEach((input) => {
    input.addEventListener('input', () => commitStudioInput(input));
    input.addEventListener('change', () => commitStudioInput(input));
  });
  updateStudioValueLabels();

  const presets = {
    flat: { studioPitch: 0, studioYaw: 0, studioRoll: 0 },
    left: { studioPitch: 8, studioYaw: -28, studioRoll: -4 },
    right: { studioPitch: 8, studioYaw: 28, studioRoll: 4 },
    top: { studioPitch: 36, studioYaw: 0, studioRoll: 0 },
    hero: { studioPitch: 18, studioYaw: -24, studioRoll: -8 },
  };
  document.querySelectorAll('[data-angle-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      Object.assign(state, presets[button.dataset.anglePreset] || presets.flat);
      ['studio-pitch', 'studio-yaw', 'studio-roll'].forEach((id) => {
        const input = document.getElementById(id);
        const key = input?.dataset?.stateKey;
        if (input && key) input.value = state[key];
      });
      updateStudioValueLabels();
      if (state.image) reapplyStudioContainer();
    });
  });

  const shadowDefaults = {
    studioShadowDistance: 25,
    studioShadowBlur: 45,
    studioShadowOpacity: 35,
    studioShadowOffsetX: 0,
    studioShadowOffsetY: 0,
  };
  document.getElementById('studio-shadow-reset')?.addEventListener('click', () => {
    Object.assign(state, shadowDefaults);
    Object.entries(shadowDefaults).forEach(([key, value]) => {
      const input = document.querySelector(`.studio-input[data-state-key="${key}"]`);
      if (input) input.value = value;
    });
    updateStudioValueLabels();
    if (state.image) reapplyStudioContainer();
  });

  document.querySelectorAll('[data-window-chrome]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-window-chrome]').forEach((item) => item.classList.toggle('active', item === button));
      state.windowFrameTheme = button.dataset.windowChrome;
      applyWindowChromeDefaults(state.windowFrameTheme);
      updateBrowserUrlVisibility();
      document.querySelectorAll('.rs-frame-swatch').forEach((swatch) => {
        swatch.classList.toggle('active', swatch.dataset.theme === state.windowFrameTheme);
      });
      if (state.image) reapplyStudioContainer();
    });
  });

  const browserUrlInput = document.getElementById('studio-browser-url');
  browserUrlInput?.addEventListener('input', (event) => {
    state.studioBrowserUrl = event.target.value;
  });
  browserUrlInput?.addEventListener('change', (event) => {
    state.studioBrowserUrl = event.target.value;
    if (state.windowContainerApplied) reapplyStudioContainer();
  });
  browserUrlInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') event.currentTarget.blur();
  });
  updateBrowserUrlVisibility();

  document.querySelectorAll('[data-watermark-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-watermark-mode]').forEach((item) => item.classList.toggle('active', item === button));
      state.studioWatermarkMode = button.dataset.watermarkMode;
      if (state.image) reapplyStudioContainer();
    });
  });

  document.querySelectorAll('[data-watermark-platform]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-watermark-platform]').forEach((item) => item.classList.toggle('active', item === button));
      state.studioWatermarkPlatform = button.dataset.watermarkPlatform;
      if (state.image) reapplyStudioContainer();
    });
  });

  document.querySelectorAll('[data-watermark-layer]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-watermark-layer]').forEach((item) => item.classList.toggle('active', item === button));
      state.studioWatermarkLayer = button.dataset.watermarkLayer;
      if (state.image) reapplyStudioContainer();
    });
  });

  document.querySelectorAll('[data-watermark-position]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-watermark-position]').forEach((item) => item.classList.toggle('active', item === button));
      state.studioWatermarkPosition = button.dataset.watermarkPosition;
      if (state.image) reapplyStudioContainer();
    });
  });

  document.querySelectorAll('[data-watermark-size]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-watermark-size]').forEach((item) => item.classList.toggle('active', item === button));
      state.studioWatermarkSize = button.dataset.watermarkSize;
      if (state.image) reapplyStudioContainer();
    });
  });

  const watermarkTextInput = document.getElementById('studio-watermark-text');
  watermarkTextInput?.addEventListener('input', (event) => {
    state.studioWatermarkText = event.target.value;
  });
  watermarkTextInput?.addEventListener('change', (event) => {
    state.studioWatermarkText = event.target.value;
    if (state.windowContainerApplied) reapplyStudioContainer();
  });
  watermarkTextInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') event.currentTarget.blur();
  });

  document.querySelectorAll('[data-noise-layer]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-noise-layer]').forEach((item) => item.classList.toggle('active', item === button));
      state.studioNoiseLayer = button.dataset.noiseLayer;
      if (state.image) reapplyStudioContainer();
    });
  });

  document.querySelectorAll('[data-ascii-pattern]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-ascii-pattern]').forEach((item) => item.classList.toggle('active', item === button));
      state.studioAsciiPattern = button.dataset.asciiPattern;
      if (state.image) reapplyStudioContainer();
    });
  });

  document.querySelectorAll('[data-ascii-layer]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-ascii-layer]').forEach((item) => item.classList.toggle('active', item === button));
      state.studioAsciiLayer = button.dataset.asciiLayer;
      if (state.image) reapplyStudioContainer();
    });
  });

  document.getElementById('studio-ascii-color')?.addEventListener('input', (event) => {
    state.studioAsciiColor = event.target.value;
    if (state.windowContainerApplied) reapplyStudioContainer();
  });

  updateStudioValueLabels();
}

function bindRightSidebar() {
  const rsContainer = document.getElementById('rs-window-container');
  const rsSavePng = document.getElementById('rs-save-png');
  const rsCopy = document.getElementById('rs-copy');
  const rsCustomBg = document.getElementById('rs-custom-bg');
  const customBgInput = document.getElementById('custom-bg-input');
  const rsGradientSwatches = document.querySelectorAll('.rs-gradient-swatch');
  const rsColorPresets = document.querySelectorAll('.rs-color-preset');
  const rightSidebar = document.getElementById('right-sidebar');
  const rsCloseBtn = document.getElementById('rs-close-btn');

  if (!rsContainer || !rightSidebar) return;

  bindSubtleSidebarScroll(rightSidebar);

  rightSidebar.addEventListener('mouseenter', () => {
    if (!rightSidebar.classList.contains('expanded')) {
      rightSidebar.classList.add('expanded');
    }
  });

  if (rsCloseBtn) {
    rsCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      rightSidebar.classList.remove('expanded');
    });
  }

  rsContainer.addEventListener('click', () => {
    applyWindowContainer();
    rsContainer.classList.toggle('active', state.windowContainerApplied);
  });

  if (rsCustomBg && customBgInput) {
    rsCustomBg.addEventListener('click', () => customBgInput.click());
    customBgInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        state.containerBgImage = event.target.result;
        state.containerGradient = null;
        
        // Remove active state from other swatches
        rsGradientSwatches.forEach(s => s.classList.remove('active'));

        if (state.windowContainerApplied && state.originalImageBeforeContainer) {
          reapplyStudioContainer();
        } else {
          state.windowContainerApplied = false;
          applyWindowContainer();
          rsContainer.classList.toggle('active', state.windowContainerApplied);
        }
      };
      reader.readAsDataURL(file);
      // Reset input value so same file can be selected again
      e.target.value = '';
    });
  }

  const rsCustomSelect = document.getElementById('rs-aspect-select');
  if (rsCustomSelect) {
    const valueText = rsCustomSelect.querySelector('#rs-aspect-value-text');
    const options = rsCustomSelect.querySelectorAll('.rs-select-option');

    rsCustomSelect.querySelector('.rs-select-value').addEventListener('click', (e) => {
      e.stopPropagation();
      rsCustomSelect.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      rsCustomSelect.classList.remove('open');
    });

    options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        options.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        valueText.textContent = option.textContent;
        rsCustomSelect.classList.remove('open');

        state.containerAspectRatio = option.dataset.value;
        if (state.windowContainerApplied) {
          reapplyStudioContainer();
        }
      });
    });
  }

  const rsFrameSwatches = document.querySelectorAll('.rs-frame-swatch');
  rsFrameSwatches.forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      e.stopPropagation();
      rsFrameSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      state.windowFrameTheme = swatch.dataset.theme;
      updateBrowserUrlVisibility();
      document.querySelectorAll('[data-window-chrome]').forEach((button) => {
        button.classList.toggle('active', button.dataset.windowChrome === state.windowFrameTheme);
      });

      if (state.windowContainerApplied) {
        reapplyStudioContainer();
      } else if (state.image) {
        // Auto-apply window container when frame theme is clicked without prior activation
        applyWindowContainer();
        rsContainer.classList.toggle('active', state.windowContainerApplied);
      }
    });
  });

  if (rsCopy) {
    rsCopy.addEventListener('click', () => {
      copyToClipboard();
    });
  }

  if (rsSavePng) {
    rsSavePng.addEventListener('click', () => {
      saveFile();
    });
  }

  rsGradientSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      if (swatch.dataset.bg) {
        state.containerBgImage = swatch.dataset.bg;
        state.containerGradient = null;
      } else {
        state.containerGradient = swatch.dataset.gradient;
        state.containerBgImage = null;
      }
      rsGradientSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');

      if (state.windowContainerApplied && state.originalImageBeforeContainer) {
        reapplyStudioContainer();
      } else if (!state.windowContainerApplied && state.image) {
        // Auto-apply window container when background is clicked without prior activation
        applyWindowContainer();
        rsContainer.classList.toggle('active', state.windowContainerApplied);
      }
    });
  });

  rsColorPresets.forEach((button) => {
    button.addEventListener('click', () => {
      state.containerColorPreset = button.dataset.colorPreset || 'normal';
      rsColorPresets.forEach((item) => item.classList.toggle('active', item === button));

      if (state.windowContainerApplied && state.originalImageBeforeContainer) {
        reapplyStudioContainer();
      } else if (!state.windowContainerApplied && state.image) {
        applyWindowContainer();
        rsContainer.classList.toggle('active', state.windowContainerApplied);
      }
    });
  });
}

function initToolbarDismiss() {
  const toolbar = document.querySelector('.toolbar');
  if (!toolbar) return;

  const hideAfterAnimationMs = 340;
  let hidden = false;
  let hideTimer = null;
  let minimizeTimer = null;
  let dragging = false;

  const isFloatingMode = () =>
    !document.body.classList.contains('has-image') &&
    !document.body.classList.contains('has-content') &&
    !state.image;

  const shouldKeepCaptureToolbarVisible = () => isFloatingMode() && !isCaptureMode;

  const restoreToolbar = (options = {}) => {
    hidden = false;
    window.clearTimeout(hideTimer);
    window.clearTimeout(minimizeTimer);
    toolbar.classList.remove('auto-hidden', 'dragging');
    if (options.animate === false) toolbar.style.transition = 'none';
    else toolbar.style.transition = '';
    toolbar.style.opacity = '';
    toolbar.style.pointerEvents = '';
    if (options.animate === false) requestAnimationFrame(() => { toolbar.style.transition = ''; });
    if (!shouldKeepCaptureToolbarVisible() && (options.fromMenu || isFloatingMode())) scheduleAutoHide();
  };

  resetToolbarDismissState = (options = {}) => restoreToolbar({ animate: false, ...options });
  scheduleAutoHideFn = scheduleAutoHide;

  const autoHide = () => {
    if (hidden || !isFloatingMode() || shouldKeepCaptureToolbarVisible()) return;
    if (document.querySelector('dialog[open]')) { scheduleAutoHide(); return; }
    if (state.recordingSettings.captureProject && state.isRecording) { scheduleAutoHide(); return; }
    if (dragging) {
      scheduleAutoHide();
      return;
    }
    hidden = true;
    toolbar.classList.add('auto-hidden');
    minimizeTimer = window.setTimeout(() => {
      if (!hidden || !isFloatingMode()) return;
      if (document.querySelector('dialog[open]')) return;
      if (state.recordingSettings.captureProject && state.isRecording) return;
      window.projectApi.minimizeWindow().catch(() => {});
    }, hideAfterAnimationMs);
  };

  function scheduleAutoHide() {
    window.clearTimeout(hideTimer);
    if (hidden || !isFloatingMode() || isCaptureMode) return;
    if (shouldKeepCaptureToolbarVisible()) return;
    if (document.querySelector('dialog[open]')) return;
    if (state.recordingSettings.captureProject && state.isRecording) return;
    const idx = Math.min(Math.max(Math.round(state.recordingSettings.autoHideDelay ?? 0), 0), 7);
    if (idx >= AUTO_HIDE_DELAYS.length - 1) return;
    const delayMs = AUTO_HIDE_DELAYS[idx];
    hideTimer = window.setTimeout(autoHide, delayMs);
  }

  const markActivity = () => {
    if (hidden) return;
    if (document.querySelector('dialog[open]')) return;
    scheduleAutoHide();
  };

  const finishDragging = () => {
    if (!dragging) return;
    dragging = false;
    toolbar.classList.remove('dragging');
    markActivity();
  };

  toolbar.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button, .color-swatch, .stroke-picker')) return;
    if (hidden || !isFloatingMode()) return;
    dragging = true;
    toolbar.classList.add('dragging');
    markActivity();
  });

  toolbar.addEventListener('pointermove', markActivity);

  toolbar.addEventListener('pointerup', finishDragging);
  toolbar.addEventListener('pointercancel', finishDragging);

  ['pointermove', 'pointerdown', 'keydown'].forEach((eventName) => {
    document.addEventListener(eventName, markActivity, true);
  });

  ['pointerup', 'pointercancel'].forEach((eventName) => {
    document.addEventListener(eventName, finishDragging, true);
    window.addEventListener(eventName, finishDragging, true);
  });

  window.addEventListener('blur', finishDragging);

  scheduleAutoHide();
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  initToolbarDismiss();
});
