const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'renderer.js'), 'utf8');
const stylesSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles.css'), 'utf8');
const landingSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const indexSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'index.html'), 'utf8');
const preferencesSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'preferences.html'), 'utf8');
const preferencesScript = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'preferences.js'), 'utf8');
const aboutSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'about.html'), 'utf8');
const licenseSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'license.html'), 'utf8');
const captureOverlaySource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'capture-overlay.html'), 'utf8');
const previewToastSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'preview-toast.html'), 'utf8');
const releaseWorkflowSource = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'release-please.yml'), 'utf8');
const buildWorkflowSource = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'build.yml'), 'utf8');
const legacyMacBuilderSource = fs.readFileSync(path.join(__dirname, '..', 'config', 'electron-builder.legacy-mac.cjs'), 'utf8');
const macAdHocSignSource = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'sign-mac-ad-hoc.js'), 'utf8');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  for (const item of tests) {
    try {
      item.fn();
      console.log(`\x1b[32m✓\x1b[0m ${item.name}`);
    } catch (error) {
      console.error(`✗ ${item.name}`);
      throw error;
    }
  }
}

test('Cursor Smoothing', () => {
const policyStart = preloadSource.indexOf('const streamCursorModes');
const policyEnd = preloadSource.indexOf('function getRecordingMimeType');
const helperStart = preloadSource.indexOf('// Cursor smoothing helpers');
const helperEnd = preloadSource.indexOf('// End cursor smoothing helpers.');
assert.ok(policyStart >= 0 && policyEnd > policyStart, 'preload stream cursor policy helpers were not found');
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'preload cursor smoothing helpers were not found');

function loadPreloadHelpers(platform = 'linux') {
  const sandbox = { module: { exports: {} }, Math, Number, WeakMap, process: { platform } };
  vm.runInNewContext(`
    ${preloadSource.slice(policyStart, policyEnd)}
    ${preloadSource.slice(helperStart, helperEnd)}
    module.exports = { createCursorSmoother, markStreamCursorMode, shouldDrawSyntheticCursor };
  `, sandbox);
  return sandbox.module.exports;
}

const { createCursorSmoother, markStreamCursorMode, shouldDrawSyntheticCursor } = loadPreloadHelpers('linux');

function nearlyEqual(actual, expected, epsilon = 0.001) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} was not within ${epsilon} of ${expected}`);
}

function createStreamWithCursorSetting(cursor) {
  return {
    getVideoTracks() {
      return [{
        getSettings() {
          return cursor ? { cursor } : {};
        },
      }];
    },
  };
}

{
  const stream = createStreamWithCursorSetting('');
  markStreamCursorMode(stream, 'synthetic');
  assert.strictEqual(shouldDrawSyntheticCursor(stream), true);
}

{
  const stream = createStreamWithCursorSetting('never');
  markStreamCursorMode(stream, 'native');
  assert.strictEqual(shouldDrawSyntheticCursor(stream), true);
}

{
  const stream = createStreamWithCursorSetting('always');
  markStreamCursorMode(stream, 'synthetic');
  assert.strictEqual(shouldDrawSyntheticCursor(stream), true);
}

{
  const stream = createStreamWithCursorSetting('');
  markStreamCursorMode(stream, 'native');
  assert.strictEqual(shouldDrawSyntheticCursor(stream), false);
}

{
  const darwinHelpers = loadPreloadHelpers('darwin');
  const stream = createStreamWithCursorSetting('');
  darwinHelpers.markStreamCursorMode(stream, 'synthetic');
  assert.strictEqual(darwinHelpers.shouldDrawSyntheticCursor(stream), false);
}

{
  const darwinHelpers = loadPreloadHelpers('darwin');
  const stream = createStreamWithCursorSetting('');
  darwinHelpers.markStreamCursorMode(stream, 'native');
  assert.strictEqual(darwinHelpers.shouldDrawSyntheticCursor(stream), false);
}

{
  const smoother = createCursorSmoother({ renderDelayMs: 0, easeSpeed: 1000 });
  smoother.pushSample({ x: 0, y: 0, visible: true, time: 0 });
  smoother.pushSample({ x: 100, y: 50, visible: true, time: 100 });

  const sample = smoother.getSampleForFrame(50);
  nearlyEqual(sample.x, 50);
  nearlyEqual(sample.y, 25);
  assert.strictEqual(sample.visible, true);
}

{
  const smoother = createCursorSmoother({ renderDelayMs: 35, easeSpeed: 1000 });
  smoother.pushSample({ x: 10, y: 20, visible: true, time: 0 });
  smoother.pushSample({ x: 110, y: 120, visible: true, time: 100 });

  const sample = smoother.getSampleForFrame(85);
  nearlyEqual(sample.x, 60);
  nearlyEqual(sample.y, 70);
}

{
  const smoother = createCursorSmoother({ renderDelayMs: 0, snapDistance: 500, easeSpeed: 12 });
  smoother.pushSample({ x: 0, y: 0, visible: true, time: 0 });
  const first = smoother.update(0, 1 / 60);
  nearlyEqual(first.x, 0);
  nearlyEqual(first.y, 0);
  assert.strictEqual(first.visible, true);

  smoother.pushSample({ x: 60, y: 0, visible: true, time: 16 });
  const second = smoother.update(16, 1 / 60);
  assert.ok(second.x > 0, 'cursor should move toward the new sample');
  assert.ok(second.x < 60, 'cursor should ease instead of jumping for short moves');
  assert.strictEqual(second.visible, true);
}

{
  const smoother = createCursorSmoother({ renderDelayMs: 0, maxSampleAgeMs: 100 });
  smoother.pushSample({ x: 5, y: 10, visible: true, time: 0 });
  assert.strictEqual(smoother.update(50, 1 / 60).visible, true);
  assert.strictEqual(smoother.update(150, 1 / 60).visible, false);
}

{
  const smoother = createCursorSmoother({ renderDelayMs: 0, sampleLimit: 3 });
  for (let index = 0; index < 6; index += 1) {
    smoother.pushSample({ x: index, y: index, visible: true, time: index });
  }
  assert.deepStrictEqual(Array.from(smoother.samples, (sample) => sample.x), [3, 4, 5]);
}

{
  assert.ok(
    /process\.platform === 'darwin'[\s\S]*app\.commandLine\.appendSwitch\('log-level', '3'\)/.test(mainSource),
    'macOS builds must suppress noisy Chromium GPU EGL terminal logs before Electron initializes',
  );

  assert.ok(
    captureOverlaySource.includes('<div id="instructions" class="hidden"></div>'),
    'capture overlay instructions must be hidden before capture data arrives to avoid shortcut text flash',
  );
  assert.ok(
    /captureMode === 'region' \|\| captureMode === 'record-region'[\s\S]*instructions\.classList\.add\('hidden'\)[\s\S]*instructions\.textContent = ''/.test(captureOverlaySource),
    'region and record-region overlays must not show Esc/instruction text',
  );
  assert.ok(
    /#selection\s*\{[\s\S]*outline:\s*2px solid #f07d20;[\s\S]*background:\s*transparent;/.test(captureOverlaySource),
    'selection chrome must render outside the selected content so overlay crops match recording pixels',
  );
  assert.ok(
    /region\.initialFrameDataUrl = dataUrl;[\s\S]*recordingRegionComplete\(region\)/.test(captureOverlaySource),
    'record-region completion must include a selected screenshot seed for first-frame alignment',
  );
  assert.ok(
    /function cancelCaptureFromKeyboard\(e\)[\s\S]*e\.key !== 'Escape'[\s\S]*isCanceled = true;[\s\S]*isSelecting = false;[\s\S]*window\.projectApi\.captureCancel\(\)/.test(captureOverlaySource) &&
    /window\.addEventListener\('keydown', cancelCaptureFromKeyboard, true\)/.test(captureOverlaySource) &&
    /document\.addEventListener\('keydown', cancelCaptureFromKeyboard, true\)/.test(captureOverlaySource) &&
    /if \(isCanceled \|\| captureMode === 'window' \|\| !isSelecting\) return/.test(captureOverlaySource),
    'Esc must cancel region selection even while the pointer is down and must prevent mouseup completion',
  );
  assert.ok(
    /function cancelActiveCapture\(\) \{[\s\S]*closeCaptureWindows\(\);[\s\S]*recordingRegionSelection/.test(mainSource) &&
    /globalShortcut\.register\('Esc', cancelActiveCapture\)/.test(mainSource) &&
    /globalShortcut\.unregister\('Esc'\)/.test(mainSource) &&
    /win\.webContents\.on\('before-input-event', \(event, input\) => \{[\s\S]*input\.key === 'Escape'[\s\S]*cancelActiveCapture\(\)/.test(mainSource) &&
    /ipcMain\.on\('capture-cancel', cancelActiveCapture\)/.test(mainSource),
    'main process must also cancel active capture on Esc when the overlay renderer is not focused',
  );
  assert.ok(
    /videoBitsPerSecond:\s*50_000_000/.test(preloadSource),
    'screen recorder must request a high video bitrate to preserve screen-detail alignment checks',
  );
  assert.ok(
    /autoZoom:\s*shouldCropRegion\s*\?\s*options\?\.autoZoom !== false && source\.autoZoom !== false\s*:\s*true/.test(preloadSource),
    'region recording must pass the user autozoom setting into the Ken Burns pipeline',
  );
  assert.ok(
    !mainSource.includes("type: process.platform === 'darwin' ? 'panel' : undefined"),
    'recording indicator windows must not use macOS panel type because it emits NSWindow nonactivating panel errors',
  );
  assert.ok(
    !/focusable:\s*false/.test(mainSource),
    'recording overlay windows must not request non-focusable macOS windows because they can become nonactivating panels',
  );
  assert.ok(
    /show:\s*false,[\s\S]*overlayWindow\.showInactive\(\)/.test(mainSource),
    'recording overlay windows should be shown without activation instead of using nonactivating panel styles',
  );
  assert.ok(
    /const shouldShowRegionOverlay = Boolean\(lastRecordingRegion\);/.test(mainSource),
    'region recordings must keep a visible recording overlay on every platform',
  );
  assert.ok(!/process\.platform === 'darwin' && shouldShowRegionOverlay && !options\.inlinePreview[\s\S]*return;/.test(mainSource), 'macOS region recordings must keep the dim overlay and stop controls visible');
  assert.ok(
    /const overlayWindow = new BrowserWindow\(\{[\s\S]*backgroundColor: '#00000000'[\s\S]*fullscreenable: true[\s\S]*enableLargerThanScreen: true/.test(mainSource),
    'recording overlay window must match capture overlay screen coverage so macOS does not offset it below the menu bar',
  );
  assert.ok(
    /overlayWindow\.webContents\.once\('did-finish-load'[\s\S]*overlayWindow\.setBounds\(\{[\s\S]*x: bounds\.x,[\s\S]*y: bounds\.y,[\s\S]*width: bounds\.width,[\s\S]*height: bounds\.height/.test(mainSource),
    'recording overlay must re-apply exact display bounds after load before becoming visible',
  );
  assert.ok(
    /const dimBlocks = regionOnDisplay \?[\s\S]*recording-dim[\s\S]*width:\$\{regionOnDisplay\.left\}px[\s\S]*width:\$\{regionOnDisplay\.right\}px/.test(mainSource),
    'recording overlay must illuminate the selected region by dimming only the outside bands',
  );
  assert.ok(
    /\.dot\s*\{[^}]*background: #ef4444;[^}]*\}/.test(mainSource),
    'stop recording indicator must have a red dot',
  );
  assert.ok(
    /button:focus,[\s\S]*button:focus-visible\s*\{[\s\S]*outline: none;[\s\S]*box-shadow: none;[\s\S]*\}/.test(mainSource),
    'stop recording button must not draw the native focus halo',
  );
  assert.ok(
    !/recording-frame|recording-glow|outline:\s*2px solid rgba\(249, 115, 22/.test(mainSource),
    'recording overlay must not draw orange borders that can misalign or leak into the captured video',
  );
  const recordingDimCss = mainSource.match(/\.recording-dim\s*\{[\s\S]*?\}/)?.[0] || '';
  assert.ok(recordingDimCss && !recordingDimCss.includes('backdrop-filter'), 'recording overlay dim bands must not blur because blur can bleed into the illuminated capture region');
  assert.ok(
    /region: source\.mode === 'region' \? \(streamAlignedRegion \|\| source\.region\) : null/.test(preloadSource),
    'recording overlay must use the same stream-aligned region as the capture crop',
  );
  assert.ok(
    /dialog\.showSaveDialog\(mainWindow,[\s\S]*Save screen recording/.test(mainSource),
    'recording save must show the native save dialog when no default save directory is configured',
  );
  assert.ok(
    /function configuredDefaultSaveDirectory\(\)[\s\S]*fs\.statSync\(settings\.defaultSavePath\)\.isDirectory\(\)/.test(mainSource),
    'configured save paths must only be used when the preference points to an existing directory',
  );
  assert.ok(
    /function uniqueSavePath\(directory, filename\)[\s\S]*while \(fs\.existsSync\(candidate\)\)/.test(mainSource),
    'automatic capture saves must avoid overwriting an existing file in the configured folder',
  );
  assert.ok(
    /ipcMain\.handle\('save-file'[\s\S]*let outputPath = configuredDefaultSavePath\(filename\);[\s\S]*if \(!outputPath\) \{[\s\S]*dialog\.showSaveDialog/.test(mainSource),
    'screenshots must save directly into the configured preferences folder before falling back to the native save dialog',
  );
  assert.ok(
    /ipcMain\.handle\('pro-save-recording'[\s\S]*let outputPath = configuredDefaultSavePath\(filename\);[\s\S]*if \(!outputPath\) \{[\s\S]*Save screen recording/.test(mainSource),
    'screen recordings must save directly into the configured preferences folder before falling back to the native save dialog',
  );
  assert.ok(
    /function autoSaveCaptureDataUrl\(dataUrl, captureMode = 'screenshot'[\s\S]*configuredDefaultSavePath\(`your-project-\$\{captureMode\}-\$\{timestamp\}\$\{suffix\}\.png`\)[\s\S]*fs\.writeFileSync\(outputPath, dataUrlToImageBuffer\(dataUrl\)\)/.test(mainSource),
    'capture actions must be able to save PNG screenshots directly into the configured preferences folder',
  );
  assert.ok(
    /function autoSaveCaptureData\(captureData, captureMode = 'screenshot'\)[\s\S]*captureData\.type === 'single'[\s\S]*orderedScreens[\s\S]*autoSaveCaptureDataUrl\(screenData\.dataUrl, captureMode, timestamp, `-\$\{index \+ 1\}`\)/.test(mainSource),
    'fullscreen capture autosave must support both single-screen and multi-screen capture data',
  );
  assert.ok(
    /setWindowMode: \(mode, options = \{\}\) => ipcRenderer\.invoke\('window-set-mode', mode, options\)/.test(preloadSource),
    'window mode changes must support forcing the hidden recording window visible for preview',
  );
  assert.ok(
    /setAppWindowMode\('editor', \{ show: true \}\)/.test(rendererSource),
    'recording preview must reopen the app in editor mode instead of leaving the window hidden',
  );
  assert.ok(
    /discardRecordingPreview\(\{ silent: true, keepWindowMode: true \}\)/.test(rendererSource),
    'recording preview replacement must not race the window back to toolbar mode',
  );
  assert.ok(
    !rendererSource.slice(
      rendererSource.indexOf('async function saveRecordingPreview()'),
      rendererSource.indexOf('function setRecordingPreviewFormat'),
    ).includes('discardRecordingPreview'),
    'saving a recording must keep the preview visible and steady in editor mode',
  );
  assert.ok(
    /function applyEditorWindowMode[\s\S]*mainWindow\.setContentProtection\(false\)/.test(mainSource),
    'returning to editor mode must remove recording content protection so preview and dialogs are visible',
  );
  assert.ok(
    /function applyToolbarWindowMode[\s\S]*mainWindow\.setContentProtection\(false\)/.test(mainSource),
    'returning to toolbar mode must remove recording content protection',
  );
}

{
  const clearCanvasMatch = rendererSource.match(/function clearCanvas\(\) \{[\s\S]*?\n\}/);
  assert.ok(clearCanvasMatch, 'clearCanvas function was not found');
  assert.ok(!clearCanvasMatch[0].includes('showToast'), 'clearCanvas must not show a toast over the floating pill');
}

{
  assert.ok(mainSource.includes('const TRIAL_DAYS = 30;'), 'main process must keep the 30-day trial configuration');
  assert.ok(mainSource.includes('const LICENSE_CHECK_INTERVAL_DAYS = 7;'), 'main process must keep the 7-day license validation interval');
  assert.ok(mainSource.includes("ipcMain.handle('activate-license'"), 'main process must expose license activation IPC');
  assert.ok(preloadSource.includes("getLicenseState: () => ipcRenderer.invoke('get-license-state')"), 'preload must expose license state');
  assert.ok(/activateLicense:\s*async\s*\(email\)\s*=>[\s\S]*ipcRenderer\.invoke\('activate-license', email\)/.test(preloadSource), 'preload must expose license activation');
  assert.ok(licenseSource.includes('id="l-buy"'), 'license window must include the buy button');
  assert.ok(licenseSource.includes('id="l-activate-btn"'), 'license window must include the activate button');
  assert.ok(rendererSource.includes('refreshLicenseState();'), 'renderer must check trial/license state on startup');
  assert.ok(!indexSource.includes('pro-feature'), 'recording button must not keep old pro feature styling hooks');
  assert.ok(!stylesSource.includes('pro-feature'), 'styles must not keep old pro feature hooks');
  assert.ok(!stylesSource.includes('pro-badge'), 'styles must not keep old pro badges');
  assert.strictEqual(packageJson.dependencies['electron-updater'], '6.6.2', 'runtime dependencies must include electron-updater');
  assert.deepStrictEqual(packageJson.build.publish?.[0], {
    provider: 'github',
    owner: 'your-github-username',
    repo: 'your-project',
  }, 'electron-builder must publish update metadata to GitHub releases');
  assert.ok(!Object.prototype.hasOwnProperty.call(packageJson.build.mac, 'identity'), 'macOS builds must allow Developer ID signing when a certificate is configured');
  assert.strictEqual(packageJson.build.afterSign, 'scripts/sign-mac-ad-hoc.js', 'macOS builds must run the signing/notarization hook after packaging');
  assert.strictEqual(packageJson.devDependencies['@electron/notarize'], '2.5.0', 'macOS builds must include the notarization helper');
  assert.ok(/context\.electronPlatformName !== 'darwin'/.test(macAdHocSignSource), 'mac signing hook must only run for macOS builds');
  assert.ok(/function hasNotarizationCredentials\(\)[\s\S]*APPLE_ID[\s\S]*APPLE_APP_SPECIFIC_PASSWORD[\s\S]*APPLE_TEAM_ID/.test(macAdHocSignSource), 'mac signing hook must require Apple notarization credentials');
  assert.ok(/notarize\(\{[\s\S]*appBundleId: appInfo\.id[\s\S]*appPath[\s\S]*teamId: process\.env\.APPLE_TEAM_ID/.test(macAdHocSignSource), 'mac signing hook must submit Developer ID signed apps for Apple notarization');
  assert.ok(/'--identifier'[\s\S]*appInfo\.id/.test(macAdHocSignSource), 'mac ad-hoc fallback must bind the app bundle identifier into the signature');
  assert.ok(/let autoUpdater = null;[\s\S]*require\('electron-updater'\)/.test(mainSource), 'main process must load electron-updater');
  assert.ok(/function setupAutoUpdater\(\)/.test(mainSource), 'main process must configure the auto updater');
  assert.ok(/autoUpdater\.autoDownload = false/.test(mainSource), 'updates must require an explicit user download action');
  assert.ok(/autoUpdater\.quitAndInstall\(false, true\)/.test(mainSource), 'downloaded updates must install through the updater without reinstalling manually');
  assert.ok(/process\.platform === 'win32'[\s\S]*return false/.test(mainSource), 'portable Windows builds must not pretend to support in-app updates');
  assert.ok(mainSource.includes("ipcMain.handle('check-for-app-updates'"), 'main process must expose update checks');
  assert.ok(mainSource.includes("ipcMain.handle('download-app-update'"), 'main process must expose update downloads');
  assert.ok(mainSource.includes("ipcMain.handle('install-app-update'"), 'main process must expose update installation');
  assert.ok(preloadSource.includes("getAppUpdateState: () => ipcRenderer.invoke('get-app-update-state')"), 'preload must expose update state');
  assert.ok(preloadSource.includes("checkForAppUpdates: () => ipcRenderer.invoke('check-for-app-updates')"), 'preload must expose update checks');
  assert.ok(preloadSource.includes("downloadAppUpdate: () => ipcRenderer.invoke('download-app-update')"), 'preload must expose update downloads');
  assert.ok(preloadSource.includes("installAppUpdate: () => ipcRenderer.invoke('install-app-update')"), 'preload must expose update installation');
  assert.ok(
    /function currentMacOSVersion\(\)[\s\S]*Mac OS X/.test(landingSource) &&
    /function isLegacyMacOS\(version = currentMacOSVersion\(\)\)[\s\S]*version\.major === 10 && version\.minor < 15/.test(landingSource) &&
    /function preferredMacAsset\(assets = \[\]\)[\s\S]*legacy[\s\S]*universal\|arm64\|mac[\s\S]*return isLegacyMacOS\(\) \? \(legacy \|\| fallback\) : \(modern \|\| fallback \|\| legacy \|\| null\)/.test(landingSource),
    'landing page must pick the macOS DMG that matches the visitor OS version',
  );
  assert.ok(!preferencesSource.includes('check-update-setting'), 'preferences must not include update controls');
  assert.ok(!preferencesScript.includes('renderUpdateState'), 'preferences script must not own update state rendering');
  assert.ok(!mainSource.includes("label: 'Check for Updates...'"), 'tray menu must not contain a check for updates item');
  assert.ok(!mainSource.includes('In-app updates are available'), 'updater must not show explanatory unsupported copy');
  assert.ok(!mainSource.includes("message: ''"), 'updater states must not leave the About status blank');
  assert.ok(mainSource.includes("message: 'Up to date'"), 'updater must use concise up-to-date copy');
  assert.ok(/function isMissingUpdateMetadataError\(error\)[\s\S]*message\.includes\('404'\)[\s\S]*latest-mac\.yml/.test(mainSource), 'updater must detect missing GitHub release metadata without showing raw HTTP errors');
  assert.ok(/function updateCheckFailureState\(error, message = 'Update check failed\.'\)[\s\S]*status: 'error'[\s\S]*message: 'Update metadata unavailable\.'[\s\S]*error: 'Update metadata unavailable\.'/.test(mainSource), 'missing update metadata must render as an actionable updater error');
  assert.ok(/const hasExplicitError = Object\.prototype\.hasOwnProperty\.call\(nextState, 'error'\);[\s\S]*nextState\.status !== 'error' \? \{ error: '' \}/.test(mainSource), 'non-error update states must clear stale error text');
  assert.ok(aboutSource.includes("state.error || state.message || 'Up to date'"), 'about page must fall back to up-to-date copy');
  assert.ok(/message: info\?\.version \? `Version \$\{info\.version\} available` : 'Update available'/.test(mainSource), 'updater must show only the available version when present');
  assert.ok(aboutSource.includes('id="update-app"'), 'about page must include a single update action button');
  assert.ok(!aboutSource.includes('id="check-update"'), 'about page must not include a persistent check button');
  assert.ok(!aboutSource.includes('id="download-update"'), 'about page must not include a separate download button');
  assert.ok(!aboutSource.includes('id="install-update"'), 'about page must not include a separate install button');
  assert.ok(/updateApp\.hidden = !canDownload && status !== 'downloading' && !canInstall/.test(aboutSource), 'about page must hide the action button when there is no update');
  assert.ok(/invokeUpdate\('check-for-app-updates'/.test(aboutSource), 'about page must check updates automatically');
  assert.ok(/state\?\.supported !== false && \(state\?\.status === 'idle' \|\| !state\?\.status\)/.test(aboutSource), 'about page must check for updates even when the cached status says up to date');
  assert.ok(!/state\?\.message !== 'Up to date'/.test(aboutSource), 'about page must not skip update checks just because the initial message says up to date');
  assert.ok(/function renderUpdateState\(state = \{\}\)/.test(aboutSource), 'about page must render update state');
  assert.ok(aboutSource.includes("ipcRenderer.on('app-update-state'"), 'about page must subscribe to update state events');
  assert.ok(/let aboutWindow = null;/.test(mainSource) && /\[mainWindow, preferencesWindow, aboutWindow\]/.test(mainSource), 'main process must send update state to the about window');
  assert.ok(releaseWorkflowSource.includes('dist/**/*.yml'), 'release workflow must upload updater metadata files');
  assert.ok(releaseWorkflowSource.includes('dist/**/*.blockmap'), 'release workflow must upload updater blockmaps');
  assert.ok(/-name "\*\.yml"[\s\S]*-name "\*\.blockmap"/.test(releaseWorkflowSource), 'release workflow must collect updater metadata for GitHub Releases');
  assert.ok(buildWorkflowSource.includes('dist/**/*.yml'), 'build workflow artifacts must include updater metadata files');
  assert.ok(/const \{ publish: _publish, \.\.\.buildWithoutPublish \} = build;/.test(legacyMacBuilderSource), 'legacy mac build must not inherit release publishing metadata');
  assert.ok(legacyMacBuilderSource.includes("output: 'dist/legacy'"), 'legacy mac build must not overwrite modern mac updater metadata');
}

{
  assert.ok(
    preloadSource.includes("onToolbarOpenRequested: (callback) => ipcRenderer.on('toolbar-open-requested'"),
    'preload must expose the menu-only toolbar restore event',
  );
  assert.ok(
    /\.toast\s*\{[\s\S]*box-shadow: none;[\s\S]*outline: none;/.test(previewToastSource) &&
    /\.toast:focus,[\s\S]*box-shadow: none;/.test(previewToastSource),
    'capture preview toast must not draw a halo',
  );
  assert.ok(
    /\.toast:not\(\.ready\)\s*\{[\s\S]*visibility: hidden;[\s\S]*\}/.test(previewToastSource) &&
    /preview\.addEventListener\('load', showReadyToast, \{ once: true \}\)/.test(previewToastSource) &&
    /toast\.classList\.add\('ready'\)/.test(previewToastSource),
    'capture preview toast must stay hidden until the screenshot image is loaded',
  );
  assert.ok(/const AUTO_HIDE_DELAYS = \[[^\]]*2000/.test(rendererSource), 'toolbar auto-hide delay must include 2 seconds');
  assert.ok(rendererSource.includes("toolbar.classList.add('auto-hidden')"), 'toolbar must use the auto-hidden animation state');
  assert.ok(rendererSource.includes('const finishDragging = () =>'), 'toolbar drag completion must be shared across release paths');
  assert.ok(rendererSource.includes("window.addEventListener(eventName, finishDragging, true)"), 'toolbar drag completion must survive native window drags');
  assert.ok(
    /if \(dragging\) \{\s*scheduleAutoHide\(\);\s*return;\s*\}/.test(rendererSource),
    'toolbar auto-hide must reschedule while an active drag is still in progress',
  );
  assert.ok(rendererSource.includes('const hideAfterAnimationMs = 340'), 'toolbar hide delay must match the pill disappear animation');
  assert.ok(!rendererSource.includes('past-threshold'), 'manual drag-threshold hide behavior must be removed');
  assert.ok(/\.toolbar\.dragging\s*\{[\s\S]*?cursor: all-scroll;/.test(stylesSource), 'all-scroll cursor must be scoped to explicit toolbar drags');
  assert.ok(
    /\.toolbar\.auto-hidden\s*\{[\s\S]*?opacity: 0;[\s\S]*?transform: translateX\(-50%\) translateY\(-6px\) scale\(0\.97\);[\s\S]*?pointer-events: none;[\s\S]*?\}/.test(stylesSource),
    'toolbar hide animation must mirror the appearing pill transform',
  );
  assert.ok(!/\.toolbar\.auto-hidden\s*\{[\s\S]*?filter:/.test(stylesSource), 'toolbar hide animation must not use the old blur/shrink treatment');
  assert.ok(!/\.toolbar:active\s*\{[\s\S]*?cursor: all-scroll;/.test(stylesSource), 'toolbar active state must not show all-scroll on button presses');
}

{
  assert.ok(rendererSource.includes('currentTool: null'), 'editor must not default to a selected annotation tool');
  assert.ok(rendererSource.includes('clearToolSelection();'), 'loading an image must clear toolbar tool selection');
  assert.ok(!rendererSource.includes('autoSelectRect'), 'captured images must not auto-select the rectangle tool');
  assert.ok(/state\.selectedAnnotationIndex = -1;\s*render\(\);\s*updateStatus\(\);/.test(rendererSource), 'new annotations must not stay selected after drawing');
  assert.ok(
    /function selectColor\(color\) \{[\s\S]*?if \(state\.selectedAnnotationIndex >= 0\)/.test(rendererSource),
    'color changes must apply to the selected annotation regardless of the active tool',
  );
  assert.ok(!indexSource.includes('id="stroke-current" data-tooltip='), 'line weight control must not show the app tooltip');
  assert.ok(indexSource.includes('<span class="status-tool" id="status-tool">Ready</span>'), 'status bar must not start on Rectangle');
  assert.ok(/\.toolbar-btn\s*\{[\s\S]*?width: 36px;[\s\S]*?height: 36px;/.test(stylesSource), 'editor toolbar buttons must match the main pillbar size');
  assert.ok(/\.toolbar-btn svg\s*\{\s*width: 18px;\s*height: 18px;\s*\}/.test(stylesSource), 'editor toolbar icons must match the main pillbar icon size');
  assert.ok(/\.color-swatch\s*\{[\s\S]*?-webkit-app-region: no-drag;/.test(stylesSource), 'color swatches must be clickable inside the draggable toolbar');
}

});

test('Recording Features', () => {
  assert.ok(
    preloadSource.includes('function createAutoZoomStream(sourceStream, region, options = {})'),
    'recording must expose a configurable Ken Burns autozoom stream pipeline',
  );

  assert.ok(
    /const enableAutoZoom = options\.autoZoom !== false/.test(preloadSource),
    'Ken Burns pipeline must honor the autozoom option',
  );

  assert.ok(
    /autoZoom:\s*shouldCropRegion\s*\?\s*options\?\.autoZoom !== false && source\.autoZoom !== false\s*:\s*true/.test(preloadSource),
    'region recordings must pass the saved autozoom setting into the Ken Burns stream',
  );

  assert.ok(
    /const autoZoomRegion = shouldCropRegion\s*\?\s*streamAlignedRegion\s*:\s*\(source\.autoZoom === false \|\| options\?\.autoZoom === false \? null : await getAutoZoomRegion\(source, mode\)\)/.test(preloadSource),
    'region recordings must always route through the canvas stream so the selected crop can be animated',
  );

  assert.ok(
    /zoomPipeline = createAutoZoomStream\(rawStream, autoZoomRegion, \{\s*autoZoom: shouldCropRegion \? options\?\.autoZoom !== false && source\.autoZoom !== false : true,\s*\}\)/.test(preloadSource),
    'recording startup must create the Ken Burns pipeline with autozoom enabled for region recordings unless the user turns it off',
  );

  assert.ok(
    /const enableAutoZoom = options\.autoZoom !== false[\s\S]*if \(enableAutoZoom\) \{[\s\S]*updateStateMachine\(now\)/.test(preloadSource),
    'Ken Burns frame loop must drive the autozoom state machine when enabled',
  );

  assert.ok(
    /canvas\.captureStream\(fps\)/.test(preloadSource),
    'Ken Burns rendering must be captured from the transformed canvas stream',
  );

  assert.ok(
    /startRecordingWithFormat\(state\.recordingSettings\.format, 'region'\)/.test(rendererSource),
    'record button must start the region recording flow by default',
  );

  assert.ok(
    /inlinePreview: Boolean\(options\?\.previewVideoId\)/.test(preloadSource) &&
    /if \(started\.inlinePreview\) \{[\s\S]*showLiveRecordingPreview\(started, normalizedFormat\);[\s\S]*\} else \{[\s\S]*discardRecordingPreview\(\{ silent: true, keepWindowMode: true \}\)/.test(rendererSource),
    'normal desktop recordings must not switch the hidden app window into live preview/editor mode while recording',
  );

  assert.ok(
    /if \(options\.show\) \{[\s\S]*if \(recordingInProgress\) \{[\s\S]*mainWindow\.hide\(\);[\s\S]*return;[\s\S]*\}/.test(mainSource) &&
    /function showMainWindowForCurrentMode\(\) \{[\s\S]*if \(recordingInProgress && mainWindow && !mainWindow\.isDestroyed\(\)\) \{[\s\S]*mainWindow\.hide\(\);[\s\S]*return;[\s\S]*\}/.test(mainSource),
    'main process must refuse to show the app window while a recording is active',
  );

  assert.ok(
    /autoZoom:\s*mode === 'region' \? state\.recordingSettings\.autoZoom : false/.test(rendererSource),
    'renderer must pass the user autozoom setting when starting region recordings',
  );

  assert.ok(
    /ipcRenderer\.invoke\('pro-recording-source', \{[\s\S]*captureProject:\s*options\?\.captureProject === true/.test(preloadSource),
    'recording source selection must receive the Your Project capture preference before region selection starts',
  );

  assert.ok(
    /if \(mode !== 'record-region' && options\.showToolbar !== false && mainWindow && !mainWindow\.isDestroyed\(\)\) \{[\s\S]*showWindowInactiveOnMac\(mainWindow\)/.test(mainSource),
    'capture overlays must lift the Your Project toolbar only when the caller allows it',
  );
  assert.ok(
    /\.\.\.\(process\.platform === 'darwin' \? \{ acceptFirstMouse: true \} : \{\}\)/.test(mainSource) &&
    /if \(process\.platform === 'darwin'\) win\.showInactive\(\);[\s\S]*else win\.show\(\);/.test(mainSource),
    'macOS capture overlays must show without activating Your Project or switching Spaces',
  );

  assert.ok(
    /pendingCaptureReturnMode = returnMode === 'editor' \? 'editor' : null/.test(mainSource) &&
    /createCaptureOverlays\(captureData, 'region', \[\], \{ showToolbar: options\?\.showToolbar !== false \}\)/.test(mainSource),
    'global shortcut captures from editor mode must not force the window into toolbar mode while selecting a region',
  );

  assert.ok(
    /const returnMode = pendingCaptureReturnMode;[\s\S]*pendingCaptureReturnMode = null;[\s\S]*if \(returnMode === 'editor'\) applyEditorWindowMode\(\{ show: true \}\);[\s\S]*else applyToolbarWindowMode\(\{ show: true \}\);/.test(mainSource),
    'region capture completion must restore editor mode when capture started from editor mode',
  );

  assert.ok(
    /Do not show Your Project here:[\s\S]*mainWindow\.isVisible\(\)[\s\S]*process\.platform !== 'darwin'/.test(mainSource),
    'recording prepare must not re-show Your Project after region selection completes on macOS',
  );

  assert.ok(
    /recordingInProgress = true;[\s\S]*showRecordingIndicator/.test(mainSource) &&
    /recordingInProgress = false;[\s\S]*hideRecordingIndicator/.test(mainSource) &&
    /if \(recordingInProgress\) \{[\s\S]*pro-recording-stop-requested/.test(mainSource),
    'global capture shortcut must stop an active hidden macOS region recording instead of starting a new capture',
  );

  assert.ok(
    /mainWindow\.on\('close', \(event\) => \{[\s\S]*requestRecordingCleanupBeforeMainWindowClose\(event\)/.test(mainSource) &&
    /pro-recording-window-close-requested/.test(mainSource) &&
    /pro-recording-window-close-cleaned-up/.test(mainSource) &&
    /hideRecordingIndicator\(\{ skipMainWindowRestore: true \}\)/.test(mainSource),
    'closing the main window during recording must discard-stop and clean indicator overlays without reopening the app',
  );

  assert.ok(
    /requestRendererCleanupBeforeMainWindowClose\(event\)/.test(mainSource) &&
    /app-window-close-requested/.test(mainSource) &&
    /app-window-close-cleaned-up/.test(mainSource) &&
    /onAppWindowCloseRequested/.test(preloadSource) &&
    /confirmAppWindowClose/.test(preloadSource) &&
    /function prepareForAppWindowClose\(\)/.test(rendererSource) &&
    /let handled = false;[\s\S]*if \(state\.recordingPreview\) \{[\s\S]*clearTimeline\(\);[\s\S]*discardRecordingPreview\(\{ silent: true \}\);[\s\S]*handled = true;/.test(rendererSource) &&
    /confirmAppWindowClose\?\.\(\{ handled \}\)/.test(rendererSource) &&
    /if \(payload\?\.handled\) \{[\s\S]*pendingAppWindowClose = false;[\s\S]*return;[\s\S]*\}/.test(mainSource),
    'red semaphore close must behave like Discard for an open recording preview instead of closing the native window',
  );

  assert.ok(
    /const shouldDiscard = Boolean\(options\?\.discard\)/.test(preloadSource) &&
    /if \(shouldDiscard\) \{[\s\S]*pro-recording-indicator-hide', \{ skipMainWindowRestore: true \}[\s\S]*resolve\(\{ discarded: true \}\)/.test(preloadSource) &&
    /onRecordingWindowCloseRequested/.test(preloadSource) &&
    /confirmRecordingWindowClose/.test(preloadSource) &&
    /ipcMain\.handle\('pro-recording-indicator-hide', async \(event, payload = \{\}\)[\s\S]*skipMainWindowRestore: Boolean\(payload\?\.skipMainWindowRestore\)/.test(mainSource) &&
    /async function stopRecordingForWindowClose\(\)/.test(rendererSource) &&
    /window\.projectApi\.stopRecording\(\{ discard: true \}\)/.test(rendererSource),
    'renderer recorder cleanup must support discarding an active recording when the app window closes',
  );

  assert.ok(
    /function getRecordingControlsBounds\(targetDisplay, controlSize\)/.test(mainSource) &&
    /const candidates = \[[\s\S]*name: 'below'[\s\S]*name: 'above'[\s\S]*name: 'right'[\s\S]*name: 'left'/.test(mainSource) &&
    /!rectsOverlap\(rect, region, margin\)/.test(mainSource) &&
    /const controlsBounds = getRecordingControlsBounds\(targetDisplay, \{ width: controlWidth, height: controlHeight \}\)/.test(mainSource),
    'stop recording controls must be placed outside the selected region whenever display space allows',
  );

  assert.ok(
    /TRAY_CAPTURE_SHORTCUTS = \{[\s\S]*captureRegion: \{ accelerator: 'Command\+Shift\+S', key: 'S' \}[\s\S]*captureWindow: \{ accelerator: 'Command\+Shift\+W', key: 'W' \}[\s\S]*captureFullscreen: \{ accelerator: 'Command\+Shift\+F', key: 'F' \}[\s\S]*recordScreen: \{ accelerator: 'Command\+Shift\+R', key: 'R' \}/.test(mainSource),
    'tray capture actions must advertise shortcuts for region, window, fullscreen, and record',
  );

  assert.ok(
    /label: 'Capture Region', accelerator: TRAY_CAPTURE_SHORTCUTS\.captureRegion\.accelerator/.test(mainSource) &&
    /label: 'Capture Window', accelerator: TRAY_CAPTURE_SHORTCUTS\.captureWindow\.accelerator/.test(mainSource) &&
    /label: 'Capture Fullscreen', accelerator: TRAY_CAPTURE_SHORTCUTS\.captureFullscreen\.accelerator/.test(mainSource) &&
    /label: 'Record Screen', accelerator: TRAY_CAPTURE_SHORTCUTS\.recordScreen\.accelerator/.test(mainSource),
    'tray capture shortcuts must use native menu accelerators so the shortcut column aligns',
  );

  assert.ok(
    /function shortcutAcceleratorsForKey\(key\) \{[\s\S]*process\.platform === 'darwin'[\s\S]*`Command\+Shift\+\$\{key\}`[\s\S]*`Control\+Shift\+\$\{key\}`[\s\S]*`Control\+Shift\+\$\{key\}`/.test(mainSource) &&
    /shortcutActions\.flatMap[\s\S]*globalShortcut\.register\(accelerator/.test(mainSource),
    'global capture shortcuts must use Cmd+Shift on macOS and Ctrl+Shift on Windows/Linux',
  );
  assert.ok(
    /async function captureWindow\(options = \{\}\)/.test(mainSource) &&
    /ipcMain\.handle\('start-capture-window', async \(event, options = \{\}\) => captureWindow\(options\)\)/.test(mainSource) &&
    /captureWindow\(\{[\s\S]*showToolbar: false[\s\S]*\}\)/.test(mainSource),
    'global window capture shortcut must use the main-process capture path without activating the renderer window',
  );
  assert.ok(
    /async function captureFullscreen\(options = \{\}\)/.test(mainSource) &&
    /ipcMain\.handle\('start-capture-fullscreen', async \(event, options = \{\}\) => captureFullscreen\(options\)\)/.test(mainSource) &&
    /captureFullscreen\(\{[\s\S]*showToolbar: false[\s\S]*\}\)/.test(mainSource),
    'global fullscreen capture shortcut must use the main-process capture path without activating the renderer window',
  );
  assert.ok(
    /async function captureFullscreen\(options = \{\}\)[\s\S]*copyCaptureDataToClipboard\(captureData\);[\s\S]*autoSaveCaptureData\(captureData, 'fullscreen'\);[\s\S]*triggerPreviewToast\(captureData\)/.test(mainSource),
    'fullscreen capture actions must autosave to the configured preferences folder after executing',
  );
  assert.ok(
    /ipcMain\.on\('capture-complete'[\s\S]*copyDataUrlToClipboard\(imageDataUrl\);[\s\S]*autoSaveCaptureDataUrl\(imageDataUrl, 'region'\);[\s\S]*triggerPreviewToast\(\{ dataUrl: imageDataUrl, captureMode: 'region' \}\)/.test(mainSource),
    'region capture actions must autosave to the configured preferences folder after executing',
  );
  assert.ok(
    /async function captureNativeMacWindow\(\)[\s\S]*copyDataUrlToClipboard\(dataUrl\);[\s\S]*autoSaveCaptureDataUrl\(dataUrl, 'window'\);[\s\S]*triggerPreviewToast\(\{[\s\S]*captureMode: 'window'/.test(mainSource) &&
    /ipcMain\.on\('window-overlay-select'[\s\S]*copyDataUrlToClipboard\(dataUrl\);[\s\S]*autoSaveCaptureDataUrl\(dataUrl, 'window'\);[\s\S]*triggerPreviewToast\(\{ dataUrl, captureMode: 'window' \}\)/.test(mainSource),
    'window capture actions must autosave to the configured preferences folder after executing',
  );
  assert.ok(
    !/\{ \.\.\.TRAY_CAPTURE_SHORTCUTS\.captureWindow, run: \(\) => sendShortcutTriggerToRenderer\('trigger-capture-window'\) \}/.test(mainSource) &&
    !/\{ \.\.\.TRAY_CAPTURE_SHORTCUTS\.captureFullscreen, run: \(\) => sendShortcutTriggerToRenderer\('trigger-capture-fullscreen'\) \}/.test(mainSource),
    'global screenshot shortcuts must not bounce through renderer events that can switch macOS Spaces',
  );

  assert.ok(
    !/rememberMacRecordingReturnApp|restoreMacRecordingReturnApp|pro-recording-restore-frontmost-app/.test(mainSource) &&
    !/pro-recording-restore-frontmost-app/.test(preloadSource),
    'recording must not reopen the previous frontmost app because that can pull Chrome over the desktop',
  );

  assert.ok(
    /window\.projectApi\.onTriggerRecordScreen\(\(event\) => onRecordButtonClick\(event\)\)/.test(rendererSource),
    'record screen menu trigger must toggle recording when a recording is already active',
  );

  assert.ok(
    /captureProject:\s*false/.test(mainSource) &&
    /captureProject:\s*typeof candidate\.captureProject === 'boolean' \? candidate\.captureProject : DEFAULT_SETTINGS\.captureProject/.test(mainSource),
    'main process settings must persist whether Your Project windows are capturable',
  );

  assert.ok(
    /window\.projectApi\.startCapture\(\{[\s\S]*captureProject:\s*state\.recordingSettings\.captureProject[\s\S]*\}\)/.test(rendererSource) &&
    /window\.projectApi\.startCaptureWindow\(\{[\s\S]*captureProject:\s*state\.recordingSettings\.captureProject[\s\S]*\}\)/.test(rendererSource) &&
    /window\.projectApi\.startCaptureFullscreen\(\{[\s\S]*captureProject:\s*state\.recordingSettings\.captureProject[\s\S]*\}\)/.test(rendererSource),
    'screenshot capture modes must pass the Your Project capture preference to main',
  );

  assert.ok(
    /window\.projectApi\.saveSettings\(\{[\s\S]*captureProject:\s*state\.recordingSettings\.captureProject[\s\S]*\}\)/.test(rendererSource) &&
    /window\.projectApi\.saveSettings\(\{[\s\S]*captureProject:\s*settings\.captureProject[\s\S]*\}\)/.test(preferencesScript),
    'both preferences surfaces must save the Your Project capture preference to main settings',
  );

  assert.ok(
    /function shouldCaptureProject\(options = \{\}\) \{[\s\S]*return options\?\.captureProject === true/.test(mainSource) &&
    /await hideProjectWindowsBeforeCapture\(options\);[\s\S]*captureAllScreens\(\)/.test(mainSource) &&
    /setProjectWindowsContentProtection\(false\)/.test(mainSource),
    'capture must hide Your Project windows when disabled and clear content protection when enabled',
  );

  assert.ok(
    /async function canReadMacScreenCapture\(\)[\s\S]*desktopCapturer\.getSources\(\{[\s\S]*types: \['screen'\][\s\S]*thumbnailSize: \{ width: 1, height: 1 \}[\s\S]*sources\.some\(\(source\) => source\?\.thumbnail && !source\.thumbnail\.isEmpty\(\)\)/.test(mainSource) &&
    /if \(await canReadMacScreenCapture\(\)\) return true;/.test(mainSource),
    'macOS screen recording gate must trust a real capturer probe when TCC status is stale',
  );

  assert.ok(
    /windowPickerSources = windowSources\.filter\(s => s && s\.name && \(includeProject \|\| !isProjectWindowSource\(s\)\)\)/.test(mainSource) &&
    /filterProjectWindowBounds\(getVisibleWindowBounds\(\), includeProject\)/.test(mainSource),
    'window capture picker must include or filter Your Project windows based on the preference',
  );

  assert.ok(
    /await createCaptureOverlays\(captureData, 'window', winBounds, options\)/.test(mainSource),
    'window capture overlays must receive capture options so the toolbar pill stays hidden when Your Project capture is disabled',
  );

  assert.ok(
    /async function captureNativeMacWindow\(\)[\s\S]*finally \{[\s\S]*notifyRendererCaptureFinished\(\);[\s\S]*if \(!completed && mainWindow && !mainWindow\.isVisible\(\)\) showMainWindowForCurrentMode\(\);[\s\S]*\}/.test(mainSource),
    'native macOS window capture must clear renderer capture mode so pillbar auto-hide resumes',
  );

  assert.ok(
    /function applyToolbarWindowChrome\(\)[\s\S]*setWindowButtonVisibility\(false\)[\s\S]*setVibrancy\(null\)[\s\S]*setBackgroundColor\('#00000000'\)[\s\S]*setHasShadow\(false\)/.test(mainSource) &&
    /function createMainWindow\(focusOnReady = false\) \{[\s\S]*mainWindowMode = 'toolbar';[\s\S]*applyToolbarWindowChrome\(\);[\s\S]*mainWindow\.on\('closed', \(\) => \{[\s\S]*mainWindowMode = 'toolbar';/.test(mainSource),
    'main window must always recreate as a transparent frameless toolbar after being closed from editor mode',
  );

  const codeSurfaces = [
    ['src/preload.js', preloadSource],
    ['src/renderer/renderer.js', rendererSource],
    ['src/renderer/index.html', indexSource],
    ['src/renderer/preferences.html', preferencesSource],
    ['src/renderer/preferences.js', preferencesScript],
  ];
  assert.ok(codeSurfaces.length > 0, 'code surfaces must be loaded');

  assert.ok(/const TRIAL_DAYS = 30;/.test(mainSource), 'main process must start a 30-day local trial');
  assert.ok(/const LICENSE_CHECK_INTERVAL_DAYS = 7;/.test(mainSource), 'main process must validate active licenses every 7 days');
  assert.ok(/ipcMain\.handle\('activate-license'/.test(mainSource), 'main process must expose license activation IPC');
  assert.ok(/getLicenseState: \(\) => ipcRenderer\.invoke\('get-license-state'\)/.test(preloadSource), 'preload must expose license state IPC');
  assert.ok(/activateLicense:\s*async\s*\(email\)\s*=>[\s\S]*ipcRenderer\.invoke\('activate-license', email\)/.test(preloadSource), 'preload must expose license activation IPC');
  assert.ok(licenseSource.includes('id="l-buy"'), 'renderer must include a license activation dialog');
  assert.ok(rendererSource.includes('refreshLicenseState();'), 'renderer must check license state during startup');

  assert.ok(!/pro-feature|pro-badge/.test(indexSource), 'recording UI must not keep pro/trial hooks in markup');
  assert.ok(!/pro-feature|pro-badge/.test(stylesSource), 'recording UI must not keep pro/trial hooks in styles');
});

run();
