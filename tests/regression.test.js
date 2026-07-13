const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const packageJson = JSON.parse(read('package.json'));
const preloadSource = read('src/preload.js');
const mainSource = read('src/main.js');
const rendererSource = read('src/renderer/renderer.js');
const indexSource = read('src/renderer/index.html');
const stylesSource = read('src/renderer/styles.css');
const landingSource = read('index.html');
const captureOverlaySource = read('src/renderer/capture-overlay.html');

function assertNotContains(source, patterns, label) {
  for (const pattern of patterns) {
    const matched = pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern);
    assert.ok(!matched, `${label} must not contain ${pattern}`);
  }
}

assert.ok(/startCapture: \(options = \{\}\) => ipcRenderer\.invoke\('start-capture', options\)/.test(preloadSource), 'preload must expose region screenshot capture');
assert.ok(/startCaptureWindow: \(options = \{\}\) => ipcRenderer\.invoke\('start-capture-window', options\)/.test(preloadSource), 'preload must expose window screenshot capture');
assert.ok(/startCaptureFullscreen: \(options = \{\}\) => ipcRenderer\.invoke\('start-capture-fullscreen', options\)/.test(preloadSource), 'preload must expose fullscreen screenshot capture');
assert.ok(/ipcMain\.handle\('start-capture'/.test(mainSource), 'main process must handle region screenshot capture');
assert.ok(/ipcMain\.handle\('start-capture-window'/.test(mainSource), 'main process must handle window screenshot capture');
assert.ok(/ipcMain\.handle\('start-capture-fullscreen'/.test(mainSource), 'main process must handle fullscreen screenshot capture');
assert.ok(indexSource.includes('id="btn-capture-region"'), 'renderer must keep region capture button');
assert.ok(indexSource.includes('id="btn-capture-window"'), 'renderer must keep window capture button');
assert.ok(indexSource.includes('id="btn-capture-fullscreen"'), 'renderer must keep fullscreen capture button');
assert.ok(/captureMode === 'region'[\s\S]*instructions\.classList\.add\('hidden'\)/.test(captureOverlaySource), 'region overlay must keep screenshot selection behavior');

assertNotContains(indexSource, ['btn-record-screen', 'recording-preview', 'recording-save-progress'], 'renderer markup');
assertNotContains(rendererSource, ['btnRecordScreen', 'startRecordingWithFormat', 'toggleRecording(', 'saveRecordingPreview', 'recordingPreview'], 'renderer script');
assertNotContains(preloadSource, ['startRecording', 'stopRecording', 'saveRecording', 'MediaRecorder', 'pro-recording-source'], 'preload API');
assertNotContains(stylesSource, ['#btn-record-screen', '.recording-preview', '.recording-save-progress', '.toolbar-group.video-tools'], 'renderer styles');
assertNotContains(landingSource, ['Screen recording', 'screen recording', 'recordings'], 'landing page');
assert.ok(!packageJson.scripts['test:recording'], 'package scripts must not expose a recording-specific test alias');

console.log('regression checks passed');
