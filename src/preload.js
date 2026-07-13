/**
 * Your Project - Preload Script
 * Secure bridge between main and renderer processes
 */

const { contextBridge, ipcRenderer } = require('electron');

let proRecorder = null;
let proRecordingStream = null;
let proRecordingChunks = [];
let proRecordingFormat = 'mp4';
let proRecordingRawStream = null;
let proRecordingZoomStop = null;
const streamCursorModes = new WeakMap();

function getStreamCursorSetting(stream) {
  const track = stream?.getVideoTracks?.()[0];
  const settings = typeof track?.getSettings === 'function' ? track.getSettings() : null;
  return typeof settings?.cursor === 'string' ? settings.cursor : '';
}

function markStreamCursorMode(stream, requestedMode) {
  if (!stream) return stream;
  const cursorSetting = getStreamCursorSetting(stream);
  const mode = cursorSetting === 'never' ? 'synthetic' : requestedMode;
  streamCursorModes.set(stream, mode === 'native' ? 'native' : 'synthetic');
  return stream;
}

function shouldDrawSyntheticCursor(stream) {
  if (typeof process !== 'undefined' && process.platform === 'darwin') return false;
  return streamCursorModes.get(stream) !== 'native';
}

function getRecordingMimeType() {
  const preferred = 'video/webm;codecs=vp9';
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(preferred)) return preferred;
  const fallback = 'video/webm;codecs=vp8';
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(fallback)) return fallback;
  return 'video/webm';
}

function attachRecordingPreviewStream(previewVideoId, stream) {
  if (!previewVideoId || !stream) return;
  const video = document.getElementById(previewVideoId);
  if (!video) return;
  video.pause();
  video.removeAttribute('src');
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  video.play().catch(() => {});
}

async function getCursorScreenPoint() {
  return ipcRenderer.invoke('get-cursor-screen-point');
}

async function getDesktopStream(sourceId, includeAudio) {
  if (navigator.mediaDevices?.getDisplayMedia) {
    try {
      await ipcRenderer.invoke('pro-recording-display-media-source', { sourceId });
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: Boolean(includeAudio),
        video: {
          cursor: 'never',
          frameRate: { ideal: 60, max: 60 },
        },
      });
      return markStreamCursorMode(stream, 'synthetic');
    } catch (displayMediaError) {
      console.warn('[your-project][recording] getDisplayMedia failed; falling back to desktop getUserMedia:', displayMediaError?.message || displayMediaError);
    }
  }

  const video = {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: sourceId,
    },
    cursor: 'never',
  };
  const audio = includeAudio ? {
    mandatory: {
      chromeMediaSource: 'desktop',
    },
  } : false;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
    return markStreamCursorMode(stream, 'synthetic');
  } catch (error) {
    delete video.cursor;
    const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
    return markStreamCursorMode(stream, 'native');
  }
}

// Cursor smoothing helpers are intentionally inline because this preload runs
// in Electron's sandboxed preload environment, where local require() is blocked.
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function expEase(current, target, speed, dt) {
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}

