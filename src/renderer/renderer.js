/**
 * Your Project - Renderer Process
 * Canvas drawing, tools, and UI interaction
 */

// ------------------------------------------------------------------------------
// App State
// ------------------------------------------------------------------------------

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
window.editorSelectFontFamily = (f) => selectTextFontFamily(f);
window.editorSelectFontSize = (s) => selectTextFontSize(s);


const state = {
  image: null,
  imageWidth: 0,
  imageHeight: 0,
  zoom: 1,
  currentTool: null,
  currentColor: '#f97316',
  strokeWidth: 4,
  textFontSize: 24,
  textFontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif',
  textBold: false,
  textItalic: false,
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
  originalImageBeforeContainer: null,
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
  magicWand: null,
  magicWandActive: false,
  imageModified: false,
  _queueStatusUpdate: false,
  _marchingPhase: 0,
  _marchingRAF: null,
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
  btnToggleTheme: $('#btn-toggle-theme'),
  emptyCapture: $('#empty-capture'),
  emptyOpen: $('#empty-open'),
  toolBtns: $$('.toolbar-group.tools .tool-btn'),
  colorSwatches: $$('.color-swatch'),
  strokePicker: $('#stroke-picker'),
  strokeCurrentLine: $('#stroke-current-line'),
  strokeMenu: $('#stroke-menu'),
  strokeBtns: $$('.stroke-option'),
  statusTool: $('#status-tool'),
  statusZoom: $('#status-zoom'),
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
  bindKeyboard();
  bindIPC();
  bindInlineText();
  bindContextMenu();
  bindRightSidebar();
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
  loadRecordingSettings();
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
  const savedTheme = localStorage.getItem(THEME_SETTING_KEY);
  const initialTheme = savedTheme || 'light';
  document.body.classList.toggle('theme-dark', initialTheme === 'dark');
  document.body.classList.toggle('theme-light', initialTheme !== 'dark');
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

  elements.toolBtns.forEach(btn => {
    btn.addEventListener('click', () => selectTool(btn.dataset.tool));
  });
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
    if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Del' || e.key === 'Suppr') {
      if (state.currentTool === 'magic-wand') return;
      const selected = state.annotations[state.selectedAnnotationIndex];
      const canDelete = state.selectedAnnotationIndex >= 0 && (state.currentTool === 'select' || selected?.type === 'text');
      if (canDelete) {
        e.preventDefault();
        deleteSelectedAnnotation();
      }
      return;
    }
    
    switch (e.key.toLowerCase()) {
      case 'r': selectTool('rect'); break;
      case 'e': selectTool('ellipse'); break;
      case 'a': selectTool('arrow'); break;
      case 'l': selectTool('line'); break;
      case 't': selectTool('text'); break;
      case 'm': selectTool('magic-wand'); break;
      case '=': case '+': setZoom(state.zoom * 1.25); break;
      case '-': setZoom(state.zoom / 1.25); break;
      case '0': fitToWindow(); break;
      case 'w': applyWindowContainer(); break;
      case 'escape':
        if (state.magicWand) {
          stopMarchingAnts();
          state.magicWand = null;
          state.magicWandActive = false;
          render();
        }
        break;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Del' || e.key === 'Suppr') {
      if (state.magicWand?.selectionMask && state.currentTool === 'magic-wand') {
        e.preventDefault();
        applyMagicWandRemoval();
      }
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
  window.projectApi.onSettingsChanged?.(() => { loadRecordingSettings(); scheduleAutoHideFn(); });
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
  elements.btnCrop.classList.add('active');
  updateCropUI();
}

