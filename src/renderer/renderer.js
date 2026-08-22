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
  currentTool: null,
  currentColor: '#111111',
  strokeWidth: 4,
  textFontSize: 24,
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
  isResizingAnnotation: false,
  resizeHandle: null,
  windowContainerApplied: false,
  containerGradient: 'none',
  containerBgBlur: 'none',
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
  originalImageBeforeContainer: null,
  baseOriginalImage: null,
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
  elements.canvas.addEventListener('mousedown', onCanvasMouseDown);
  document.addEventListener('mousemove', onCanvasMouseMove);
  document.addEventListener('mouseup', onCanvasMouseUp);
  elements.canvas.addEventListener('mouseleave', onCanvasMouseUp);
  elements.container.addEventListener('wheel', onWheel, { passive: false });
}

function bindKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (state.isEditingText) return;
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
    if (cmdOrCtrl && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteFromClipboard(); return; }
    if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); redo(); return; }
    if (cmdOrCtrl && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    
    switch (e.key.toLowerCase()) {
      case 'r': selectTool('rect'); break;
      case 'e': selectTool('ellipse'); break;
      case 'a': selectTool('arrow'); break;
      case 'l': selectTool('line'); break;
      case 't': selectTool('text'); break;
      case '=': case '+': setZoom(state.zoom * 1.25); break;
      case '-': setZoom(state.zoom / 1.25); break;
      case '0': fitToWindow(); break;
      case 'w': applyWindowContainer(); break;
      case '[': elements.strokeWidthSlider.value = Math.max(1, parseInt(elements.strokeWidthSlider.value) - 1); state.strokeWidth = parseInt(elements.strokeWidthSlider.value); updateToolbarState(); render(); break;
      case ']': elements.strokeWidthSlider.value = Math.min(20, parseInt(elements.strokeWidthSlider.value) + 1); state.strokeWidth = parseInt(elements.strokeWidthSlider.value); updateToolbarState(); render(); break;
    }
  });

  document.addEventListener('keydown', (e) => {
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
  document.addEventListener('paste', async (e) => {
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
    state.windowContainerApplied = false;
    state.originalImageBeforeContainer = null;
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
  if (result.success) showToast('Image saved successfully', 'success');
  else showToast('Failed to save image', 'error');
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

  // Reset container background settings
  state.windowContainerApplied = false;
  state.originalImageBeforeContainer = null;
  state.containerGradient = 'none';
  state.containerBgBlur = 'none';
  
  // Update sidebar active states
  const rsGradientSwatches = document.querySelectorAll('.rs-gradient-swatch');
  rsGradientSwatches.forEach(s => s.classList.remove('active'));
  const gradientSwatches = document.querySelectorAll('.gradient-swatch');
  gradientSwatches.forEach(s => s.classList.remove('active'));
  const frameSwatches = document.querySelectorAll('.rs-frame-swatch');
  frameSwatches.forEach(s => s.classList.toggle('active', s.dataset.theme === 'default'));
  const btnWindowContainer = document.getElementById('btn-window-container');
  if (btnWindowContainer) btnWindowContainer.classList.remove('active');

  // Immediately clear the canvas visually while the image loads
  elements.ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);

  // Reload the very first original image if available
  if (state.baseOriginalImage) {
    loadImage(state.baseOriginalImage, { isInternal: true });
  } else {
    // If there is no base original image, we just wipe the canvas (already done above)
    // but we need to remove the image from state as well.
    state.image = null;
    state.imageWidth = 0;
    state.imageHeight = 0;
    elements.canvas.classList.remove('visible');
    elements.emptyState.classList.remove('hidden');
    document.body.classList.remove('has-image');
    document.body.classList.add('has-content');
    updateStatus();
    updateToolbarState();
    window.dispatchEvent(new CustomEvent('editor-state-change', {
      detail: { hasSelection: false }
    }));
  }
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
  const img = new Image();
  img.onload = () => {
    state.image = img;
    state.imageWidth = img.width;
    state.imageHeight = img.height;
    if (!options.isInternal) {
      state.baseOriginalImage = dataUrl;
      state.originalImageBeforeContainer = null;
      state.windowContainerApplied = false;
    } else {
      if (!state.windowContainerApplied) state.originalImageBeforeContainer = null;
    }
    state.annotations = [];
    state.history = [];
    state.historyIndex = -1;
    state.selectedAnnotationIndex = -1;
    clearToolSelection();
    state.zoom = 1;
    elements.canvas.width = img.width;
    elements.canvas.height = img.height;
    elements.canvas.classList.add('visible');
    elements.emptyState.classList.add('hidden');
    document.body.classList.add('has-image');
    document.body.classList.remove('has-content');
    resetFloatingToolbar();
    setAppWindowMode('editor');
    elements.statusTool?.parentElement?.classList.add('visible');
    fitToWindow();
    render();
    updateStatus();
    updateToolbarState();
  };
  img.src = dataUrl;
}

// ------------------------------------------------------------------------------
// Zoom & Pan
// ------------------------------------------------------------------------------

function setZoom(newZoom) {
  state.zoom = Math.max(0.1, Math.min(10, newZoom));
  applyZoom();
  updateStatus();
  if (state.cropActive) updateCropUI();
}

function applyZoom() {
  elements.canvas.style.width = (state.imageWidth * state.zoom) + 'px';
  elements.canvas.style.height = (state.imageHeight * state.zoom) + 'px';
}

function fitToWindow() {
  if (!state.image) return;
  const container = elements.container;
  const styles = getComputedStyle(container);
  const horizontalPadding = parseFloat(styles.paddingLeft || '0') + parseFloat(styles.paddingRight || '0');
  const verticalPadding = parseFloat(styles.paddingTop || '0') + parseFloat(styles.paddingBottom || '0');
  const availW = container.clientWidth - horizontalPadding - 700; // Account for left and right sidebars
  const availH = container.clientHeight - verticalPadding - 180;  // Account for top toolbar
  
  // If container hasn't laid out yet, retry on next frame
  if (container.clientWidth <= 0 || container.clientHeight <= 0) {
    requestAnimationFrame(() => fitToWindow());
    return;
  }
  
  // Ensure we don't get negative or tiny sizes on small screens
  const safeAvailW = Math.max(availW, container.clientWidth * 0.4);
  const safeAvailH = Math.max(availH, container.clientHeight * 0.4);

  const scaleX = safeAvailW / state.imageWidth;
  const scaleY = safeAvailH / state.imageHeight;
  state.zoom = Math.min(scaleX, scaleY, 1);
  applyZoom();
  updateStatus();
}

function onWheel(e) {
  if (!state.image || (!e.ctrlKey && !e.metaKey)) return;
  e.preventDefault();
  setZoom(state.zoom * (e.deltaY > 0 ? 0.9 : 1.1));
}

function bindZoomControls() {
  on(elements.btnZoomOut, 'click', () => setZoom(state.zoom / 1.25));
  on(elements.btnZoomIn, 'click', () => setZoom(state.zoom * 1.25));
  on(elements.btnZoomReset, 'click', () => {
    if (state.image) fitToWindow();
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
    elements.textInput.style.fontSize = Math.round(size * state.zoom) + 'px';
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
  const size = annotation.fontSize || state.textFontSize || 24;
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

function onCanvasMouseDown(e) {
  if (!state.image || state.cropActive) return;
  if (state.isEditingText) { commitInlineText(); return; }
  if (!state.currentTool) return;
  
  const coords = getCanvasCoords(e);

  if (state.currentTool === 'select') {
    const handle = findResizeHandleAt(coords);
    if (handle) {
      state.isResizingAnnotation = true;
      state.resizeHandle = handle;
      state.dragStartX = coords.x;
      state.dragStartY = coords.y;
      elements.canvas.style.cursor = handle.cursor;
      return;
    }

    const idx = findAnnotationAt(coords);
    state.selectedAnnotationIndex = idx;
    if (idx >= 0) {
      state.isDraggingAnnotation = true;
      state.dragAnnotationIndex = idx;
      state.dragStartX = coords.x;
      state.dragStartY = coords.y;
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

  state.isDrawing = true;
  state.startX = coords.x;
  state.startY = coords.y;
}

function onCanvasMouseMove(e) {
  if (!state.image || state.cropActive) return;
  
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
    const handle = findResizeHandleAt(coords);
    if (handle) elements.canvas.style.cursor = handle.cursor;
    else elements.canvas.style.cursor = findAnnotationAt(coords) >= 0 ? 'grab' : 'default';
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
  input.style.fontSize = Math.round(state.textFontSize * state.zoom) + 'px';
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
    state.history[state.historyIndex] = { image: getImageDataUrl(), annotations: [...state.annotations.map(a => ({...a}))] };
    state.historyIndex--;
    const img = new Image();
    img.onload = () => {
      state.image = img;
      state.annotations = entry.annotations ? [...entry.annotations.map(a => ({...a}))] : [];
      state.selectedAnnotationIndex = -1;
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
    state.history[state.historyIndex] = { image: getImageDataUrl(), annotations: [...state.annotations.map(a => ({...a}))] };
    const img = new Image();
    img.onload = () => {
      state.image = img;
      state.annotations = entry.annotations ? [...entry.annotations.map(a => ({...a}))] : [];
      state.selectedAnnotationIndex = -1;
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
  ctx.drawImage(state.image, 0, 0);
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
  if (state.currentTool !== 'select' || state.selectedAnnotationIndex < 0) return;
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

// ------------------------------------------------------------------------------
// Composite & UI
// ------------------------------------------------------------------------------

function getCompositeImage() {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = state.imageWidth;
  tempCanvas.height = state.imageHeight;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(state.image, 0, 0);
  const orig = elements.ctx;
  elements.ctx = tempCtx;
  state.annotations.forEach(drawAnnotation);
  elements.ctx = orig;
  return tempCanvas.toDataURL('image/png');
}

function updateStatus() {
  const names = { select: 'Select', rect: 'Rectangle', ellipse: 'Ellipse', arrow: 'Arrow', line: 'Line', text: 'Text', highlight: 'Highlight', blur: 'Blur', pixelate: 'Pixelate' };
  elements.statusTool.textContent = state.cropActive ? 'Crop' : (names[state.currentTool] || 'Ready');
  elements.statusZoom.textContent = `${Math.round(state.zoom * 100)}%`;
}

function updateToolbarState() {
  if (elements.btnCopy) elements.btnCopy.disabled = !state.image;
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
  ctx.drawImage(state.image, 0, 0);
  return c.toDataURL('image/png');
}

function replaceImage(dataUrl, cb) {
  const img = new Image();
  img.onload = () => {
    state.image = img;
    if (cb) cb();
    render();
    updateStatus();
    updateToolbarState();
  };
  img.src = dataUrl;
}

// (Magic Wand was removed)

function getStudioFilter() {
  return [
    `brightness(${state.studioBrightness || 100}%)`,
    `contrast(${state.studioContrast || 100}%)`,
    `saturate(${state.studioSaturation || 100}%)`,
    `hue-rotate(${state.studioHue || 0}deg)`,
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

function drawStudioWatermark(ctx, canvasW, canvasH) {
  if ((state.studioWatermarkMode || 'off') === 'off') return;
  const text = (state.studioWatermarkText || '').trim();
  const platformLabels = { x: 'X', gh: 'GH', ig: 'IG', in: 'IN', web: 'Web', text: '' };
  const platform = platformLabels[state.studioWatermarkPlatform || 'x'] ?? 'X';
  const label = state.studioWatermarkMode === 'text' || state.studioWatermarkPlatform === 'text'
    ? (text || '@icodraw')
    : `${platform}${text ? `  ${text}` : ''}`;
  const fontSize = Math.max(14, Math.round(Math.min(canvasW, canvasH) * 0.022));
  const padX = fontSize * 0.8;
  const padY = fontSize * 0.52;

  ctx.save();
  ctx.font = `600 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
  const metrics = ctx.measureText(label);
  const badgeW = metrics.width + padX * 2;
  const badgeH = fontSize + padY * 2;
  const x = canvasW - badgeW - Math.max(24, canvasW * 0.035);
  const y = canvasH - badgeH - Math.max(24, canvasH * 0.035);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = state.studioWatermarkMode === 'badge' ? 'rgba(255, 255, 255, 0.86)' : 'rgba(255, 255, 255, 0.72)';
  ctx.beginPath();
  roundRect(ctx, x, y, badgeW, badgeH, Math.min(18, badgeH / 2));
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#171717';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + padX, y + badgeH / 2 + 0.5);
  ctx.restore();
}

function drawStudioWindow(ctx, frameCanvas, centerX, centerY, width, height) {
  const pitch = (state.studioPitch || 0) * Math.PI / 180;
  const yaw = (state.studioYaw || 0) * Math.PI / 180;
  const roll = ((state.studioRotation || 0) + (state.studioRoll || 0)) * Math.PI / 180;
  const depth = Math.max(400, Number(state.studioCameraDepth || 1200));
  const depthInfluence = Math.max(0.76, Math.min(1.18, depth / 1200));
  const scaleX = Math.max(0.42, Math.cos(yaw) * depthInfluence);
  const scaleY = Math.max(0.42, Math.cos(pitch) * depthInfluence);
  const skewX = Math.sin(yaw) * 0.22;
  const skewY = -Math.sin(pitch) * 0.16;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(roll);
  ctx.transform(scaleX, skewY, skewX, scaleY, 0, 0);
  ctx.drawImage(frameCanvas, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function applyWindowContainer() {
  if (!state.image) return;

  if (state.windowContainerApplied && state.originalImageBeforeContainer) {
    state.windowContainerApplied = false;
    state.annotations = [];
    state.history = [];
    state.historyIndex = -1;
    state.selectedAnnotationIndex = -1;
    const btn = document.getElementById('btn-window-container');
    if (btn) btn.classList.remove('active');
    loadImage(state.originalImageBeforeContainer, { isInternal: true });
    showToast('Window container removed', 'success');
    return;
  }

  const titleBarHeight = state.studioTitlebar ? 48 : 0;
  const cornerRadius = Math.max(0, Number(state.studioCornerRadius || 16));
  const padding = Math.max(0, Number(state.studioPadding || 64));
  const shadowBlur = Math.max(0, Number(state.studioShadowBlur ?? state.studioShadow ?? 45));
  const shadowDistance = Math.max(0, Number(state.studioShadowDistance ?? state.studioShadow ?? 25));
  const shadowOpacity = Math.max(0, Math.min(0.8, Number(state.studioShadowOpacity ?? 35) / 100));
  const shadowOffsetX = Number(state.studioShadowOffsetX || 0);
  const shadowOffsetY = Number(state.studioShadowOffsetY || 0);
  const shadowColor = `rgba(24, 18, 12, ${shadowOpacity})`;
  const frameThemes = {
    dark: { titleBar: '#3a3a3c', windowBg: '#1e1e1e' },
    light: { titleBar: '#e5e5e5', windowBg: '#ffffff' },
    midnight: { titleBar: '#1e293b', windowBg: '#0f172a' },
    minimal: { titleBar: '#f8f9fa', windowBg: '#ffffff' },
    contrast: { titleBar: '#111111', windowBg: '#000000' }
  };

  const selectedTheme = frameThemes[state.windowFrameTheme || 'dark'] || frameThemes.dark;
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
  };

  const lights = [
    { color: '#ff5f57', x: 20 },
    { color: '#febc2e', x: 40 },
    { color: '#28c840', x: 60 },
  ];
  const lightRadius = 6;

  const compositeDataUrl = getCompositeImage();
  state.originalImageBeforeContainer = compositeDataUrl;

  const compositeImg = new Image();
  compositeImg.onload = () => {
    const imageScale = Math.max(0.4, Math.min(1.6, Number(state.studioImageScale || 100) / 100));
    const imgW = compositeImg.width * imageScale;
    const imgH = compositeImg.height * imageScale;

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
    canvasW += orbitHeadroom * 2;
    canvasH += orbitHeadroom * 2;

    const windowX = (canvasW - windowW) / 2;
    const windowY = (canvasH - windowH) / 2;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasW;
    tempCanvas.height = canvasH;
    const ctx = tempCanvas.getContext('2d');

    const drawRest = () => {
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = Math.ceil(windowW);
      frameCanvas.height = Math.ceil(windowH);
      const frameCtx = frameCanvas.getContext('2d');

      frameCtx.save();
      frameCtx.beginPath();
      roundRect(frameCtx, 0, 0, windowW, windowH, cornerRadius);
      frameCtx.clip();
      frameCtx.fillStyle = windowBgColor;
      frameCtx.fillRect(0, 0, windowW, windowH);

      if (state.studioTitlebar) {
        frameCtx.fillStyle = titleBarColor;
        frameCtx.fillRect(0, 0, windowW, titleBarHeight);
        frameCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        frameCtx.lineWidth = 1;
        frameCtx.beginPath();
        frameCtx.moveTo(0, titleBarHeight);
        frameCtx.lineTo(windowW, titleBarHeight);
        frameCtx.stroke();

        const lightY = titleBarHeight / 2;
        lights.forEach(light => {
          frameCtx.beginPath();
          frameCtx.arc(light.x, lightY, lightRadius, 0, Math.PI * 2);
          frameCtx.fillStyle = light.color;
          frameCtx.fill();
        });
      }

      frameCtx.filter = getStudioFilter();
      frameCtx.drawImage(compositeImg, 0, titleBarHeight, imgW, imgH);
      frameCtx.filter = 'none';
      addStudioNoise(frameCtx, frameCanvas.width, frameCanvas.height, 'image');
      drawAsciiPattern(frameCtx, frameCanvas.width, frameCanvas.height, 'image');
      frameCtx.restore();

      if (state.studioBorder) {
        frameCtx.save();
        frameCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        frameCtx.lineWidth = 1;
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
      drawStudioWatermark(ctx, canvasW, canvasH);

      const resultDataUrl = tempCanvas.toDataURL('image/png');
      state.annotations = [];
      state.history = [];
      state.historyIndex = -1;
      state.selectedAnnotationIndex = -1;
      state.windowContainerApplied = true;
      const btn = document.getElementById('btn-window-container');
      if (btn) btn.classList.add('active');
      loadImage(resultDataUrl, { isInternal: true });
      showToast('Window container applied', 'success');
    };

    if (state.containerBgImage) {
      const bgImg = new Image();
      bgImg.onload = () => {
        const scale = Math.max(canvasW / bgImg.width, canvasH / bgImg.height);
        const drawW = bgImg.width * scale;
        const drawH = bgImg.height * scale;
        const drawX = (canvasW - drawW) / 2;
        const drawY = (canvasH - drawH) / 2;
        
        ctx.save();
        if (state.containerBgBlur && state.containerBgBlur !== 'none') {
          const blurAmounts = { weak: '10px', moderate: '25px', strong: '50px' };
          ctx.filter = `blur(${blurAmounts[state.containerBgBlur] || '0px'})`;
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

      if (state.windowContainerApplied && state.originalImageBeforeContainer) {
        state.windowContainerApplied = false;
        const originalImg = state.originalImageBeforeContainer;
        const tempImg = new Image();
        tempImg.onload = () => {
          state.image = tempImg;
          state.imageWidth = tempImg.width;
          state.imageHeight = tempImg.height;
          state.annotations = [];
          state.history = [];
          state.historyIndex = -1;
          state.originalImageBeforeContainer = originalImg;
          applyWindowContainer();
        };
        tempImg.src = originalImg;
      } else if (!state.windowContainerApplied && state.image) {
        // Auto-apply window container when background is clicked without prior activation
        applyWindowContainer();
      }
      menu.classList.remove('visible');
    });
  });
}

function reapplyStudioContainer() {
  if (!state.image) return;
  if (state.windowContainerApplied && state.originalImageBeforeContainer) {
    state.windowContainerApplied = false;
    const originalImg = state.originalImageBeforeContainer;
    const tempImg = new Image();
    tempImg.onload = () => {
      state.image = tempImg;
      state.imageWidth = tempImg.width;
      state.imageHeight = tempImg.height;
      state.annotations = [];
      state.history = [];
      state.historyIndex = -1;
      state.originalImageBeforeContainer = originalImg;
      applyWindowContainer();
    };
    tempImg.src = originalImg;
    return;
  }
  applyWindowContainer();
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
    'studio-ascii-size-value': `${state.studioAsciiSize}px`,
    'studio-ascii-opacity-value': `${state.studioAsciiOpacity}%`,
  };
  Object.entries(labels).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
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

  document.querySelectorAll('.studio-input').forEach((input) => {
    input.addEventListener('input', () => {
      const key = input.dataset.stateKey;
      if (!key) return;
      state[key] = input.type === 'checkbox' ? input.checked : Number(input.value);
      updateStudioValueLabels();
      if (state.windowContainerApplied) reapplyStudioContainer();
    });
    input.addEventListener('change', () => {
      const key = input.dataset.stateKey;
      if (!key) return;
      state[key] = input.type === 'checkbox' ? input.checked : Number(input.value);
      updateStudioValueLabels();
      if (state.image) reapplyStudioContainer();
    });
  });

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
      document.querySelectorAll('.rs-frame-swatch').forEach((swatch) => {
        swatch.classList.toggle('active', swatch.dataset.theme === state.windowFrameTheme);
      });
      if (state.image) reapplyStudioContainer();
    });
  });

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

  document.getElementById('studio-watermark-text')?.addEventListener('input', (event) => {
    state.studioWatermarkText = event.target.value;
    if (state.windowContainerApplied) reapplyStudioContainer();
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
  const rightSidebar = document.getElementById('right-sidebar');
  const rsCloseBtn = document.getElementById('rs-close-btn');

  if (!rsContainer || !rightSidebar) return;

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

        // If window container is already applied, temporarily disable it to force a full recalculation
        if (state.windowContainerApplied) {
          state.windowContainerApplied = false;
        }
        applyWindowContainer();
        rsContainer.classList.toggle('active', state.windowContainerApplied);
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
          // re-apply to see new aspect ratio
          state.windowContainerApplied = false;
          const originalImg = state.originalImageBeforeContainer;
          const tempImg = new Image();
          tempImg.onload = () => {
            state.image = tempImg;
            state.imageWidth = tempImg.width;
            state.imageHeight = tempImg.height;
            state.annotations = [];
            state.history = [];
            state.historyIndex = -1;
            state.originalImageBeforeContainer = originalImg;
            applyWindowContainer();
          };
          tempImg.src = originalImg;
        }
      });
    });
  }

  const rsBlurSelect = document.getElementById('rs-blur-select');
  if (rsBlurSelect) {
    const valueText = rsBlurSelect.querySelector('#rs-blur-value-text');
    const options = rsBlurSelect.querySelectorAll('.rs-select-option');

    rsBlurSelect.querySelector('.rs-select-value').addEventListener('click', (e) => {
      e.stopPropagation();
      rsBlurSelect.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      rsBlurSelect.classList.remove('open');
    });

    options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        options.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        valueText.textContent = option.textContent;
        rsBlurSelect.classList.remove('open');

        state.containerBgBlur = option.dataset.value;
        if (state.windowContainerApplied) {
          // re-apply to see new blur
          state.windowContainerApplied = false;
          const originalImg = state.originalImageBeforeContainer;
          const tempImg = new Image();
          tempImg.onload = () => {
            state.image = tempImg;
            state.imageWidth = tempImg.width;
            state.imageHeight = tempImg.height;
            state.annotations = [];
            state.history = [];
            state.historyIndex = -1;
            state.originalImageBeforeContainer = originalImg;
            applyWindowContainer();
          };
          tempImg.src = originalImg;
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
      document.querySelectorAll('[data-window-chrome]').forEach((button) => {
        button.classList.toggle('active', button.dataset.windowChrome === state.windowFrameTheme);
      });

      if (state.windowContainerApplied) {
        state.windowContainerApplied = false;
        const originalImg = state.originalImageBeforeContainer;
        const tempImg = new Image();
        tempImg.onload = () => {
          state.image = tempImg;
          state.imageWidth = tempImg.width;
          state.imageHeight = tempImg.height;
          state.annotations = [];
          state.history = [];
          state.historyIndex = -1;
          state.originalImageBeforeContainer = originalImg;
          applyWindowContainer();
        };
        tempImg.src = originalImg;
      } else if (state.image) {
        // Auto-apply window container when frame theme is clicked without prior activation
        applyWindowContainer();
        rsContainer.classList.toggle('active', state.windowContainerApplied);
      }
    });
  });

  rsCopy.addEventListener('click', () => {
    copyToClipboard();
  });

  rsSavePng.addEventListener('click', () => {
    saveFile();
  });

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
        // Re-apply with new background
        state.windowContainerApplied = false;
        const originalImg = state.originalImageBeforeContainer;
        const tempImg = new Image();
        tempImg.onload = () => {
          state.image = tempImg;
          state.imageWidth = tempImg.width;
          state.imageHeight = tempImg.height;
          state.annotations = [];
          state.history = [];
          state.historyIndex = -1;
          state.originalImageBeforeContainer = originalImg;
          applyWindowContainer();
        };
        tempImg.src = originalImg;
      } else if (!state.windowContainerApplied && state.image) {
        // Auto-apply window container when background is clicked without prior activation
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