function createCursorSmoother(options = {}) {
  const renderDelayMs = options.renderDelayMs ?? 35;
  const maxSampleAgeMs = options.maxSampleAgeMs ?? 350;
  const sampleLimit = options.sampleLimit ?? 24;
  const easeSpeed = options.easeSpeed ?? 34;
  const snapDistance = options.snapDistance ?? 220;

  const displayCursor = {
    x: options.initialX ?? 0,
    y: options.initialY ?? 0,
    visible: false,
    initialized: false,
  };
  const samples = [];

  function pushSample(sample) {
    if (!sample || !Number.isFinite(sample.x) || !Number.isFinite(sample.y) || !Number.isFinite(sample.time)) {
      return;
    }

    samples.push({
      x: sample.x,
      y: sample.y,
      visible: Boolean(sample.visible),
      time: sample.time,
    });

    const cutoff = sample.time - maxSampleAgeMs;
    while (
      samples.length > sampleLimit ||
      (samples.length > 1 && samples[0].time < cutoff)
    ) {
      samples.shift();
    }
  }

  function getSampleForFrame(now) {
    if (samples.length === 0) return null;
    const renderTime = now - renderDelayMs;
    let before = samples[0];
    let after = null;

    for (const sample of samples) {
      if (sample.time <= renderTime) {
        before = sample;
      } else {
        after = sample;
        break;
      }
    }

    if (after && after.time > before.time) {
      const t = clamp((renderTime - before.time) / (after.time - before.time), 0, 1);
      return {
        x: before.x + (after.x - before.x) * t,
        y: before.y + (after.y - before.y) * t,
        visible: before.visible && after.visible,
      };
    }

    return before;
  }

  function update(now, dt) {
    const sample = getSampleForFrame(now);
    if (!sample) return { ...displayCursor, visible: false };

    const distance = Math.hypot(sample.x - displayCursor.x, sample.y - displayCursor.y);
    if (!displayCursor.initialized || distance > snapDistance) {
      displayCursor.x = sample.x;
      displayCursor.y = sample.y;
      displayCursor.initialized = true;
    } else {
      displayCursor.x = expEase(displayCursor.x, sample.x, easeSpeed, dt);
      displayCursor.y = expEase(displayCursor.y, sample.y, easeSpeed, dt);
    }

    const newestSample = samples[samples.length - 1];
    displayCursor.visible = Boolean(sample.visible && newestSample && now - newestSample.time < maxSampleAgeMs);
    return { ...displayCursor };
  }

  return {
    pushSample,
    getSampleForFrame,
    update,
    get samples() {
      return [...samples];
    },
  };
}
// End cursor smoothing helpers.