function cancelCrop() {
  state.cropActive = false;
  state.cropDragging = null;
  elements.cropOverlay.classList.remove('active');
  elements.btnCrop.classList.remove('active');
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
  discardRecordingPreview({ silent: true });
  state.image = null;
  state.imageWidth = 0;
  state.imageHeight = 0;
  state.annotations = [];
  state.history = [];
  state.historyIndex = -1;
  state.selectedAnnotationIndex = -1;
  state.currentColor = null;
  state.windowContainerApplied = false;
  state.originalImageBeforeContainer = null;
  elements.canvas.classList.remove('visible');
  elements.emptyState.classList.add('hidden');
  document.body.classList.remove('has-image');
  document.body.classList.remove('has-content');
  document.body.offsetHeight; // force reflow
  elements.colorSwatches.forEach(s => s.classList.remove('active'));
  if (elements.textStyleBold) {
    elements.textStyleBold.style.removeProperty('--style-active-color');
    elements.textStyleBold.style.removeProperty('--style-active-bg');
  }
  if (elements.textStyleItalic) {
    elements.textStyleItalic.style.removeProperty('--style-active-color');
    elements.textStyleItalic.style.removeProperty('--style-active-bg');
  }
  resetFloatingToolbar();
  setAppWindowMode('toolbar');
  elements.statusTool?.parentElement?.classList.remove('visible');
  elements.ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  updateStatus();
  updateToolbarState();
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
    if (!state.windowContainerApplied) state.originalImageBeforeContainer = null;
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
  const availW = container.clientWidth - horizontalPadding - 48;
  const availH = container.clientHeight - verticalPadding - 48;
  // If container hasn't laid out yet, retry on next frame
  if (availW <= 0 || availH <= 0) {
    requestAnimationFrame(() => fitToWindow());
    return;
  }
  const scaleX = availW / state.imageWidth;
  const scaleY = availH / state.imageHeight;
  state.zoom = Math.min(scaleX, scaleY, 1);
  applyZoom();
  updateStatus();
}

function onWheel(e) {
  if (!state.image || (!e.ctrlKey && !e.metaKey)) return;
  e.preventDefault();
  setZoom(state.zoom * (e.deltaY > 0 ? 0.9 : 1.1));
}

// ------------------------------------------------------------------------------
// Tool Selection
// ------------------------------------------------------------------------------

const DRAWING_TOOLS = ['rect', 'ellipse', 'arrow', 'line', 'text', 'pixelate'];