function createAutoZoomStream(sourceStream, region, options = {}) {
  const video = document.createElement('video');
  video.muted = true;
  video.srcObject = sourceStream;
  video.playsInline = true;

  const canvas = document.createElement('canvas');
  const evenDimension = (value) => {
    const rounded = Math.max(2, Math.round(value || 2));
    return rounded % 2 === 0 ? rounded : rounded - 1;
  };
  const scaleFactor = region.scaleFactor || 1;
  const pixelWidth = region.pixelWidth || Math.round(region.width * scaleFactor);
  const pixelHeight = region.pixelHeight || Math.round(region.height * scaleFactor);
  canvas.width = evenDimension(pixelWidth);
  canvas.height = evenDimension(pixelHeight);
  const ctx = canvas.getContext('2d', { alpha: false });
  const initialFrameDataUrl = typeof region.initialFrameDataUrl === 'string'
    ? region.initialFrameDataUrl
    : '';

  const srcRegion = {
    x: region.pixelX ?? Math.round(region.x * scaleFactor),
    y: region.pixelY ?? Math.round(region.y * scaleFactor),
    width: canvas.width,
    height: canvas.height,
  };

  const displayBounds = region.displayBounds || { x: 0, y: 0, width: region.width, height: region.height };
  const pixelScaleX = region.width > 0 ? srcRegion.width / region.width : scaleFactor;
  const pixelScaleY = region.height > 0 ? srcRegion.height / region.height : scaleFactor;

  // macOS Retina workaround: getDisplayMedia sometimes returns a video stream at
  // the physical pixel resolution while MediaTrack.getSettings() reports logical
  // resolution. We detect the actual video frame dimensions once loaded and
  // correct all source-side coordinates so the crop rectangle is accurate.
  const expectedStreamFullW = Math.round(displayBounds.width * scaleFactor);
  const expectedStreamFullH = Math.round(displayBounds.height * scaleFactor);
  let videoCorrectionX = 1;
  let videoCorrectionY = 1;
  let videoDimensionsKnown = false;
  const fps = 60;
  const enableAutoZoom = options.autoZoom !== false;
  const drawSyntheticCursor = shouldDrawSyntheticCursor(sourceStream);

  const zoomLevel = clamp(1.65 + ((srcRegion.width - 1280) / 4096), 1.55, 1.90);

  const IDLE_ZOOM_IN_DELAY_MS      = 750;
  const IDLE_ZOOM_OUT_DELAY_MS     = 4000;
  const LARGE_MOVE_THRESHOLD       = 450 * scaleFactor;
  const FAST_MOVE_THRESHOLD_PX_S   = 1400 * scaleFactor;
  const FAST_MOVE_COOLDOWN_MS      = 800;
  const ZOOM_SPEED                 = 0.9;
  const PAN_SPEED                  = 1.1;
  const TARGET_PAN_SPEED           = 2.0;
  const TARGET_ZOOM_SPEED          = 1.6;
  const regionCenterX = srcRegion.x + srcRegion.width / 2;
  const regionCenterY = srcRegion.y + srcRegion.height / 2;

  // States: 'FULL_SCREEN', 'ZOOMED_FOLLOW', 'ZOOMED_STILL'
  let zoomState = 'FULL_SCREEN';

  let camera = { x: regionCenterX, y: regionCenterY, zoom: 1 };
  let targetCamera = { x: regionCenterX, y: regionCenterY, zoom: 1 };
  let smoothedTarget = { x: regionCenterX, y: regionCenterY, zoom: 1 };
  let cursor = { x: regionCenterX, y: regionCenterY, visible: false };
  let lastAnchor = { x: regionCenterX, y: regionCenterY };

  let lastFastMoveTime   = -Infinity;
  let prevCursorPx       = null;
  let prevPollTime       = null;
  let cursorSpeedEMA     = 0;
  const EMA_ALPHA        = 0.12;
  const CURSOR_RENDER_DELAY_MS = 35;
  const CURSOR_MAX_SAMPLE_AGE_MS = 350;
  const CURSOR_SAMPLE_LIMIT = 24;
  const CURSOR_EASE_SPEED = 12;
  const CURSOR_SNAP_DISTANCE = 220 * scaleFactor;
  const CURSOR_BASE_SIZE = 20;
  const cursorBaseScale = clamp((pixelScaleX + pixelScaleY) / 2, 1, 3);
  const cursorSmoother = createCursorSmoother({
    initialX: regionCenterX,
    initialY: regionCenterY,
    renderDelayMs: CURSOR_RENDER_DELAY_MS,
    maxSampleAgeMs: CURSOR_MAX_SAMPLE_AGE_MS,
    sampleLimit: CURSOR_SAMPLE_LIMIT,
    easeSpeed: CURSOR_EASE_SPEED,
    snapDistance: CURSOR_SNAP_DISTANCE,
  });

  let lastMoveTime = performance.now();
  let lastFrameTime = performance.now();
  let rafId = null;
  let pollTimer = null;
  let stopped = false;
  let cursorPollInFlight = false;

  function drawCursorShape(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 2.5;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 20.5);
    ctx.lineTo(5.2, 15.9);
    ctx.lineTo(8.7, 23.5);
    ctx.lineTo(12.3, 21.8);
    ctx.lineTo(8.9, 14.4);
    ctx.lineTo(15.1, 14.4);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.35;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.stroke();
    ctx.restore();
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function drawInitialFrame() {
    if (!initialFrameDataUrl) return false;
    try {
      const img = await loadImage(initialFrameDataUrl);
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return true;
    } catch {
      return false;
    }
  }

  function drawCursorOverlay(sx, sy, cropW, cropH, now, dt) {
    if (!drawSyntheticCursor) return;
    const displayCursor = cursorSmoother.update(now, dt);
    if (!displayCursor.visible) return;

    const outputX = ((displayCursor.x - sx) / cropW) * canvas.width;
    const outputY = ((displayCursor.y - sy) / cropH) * canvas.height;
    const cursorScale = cursorBaseScale * clamp(camera.zoom, 0.9, 1.55);
    const margin = CURSOR_BASE_SIZE * cursorScale * 2;
    if (
      outputX < -margin ||
      outputY < -margin ||
      outputX > canvas.width + margin ||
      outputY > canvas.height + margin
    ) {
      return;
    }

    drawCursorShape(outputX, outputY, cursorScale);
  }

  async function pollCursor() {
    if (stopped || cursorPollInFlight) return;
    cursorPollInFlight = true;
    try {
      const pt  = await getCursorScreenPoint();
      const now = performance.now();

      const relLogicalX = pt.x - displayBounds.x - region.x;
      const relLogicalY = pt.y - displayBounds.y - region.y;
      const px = srcRegion.x + relLogicalX * pixelScaleX;
      const py = srcRegion.y + relLogicalY * pixelScaleY;
      const visible = relLogicalX >= 0 && relLogicalY >= 0 && relLogicalX <= region.width && relLogicalY <= region.height;
      const clampedX = clamp(px, srcRegion.x, srcRegion.x + srcRegion.width);
      const clampedY = clamp(py, srcRegion.y, srcRegion.y + srcRegion.height);

      if (prevCursorPx && prevPollTime) {
        const dtSec        = Math.max(0.001, (now - prevPollTime) / 1000);
        const dist         = Math.hypot(px - prevCursorPx.x, py - prevCursorPx.y);
        const instantSpeed = dist / dtSec;
        cursorSpeedEMA     = EMA_ALPHA * instantSpeed + (1 - EMA_ALPHA) * cursorSpeedEMA;
      }
      prevCursorPx = { x: px, y: py };
      prevPollTime = now;

      const totalDistanceMoved = Math.hypot(px - cursor.x, py - cursor.y);

      if (totalDistanceMoved > 8 * scaleFactor) {
        lastMoveTime = now;

        if (cursorSpeedEMA > FAST_MOVE_THRESHOLD_PX_S) {
          zoomState        = 'FULL_SCREEN';
          lastFastMoveTime = now;
        } else if (zoomState === 'ZOOMED_STILL' || zoomState === 'ZOOMED_FOLLOW') {
          const distFromAnchor = Math.hypot(px - lastAnchor.x, py - lastAnchor.y);
          if (distFromAnchor > LARGE_MOVE_THRESHOLD) {
            zoomState = 'ZOOMED_FOLLOW';
          }
        }
      }

      cursor.x = clampedX;
      cursor.y = clampedY;
      cursor.visible = visible;
      cursorSmoother.pushSample({ x: cursor.x, y: cursor.y, visible: cursor.visible, time: now });
    } catch {
      // ignore isolated IPC glitches
    } finally {
      cursorPollInFlight = false;
    }
  }

  function updateStateMachine(now) {
    const timeSinceMove     = now - lastMoveTime;
    const timeSinceFastMove = now - lastFastMoveTime;
    const inCooldown        = timeSinceFastMove < FAST_MOVE_COOLDOWN_MS;

    if (!inCooldown && timeSinceMove > IDLE_ZOOM_IN_DELAY_MS) {
      if (zoomState === 'FULL_SCREEN' || zoomState === 'ZOOMED_FOLLOW') {
        zoomState    = 'ZOOMED_STILL';
        lastAnchor.x = cursor.x;
        lastAnchor.y = cursor.y;
      }
    }

    if (timeSinceMove > IDLE_ZOOM_OUT_DELAY_MS && zoomState === 'ZOOMED_STILL') {
      zoomState = 'FULL_SCREEN';
    }

    if (zoomState === 'ZOOMED_STILL') {
      targetCamera.zoom = zoomLevel;
      // Heavier anchor weighting prevents micro-jitters when clicking nearby UI
      targetCamera.x    = lastAnchor.x * 0.45 + cursor.x * 0.55;
      targetCamera.y    = lastAnchor.y * 0.45 + cursor.y * 0.55;
    } else if (zoomState === 'ZOOMED_FOLLOW') {
      // Pull out slightly more during movement for better spatial context
      targetCamera.zoom = zoomLevel * 0.92;
      targetCamera.x    = cursor.x;
      targetCamera.y    = cursor.y;
    } else {
      targetCamera.zoom = 1;
      targetCamera.x    = regionCenterX;
      targetCamera.y    = regionCenterY;
    }
  }

  function draw(now = performance.now()) {
    if (stopped) return;

    const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    if (enableAutoZoom) {
      updateStateMachine(now);

      smoothedTarget.zoom = expEase(smoothedTarget.zoom, targetCamera.zoom, TARGET_ZOOM_SPEED, dt);
      smoothedTarget.x = expEase(smoothedTarget.x, targetCamera.x, TARGET_PAN_SPEED, dt);
      smoothedTarget.y = expEase(smoothedTarget.y, targetCamera.y, TARGET_PAN_SPEED, dt);

      camera.zoom = expEase(camera.zoom, smoothedTarget.zoom, ZOOM_SPEED, dt);
      camera.x = expEase(camera.x, smoothedTarget.x, PAN_SPEED, dt);
      camera.y = expEase(camera.y, smoothedTarget.y, PAN_SPEED, dt);
    } else {
      targetCamera = { x: regionCenterX, y: regionCenterY, zoom: 1 };
      smoothedTarget = { ...targetCamera };
      camera = { ...targetCamera };
    }

    const cropW = srcRegion.width / camera.zoom;
    const cropH = srcRegion.height / camera.zoom;

    // Strict safety boundaries to eliminate black gaps at video edges
    const minCenterX = srcRegion.x + cropW / 2;
    const maxCenterX = srcRegion.x + srcRegion.width - cropW / 2;
    const minCenterY = srcRegion.y + cropH / 2;
    const maxCenterY = srcRegion.y + srcRegion.height - cropH / 2;

    const safeCenterX = clamp(camera.x, minCenterX, maxCenterX);
    const safeCenterY = clamp(camera.y, minCenterY, maxCenterY);

    const sx = safeCenterX - cropW / 2;
    const sy = safeCenterY - cropH / 2;

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && expectedStreamFullW > 0 && !videoDimensionsKnown) {
      const cx = video.videoWidth / expectedStreamFullW;
      const cy = video.videoHeight / expectedStreamFullH;
      if (Number.isFinite(cx) && Number.isFinite(cy) && cx > 0 && cy > 0) {
        videoCorrectionX = cx;
        videoCorrectionY = cy;
      }
      videoDimensionsKnown = true;
    }

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, sx * videoCorrectionX, sy * videoCorrectionY, cropW * videoCorrectionX, cropH * videoCorrectionY, 0, 0, canvas.width, canvas.height);
    }
    drawCursorOverlay(sx, sy, cropW, cropH, now, dt);

    rafId = requestAnimationFrame(draw);
  }

  const canvasStream = canvas.captureStream(fps);
  sourceStream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));

  const stop = () => {
    stopped = true;
    if (pollTimer) clearInterval(pollTimer);
    if (rafId) cancelAnimationFrame(rafId);
  };

  const ready = (async () => {
    const seeded = await drawInitialFrame();
    const startLiveDrawing = video.play().then(() => {
      lastFrameTime = performance.now();
      pollCursor();
      pollTimer = setInterval(pollCursor, 16); // 60 Hz
      draw();
      return canvasStream;
    });
    if (seeded) {
      startLiveDrawing.catch(() => {});
      return canvasStream;
    }
    return startLiveDrawing;
  })();

  return { stream: canvasStream, ready, stop };
}

function getDisplayBounds(candidate = {}) {
  return candidate.bounds || candidate.displayBounds || null;
}

function deriveFullscreenRegionFromSource(source = {}, displays = []) {
  const sourceDisplayId = source.displayId ?? source.display_id ?? source.display?.id;
  const sourceDisplay = source.display || source.screen || null;
  const matchedDisplay = sourceDisplay || displays.find((display) => {
    if (sourceDisplayId === undefined || sourceDisplayId === null) return false;
    return String(display.id) === String(sourceDisplayId);
  }) || (displays.length === 1 ? displays[0] : null);
  const bounds = getDisplayBounds(source) || getDisplayBounds(matchedDisplay) || source.region?.displayBounds || null;
  if (!bounds) return null;

  const scaleFactor = source.scaleFactor || matchedDisplay?.scaleFactor || source.region?.scaleFactor || 1;
  const pixelSize = source.pixelSize || source.nativeSize || matchedDisplay?.pixelSize || {};
  const pixelWidth = source.pixelWidth || pixelSize.width || Math.round(bounds.width * scaleFactor);
  const pixelHeight = source.pixelHeight || pixelSize.height || Math.round(bounds.height * scaleFactor);

  return {
    x: 0,
    y: 0,
    width: bounds.width,
    height: bounds.height,
    displayBounds: bounds,
    scaleFactor,
    pixelX: 0,
    pixelY: 0,
    pixelWidth,
    pixelHeight,
  };
}