function selectTool(tool) {
  if (state.isEditingText) commitInlineText();
  if (state.cropActive) cancelCrop();
  if (state.magicWandActive) {
    state.magicWandActive = false;
    state.magicWand = null;
    stopMarchingAnts();
  }
  state.currentTool = tool;
  elements.toolBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tool === tool));
  elements.container.className = tool ? `canvas-container tool-${tool}` : 'canvas-container';
  elements.canvas.style.cursor = !tool ? 'default' : (tool === 'text' ? 'text' : (tool === 'select' || tool === 'magic-wand' ? 'default' : 'crosshair'));
  if (DRAWING_TOOLS.includes(tool)) {
    selectColor(state.currentColor || '#f97316');
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
  if (state.currentTool === 'select' && state.selectedAnnotationIndex >= 0) {
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
  if (state.currentTool === 'select' && state.selectedAnnotationIndex >= 0) {
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
  if (state.currentTool === 'select' && state.selectedAnnotationIndex >= 0) {
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
  if (state.currentTool === 'select' && state.selectedAnnotationIndex >= 0) {
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
      render();
      return;
    }
    openInlineText(coords);
    e.stopPropagation();
    return;
  }
  
  if (state.currentTool === 'magic-wand') {
    startMagicWandSelection(coords.x, coords.y);
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
  
  if (state.magicWandActive) {
    const coords = getCanvasCoords(e);
    state.magicWand.currentX = coords.x;
    state.magicWand.currentY = coords.y;
    updateMagicWand();
    return;
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
  
  if (state.magicWandActive) {
    state.magicWandActive = false;
    queueUpdateStatus();
    render();
    startMarchingAnts();
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
      state.magicWand = null;
      state.magicWandActive = false;
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
      state.magicWand = null;
      state.magicWandActive = false;
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
  if (state.magicWand?.selectionMask) drawMagicWandOverlay(ctx);
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
    case 'rect': ctx.strokeRect(ann.x, ann.y, ann.width, ann.height); break;
    case 'ellipse': drawEllipse(ctx, ann.x, ann.y, ann.width, ann.height); break;
    case 'arrow': drawArrow(ctx, ann.x1, ann.y1, ann.x2, ann.y2, true); break;
    case 'line': ctx.beginPath(); ctx.moveTo(ann.x1, ann.y1); ctx.lineTo(ann.x2, ann.y2); ctx.stroke(); break;
    case 'text':
      ctx.font = buildFontString(ann);
      ann.text.split('\n').forEach((line, i) => {
        ctx.fillText(line, ann.x, ann.y + i * ((ann.fontSize || 24) * 1.2));
      });
      break;
    case 'highlight': ctx.fillStyle = ann.color + '40'; ctx.fillRect(ann.x, ann.y, ann.width, ann.height); break;
    case 'blur': applyBlur(ctx, ann.x, ann.y, ann.width, ann.height); break;
    case 'pixelate': applyPixelate(ctx, ann.x, ann.y, ann.width, ann.height); break;
  }
  ctx.restore();
}

function drawEllipse(ctx, x, y, width, height) {
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawArrow(ctx, x1, y1, x2, y2, solid) {
  const headLength = Math.max(15, (ctx.lineWidth || 4) * 3);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  if (solid) ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
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
  const names = { select: 'Select', rect: 'Rectangle', ellipse: 'Ellipse', arrow: 'Arrow', line: 'Line', text: 'Text', highlight: 'Highlight', blur: 'Blur', pixelate: 'Pixelate', 'magic-wand': 'Magic Wand' };
  elements.statusTool.textContent = state.cropActive ? 'Crop' : (names[state.currentTool] || 'Ready');
  elements.statusZoom.textContent = `${Math.round(state.zoom * 100)}%`;
}

function updateToolbarState() {
  if (elements.btnCopy) elements.btnCopy.disabled = !state.image;
  if (elements.btnCrop) elements.btnCrop.disabled = !state.image;
  if (elements.btnUndo) elements.btnUndo.disabled = state.historyIndex < 0;
  if (elements.btnRedo) elements.btnRedo.disabled = state.historyIndex >= state.history.length - 1;
  if (elements.btnClear) elements.btnClear.disabled = !state.image;

  window.dispatchEvent(new CustomEvent('editor-state-change', {
    detail: {
      currentTool: state.currentTool,
      currentColor: state.currentColor,
      strokeWidth: state.strokeWidth,
      hasImage: !!state.image
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

// ------------------------------------------------------------------------------
// Magic Wand (remove background)
// ------------------------------------------------------------------------------

function floodFill(imageData, sx, sy, tolerance) {
  const w = imageData.width, h = imageData.height;
  const pixels = imageData.data;
  const visited = new Uint8Array(w * h);
  const mask = new Uint8Array(w * h);

  const idx = (sy * w + sx) * 4;
  const tr = pixels[idx];
  const tg = pixels[idx + 1];
  const tb = pixels[idx + 2];

  const stack = [sx, sy];
  while (stack.length > 0) {
    const y = stack.pop();
    const x = stack.pop();
    const pos = y * w + x;
    if (visited[pos]) continue;
    visited[pos] = 1;

    const pi = pos * 4;
    const dr = pixels[pi] - tr;
    const dg = pixels[pi + 1] - tg;
    const db = pixels[pi + 2] - tb;
    if (dr * dr + dg * dg + db * db > tolerance) continue;
    if (pixels[pi + 3] < 128) continue;

    mask[pos] = 1;
    if (x > 0) { stack.push(x - 1, y); }
    if (x < w - 1) { stack.push(x + 1, y); }
    if (y > 0) { stack.push(x, y - 1); }
    if (y < h - 1) { stack.push(x, y + 1); }
  }
  return mask;
}

function startMagicWandSelection(cx, cy) {
  stopMarchingAnts();
  state.magicWand = null;
  state.magicWandActive = false;

  const sx = Math.round(Math.max(0, Math.min(state.imageWidth - 1, cx)));
  const sy = Math.round(Math.max(0, Math.min(state.imageHeight - 1, cy)));

  const oc = document.createElement('canvas');
  oc.width = state.imageWidth;
  oc.height = state.imageHeight;
  const octx = oc.getContext('2d');
  octx.drawImage(state.image, 0, 0);
  const imageData = octx.getImageData(0, 0, state.imageWidth, state.imageHeight);

  const pi = (sy * state.imageWidth + sx) * 4;
  state.magicWand = {
    selectionMask: null,
    overlayCanvas: document.createElement('canvas'),
    startX: sx,
    startY: sy,
    currentX: sx,
    currentY: sy,
    targetR: imageData.data[pi],
    targetG: imageData.data[pi + 1],
    targetB: imageData.data[pi + 2],
    tolerance: 0,
    imageData: imageData,
  };
  state.magicWand.overlayCanvas.width = state.imageWidth;
  state.magicWand.overlayCanvas.height = state.imageHeight;
  state.magicWandActive = true;

  state.magicWand.selectionMask = floodFill(imageData, sx, sy, 0);
  render();
}

function updateMagicWand() {
  if (!state.magicWand || !state.magicWandActive) return;
  const dx = state.magicWand.currentX - state.magicWand.startX;
  const dy = state.magicWand.currentY - state.magicWand.startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const newTol = Math.min(Math.round(distance * 20), 5000);
  if (Math.abs(newTol - state.magicWand.tolerance) > 5) {
    state.magicWand.tolerance = newTol;
    computeMagicWandMask();
    render();
  }
}

function computeMagicWandMask() {
  if (!state.magicWand) return;
  state.magicWand.selectionMask = floodFill(
    state.magicWand.imageData,
    state.magicWand.startX,
    state.magicWand.startY,
    state.magicWand.tolerance
  );
}

function drawMagicWandOverlay(ctx) {
  if (!state.magicWand?.selectionMask) return;
  const w = state.imageWidth;
  const h = state.imageHeight;
  const mask = state.magicWand.selectionMask;
  const overlayCtx = state.magicWand.overlayCanvas.getContext('2d');
  const imageData = overlayCtx.createImageData(w, h);
  const pixels = imageData.data;
  const phase = state._marchingPhase || 0;

  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      pixels[i * 4] = 255;
      pixels[i * 4 + 1] = 50;
      pixels[i * 4 + 2] = 50;
      pixels[i * 4 + 3] = 100;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pos = y * w + x;
      if (!mask[pos]) continue;
      const isBoundary = (x === 0 || !mask[pos - 1]) ||
                         (x === w - 1 || !mask[pos + 1]) ||
                         (y === 0 || !mask[pos - w]) ||
                         (y === h - 1 || !mask[pos + w]);
      if (!isBoundary) continue;
      if ((x + y + phase) % 6 >= 3) continue;
      const pi = pos * 4;
      pixels[pi] = 255; pixels[pi + 1] = 255; pixels[pi + 2] = 255; pixels[pi + 3] = 255;
      if (x + 1 < w) {
        const rpi = (pos + 1) * 4;
        pixels[rpi] = 255; pixels[rpi + 1] = 255; pixels[rpi + 2] = 255; pixels[rpi + 3] = 255;
      }
      if (y + 1 < h) {
        const bpi = (pos + w) * 4;
        pixels[bpi] = 255; pixels[bpi + 1] = 255; pixels[bpi + 2] = 255; pixels[bpi + 3] = 255;
      }
    }
  }

  overlayCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(state.magicWand.overlayCanvas, 0, 0);
}

function stopMarchingAnts() {
  if (state._marchingRAF != null) {
    clearTimeout(state._marchingRAF);
    state._marchingRAF = null;
  }
}

function startMarchingAnts() {
  stopMarchingAnts();
  state._marchingPhase = 0;
  (function march() {
    if (!state.magicWand?.selectionMask) return;
    state._marchingPhase = (state._marchingPhase + 1) % 6;
    render();
    state._marchingRAF = setTimeout(march, 150);
  })();
}

function applyMagicWandRemoval() {
  if (!state.magicWand?.selectionMask) return;

  const beforeImage = getImageDataUrl();
  const beforeAnnotations = [...state.annotations.map(a => ({...a}))];

  const tc = document.createElement('canvas');
  tc.width = state.imageWidth;
  tc.height = state.imageHeight;
  const tctx = tc.getContext('2d');
  tctx.drawImage(state.image, 0, 0);
  const id = tctx.getImageData(0, 0, state.imageWidth, state.imageHeight);
  const mask = state.magicWand.selectionMask;
  const px = id.data;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) px[i * 4 + 3] = 0;
  }
  tctx.putImageData(id, 0, 0);

  stopMarchingAnts();
  state.magicWand = null;
  state.magicWandActive = false;
  state.imageModified = true;

  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push({ image: beforeImage, annotations: beforeAnnotations });
  state.historyIndex = state.history.length - 1;
  updateToolbarState();

  replaceImage(tc.toDataURL('image/png'));
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
    loadImage(state.originalImageBeforeContainer);
    showToast('Window container removed', 'success');
    return;
  }

  const titleBarHeight = 48;
  const cornerRadius = 12;
  const padding = 40;
  const shadowBlur = 30;
  const shadowColor = 'rgba(82, 52, 28, 0.26)';
  const titleBarColor = '#e4ceb4';
  const windowBgColor = '#d7bea2';

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
    const imgW = compositeImg.width;
    const imgH = compositeImg.height;

    const windowW = imgW;
    const windowH = imgH + titleBarHeight;
    const canvasW = windowW + padding * 2;
    const canvasH = windowH + padding * 2;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasW;
    tempCanvas.height = canvasH;
    const ctx = tempCanvas.getContext('2d');

    const drawRest = () => {
      ctx.save();
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8;
      ctx.beginPath();
      roundRect(ctx, padding, padding, windowW, windowH, cornerRadius);
      ctx.fillStyle = windowBgColor;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      roundRect(ctx, padding, padding, windowW, windowH, cornerRadius);
      ctx.clip();

      ctx.fillStyle = titleBarColor;
      ctx.fillRect(padding, padding, windowW, titleBarHeight);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, padding + titleBarHeight);
      ctx.lineTo(padding + windowW, padding + titleBarHeight);
      ctx.stroke();

      const lightY = padding + titleBarHeight / 2;
      lights.forEach(light => {
        ctx.beginPath();
        ctx.arc(padding + light.x, lightY, lightRadius, 0, Math.PI * 2);
        ctx.fillStyle = light.color;
        ctx.fill();
      });

      ctx.drawImage(compositeImg, padding, padding + titleBarHeight, imgW, imgH);
      ctx.restore();

      const resultDataUrl = tempCanvas.toDataURL('image/png');
      state.annotations = [];
      state.history = [];
      state.historyIndex = -1;
      state.selectedAnnotationIndex = -1;
      state.windowContainerApplied = true;
      const btn = document.getElementById('btn-window-container');
      if (btn) btn.classList.add('active');
      loadImage(resultDataUrl);
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
        ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
        drawRest();
      };
      bgImg.onerror = () => {
        ctx.fillStyle = '#d7bea2';
        ctx.fillRect(0, 0, canvasW, canvasH);
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
      ctx.fillRect(0, 0, canvasW, canvasH);
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
      }
      menu.classList.remove('visible');
    });
  });
}

function bindRightSidebar() {
  const rsContainer = document.getElementById('rs-window-container');
  const rsSavePng = document.getElementById('rs-save-png');
  const rsCopy = document.getElementById('rs-copy');
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