async function getAutoZoomRegion(source = {}, requestedMode = source.mode) {
  const sourceMode = requestedMode || source.mode;
  if (sourceMode === 'region' && source.region) return source.region;
  if (sourceMode !== 'fullscreen') return null;

  let sourceRegion = deriveFullscreenRegionFromSource(source);
  if (!sourceRegion) {
    try {
      const displays = await ipcRenderer.invoke('get-displays');
      sourceRegion = deriveFullscreenRegionFromSource(source, Array.isArray(displays) ? displays : []);
    } catch (error) {
      sourceRegion = null;
    }
  }

  const autoZoomRegion = sourceRegion;
  console.log('[your-project] autoZoomRegion', sourceMode, JSON.stringify(autoZoomRegion));
  if (sourceRegion) return sourceRegion;

  console.warn('[your-project] autoZoom: could not derive fullscreen region from source', JSON.stringify(source));
  return null;
}

function alignRegionToStreamPixels(region, stream) {
  if (!region) return region;
  const settings = stream?.getVideoTracks?.()[0]?.getSettings?.() || {};
  const displayBounds = region.displayBounds;
  if (
    !displayBounds ||
    !Number.isFinite(settings.width) ||
    !Number.isFinite(settings.height) ||
    displayBounds.width <= 0 ||
    displayBounds.height <= 0
  ) {
    return region;
  }

  const scaleX = settings.width / displayBounds.width;
  const scaleY = settings.height / displayBounds.height;
  if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || scaleX <= 0 || scaleY <= 0) return region;

  return {
    ...region,
    scaleFactor: (scaleX + scaleY) / 2,
    pixelX: Math.round(region.x * scaleX),
    pixelY: Math.round(region.y * scaleY),
    pixelWidth: Math.max(2, Math.round(region.width * scaleX)),
    pixelHeight: Math.max(2, Math.round(region.height * scaleY)),
  };
}

async function startRecording(options = {}) {
  if (proRecorder && proRecorder.state !== 'inactive') {
    throw new Error('A screen recording is already in progress');
  }

  proRecordingFormat = options?.format === 'gif' ? 'gif' : 'mp4';
  const mode = options?.mode === 'region' ? 'region' : options?.mode === 'fullscreen' ? 'fullscreen' : 'window';
  const source = await ipcRenderer.invoke('pro-recording-source', {
    mode,
    autoZoom: options?.autoZoom !== false,
    hideDesktopIcons: options?.hideDesktopIcons !== false,
    captureProject: options?.captureProject === true,
    inlinePreview: Boolean(options?.previewVideoId),
  });
  if (!source) throw new Error('Recording canceled');
  let systemAudio = true;
  let rawStream = null;
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Screen recording is unavailable because media capture APIs are not available.');
    }
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('Screen recording is unavailable because MediaRecorder is not available.');
    }

    await ipcRenderer.invoke('pro-recording-prepare', {
      mode: source.mode || mode,
      region: source.mode === 'region' ? source.region : null,
      captureProject: options?.captureProject === true,
    });

    try {
      rawStream = await getDesktopStream(source.id, true);
    } catch (audioError) {
      systemAudio = false;
      rawStream = await getDesktopStream(source.id, false);
    }
    if (rawStream.getAudioTracks().length === 0) systemAudio = false;

    let zoomPipeline = null;
    const shouldCropRegion = mode === 'region' && source.region;
    const streamAlignedRegion = shouldCropRegion ? alignRegionToStreamPixels(source.region, rawStream) : null;
    const autoZoomRegion = shouldCropRegion
      ? streamAlignedRegion
      : (source.autoZoom === false || options?.autoZoom === false ? null : await getAutoZoomRegion(source, mode));
    if (autoZoomRegion) {
      zoomPipeline = createAutoZoomStream(rawStream, autoZoomRegion, {
        autoZoom: shouldCropRegion ? options?.autoZoom !== false && source.autoZoom !== false : true,
      });
      proRecordingStream = await zoomPipeline.ready;
      proRecordingRawStream = rawStream;
      proRecordingZoomStop = zoomPipeline.stop;
    } else {
      proRecordingStream = rawStream;
      proRecordingRawStream = null;
      proRecordingZoomStop = null;
    }

    attachRecordingPreviewStream(null, proRecordingStream);

    const mimeType = getRecordingMimeType();
    proRecordingChunks = [];
    proRecorder = new MediaRecorder(proRecordingStream, {
      mimeType,
      videoBitsPerSecond: 50_000_000,
    });
    proRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) proRecordingChunks.push(event.data);
    };
    proRecorder.start(1000);
    ipcRenderer.invoke('pro-recording-indicator-show', {
      region: source.mode === 'region' ? (streamAlignedRegion || source.region) : null,
      inlinePreview: Boolean(options?.previewVideoId),
    }).catch(() => {});
    return { success: true, pro: true, source, systemAudio, mimeType, inlinePreview: Boolean(options?.previewVideoId) };
  } catch (error) {
    proRecordingZoomStop?.();
    rawStream?.getTracks().forEach((track) => track.stop());
    proRecordingStream?.getTracks().forEach((track) => track.stop());
    proRecordingStream = null;
    proRecordingRawStream = null;
    proRecordingZoomStop = null;
    proRecorder = null;
    proRecordingChunks = [];
    ipcRenderer.invoke('pro-recording-indicator-hide').catch(() => {});
    throw error;
  }
}
function stopRecording(options = {}) {
  return new Promise((resolve, reject) => {
    if (!proRecorder || proRecorder.state === 'inactive') {
      reject(new Error('No screen recording is in progress'));
      return;
    }

    const shouldExportGif = options === true || options?.format === 'gif' || Boolean(options?.gif);
    const shouldDiscard = Boolean(options?.discard);
    proRecorder.onerror = (event) => reject(event.error || new Error('Screen recording failed'));
    proRecorder.onstop = async () => {
      try {
        if (shouldDiscard) {
          await ipcRenderer.invoke('pro-recording-indicator-hide', { skipMainWindowRestore: true });
          resolve({ discarded: true });
          return;
        }
        const blob = new Blob(proRecordingChunks, { type: proRecorder.mimeType || 'video/webm' });
        if (blob.size === 0) {
          throw new Error('Recording did not capture any video data. Please try again.');
        }
        const arrayBuffer = await blob.arrayBuffer();
        await ipcRenderer.invoke('pro-recording-indicator-hide');
        resolve({
          preview: true,
          data: new Uint8Array(arrayBuffer),
          mimeType: blob.type || proRecorder.mimeType || 'video/webm',
          gif: shouldExportGif,
          format: options?.format || proRecordingFormat,
        });
      } catch (error) {
        reject(error);
      } finally {
        ipcRenderer.invoke('pro-recording-indicator-hide', shouldDiscard ? { skipMainWindowRestore: true } : {}).catch(() => {});
        proRecordingZoomStop?.();
        proRecordingRawStream?.getTracks().forEach((track) => track.stop());
        proRecordingStream?.getTracks().forEach((track) => track.stop());
        proRecordingStream = null;
        proRecordingRawStream = null;
        proRecordingZoomStop = null;
        proRecorder = null;
        proRecordingChunks = [];
      }
    };
    if (proRecorder.state === 'recording' && typeof proRecorder.requestData === 'function') {
      proRecorder.requestData();
    }
    proRecorder.stop();
  });
}

// Keep the preload API name stable so existing renderer code and tests keep working.
contextBridge.exposeInMainWorld('projectApi', {

  // Screen capture
  startCapture: (options = {}) => ipcRenderer.invoke('start-capture', options),
  startCaptureWindow: (options = {}) => ipcRenderer.invoke('start-capture-window', options),
  startCaptureFullscreen: (options = {}) => ipcRenderer.invoke('start-capture-fullscreen', options),
  onLoadCapture: (callback) => ipcRenderer.on('load-capture', (_, data) => callback(data)),
  onTriggerCapture: (callback) => ipcRenderer.on('trigger-capture', () => callback()),
  onTriggerCaptureMenu: (callback) => ipcRenderer.on('trigger-capture-menu', (_, options) => callback(options)),
  onTriggerCaptureWindow: (callback) => ipcRenderer.on('trigger-capture-window', () => callback()),
  onTriggerRecordScreen: (callback) => ipcRenderer.on('trigger-record-screen', () => callback()),
  onTriggerCaptureFullscreen: (callback) => ipcRenderer.on('trigger-capture-fullscreen', () => callback()),
  onShortcutCaptureReady: (callback) => ipcRenderer.on('trigger-shortcut-capture-ready', () => callback()),
  onOpenPreferences: (callback) => ipcRenderer.on('open-preferences', () => callback()),
  onToolbarOpenRequested: (callback) => ipcRenderer.on('toolbar-open-requested', () => callback()),
  onCaptureModeStarted: (callback) => ipcRenderer.on('capture-mode-started', () => callback()),
  onCaptureFinished: (callback) => ipcRenderer.on('capture-finished', () => callback()),
  openNativePreferences: () => ipcRenderer.invoke('open-native-preferences'),
  onLoadCaptureData: (callback) => ipcRenderer.on('load-capture-data', (_, data) => callback(data)),
  onRecordingStopRequested: (callback) => ipcRenderer.on('pro-recording-stop-requested', () => callback()),
  onRecordingWindowCloseRequested: (callback) => ipcRenderer.on('pro-recording-window-close-requested', () => callback()),
  confirmRecordingWindowClose: () => ipcRenderer.send('pro-recording-window-close-cleaned-up'),
  onAppWindowCloseRequested: (callback) => ipcRenderer.on('app-window-close-requested', () => callback()),
  confirmAppWindowClose: (payload = {}) => ipcRenderer.send('app-window-close-cleaned-up', payload),
  onSettingsChanged: (callback) => ipcRenderer.on('settings-changed', () => callback()),
  notifySettingsChanged: () => ipcRenderer.send('settings-changed'),
  onAppUpdateState: (callback) => ipcRenderer.on('app-update-state', (_, state) => callback(state)),

  // Capture overlay communication
  onCaptureData: (callback) => ipcRenderer.on('capture-data', (_, data) => callback(data)),
  captureComplete: (imageDataUrl) => ipcRenderer.send('capture-complete', imageDataUrl),
  selectWindowByName: (name) => ipcRenderer.send('window-overlay-select', name),
  captureCancel: () => ipcRenderer.send('capture-cancel'),
  recordingRegionComplete: (region) => ipcRenderer.send('recording-region-complete', region),

  // Window picker fallback
  onWindowSources: (callback) => ipcRenderer.on('window-sources', (_, data) => callback(data)),
  selectWindowSource: (sourceId) => ipcRenderer.send('window-source-select', sourceId),
  cancelWindowSource: () => ipcRenderer.send('window-source-cancel'),

  // Pro capture/recording features
  startRecording,
  stopRecording,
  saveRecording: (payload) => ipcRenderer.invoke('pro-save-recording', payload),
  onSaveRecordingStarted: (callback) => ipcRenderer.on('pro-save-recording-started', () => callback()),
  trimRecording: (payload) => ipcRenderer.invoke('pro-trim-recording', payload),

  // File operations
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (dataUrl) => ipcRenderer.invoke('save-file', dataUrl),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getLicenseState: () => ipcRenderer.invoke('get-license-state'),
  activateLicense: async (email) => {
    const result = await ipcRenderer.invoke('activate-license', email);
    if (!result?.ok) throw new Error(result?.error || 'Activation failed. Please try again.');
    return result.state;
  },
  getAppUpdateState: () => ipcRenderer.invoke('get-app-update-state'),
  checkForAppUpdates: () => ipcRenderer.invoke('check-for-app-updates'),
  downloadAppUpdate: () => ipcRenderer.invoke('download-app-update'),
  installAppUpdate: () => ipcRenderer.invoke('install-app-update'),
  openBuyLicense: () => ipcRenderer.invoke('open-buy-license'),
  openLicenseWindow: () => ipcRenderer.invoke('open-license-window'),
  deactivateLicense: () => ipcRenderer.invoke('deactivate-license'),
  revalidateLicense: () => ipcRenderer.invoke('revalidate-license'),
  onLicenseStatusChanged: (callback) => ipcRenderer.on('license-status-changed', () => callback()),
  chooseDefaultSavePath: (currentPath) => ipcRenderer.invoke('choose-default-save-path', currentPath),
  copyToClipboard: (dataUrl) => ipcRenderer.invoke('copy-to-clipboard', dataUrl),
  readClipboardImage: () => ipcRenderer.invoke('read-clipboard-image'),

  // Window controls
  closeWindow: () => ipcRenderer.invoke('window-close'),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  setWindowMode: (mode, options = {}) => ipcRenderer.invoke('window-set-mode', mode, options),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window-toggle-maximize'),

  // Display info
  getDisplays: () => ipcRenderer.invoke('get-displays'),

  // Platform info
  platform: process.platform,
});
