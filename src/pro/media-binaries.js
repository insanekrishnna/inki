/**
 * Helpers for resolving bundled Pro media binaries.
 *
 * Packaged builds can resolve executables from:
 *   - resources/bin/ffmpeg(.exe) and resources/bin/gifski(.exe)
 *   - unpacked npm dependencies bundled by electron-builder
 *   - src/bin/* during development or manual overrides
 *   - the user's PATH as a final development fallback
 */

const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { spawnSync } = require('child_process');

const isWindows = process.platform === 'win32';
const extension = isWindows ? '.exe' : '';
const gifskiPlatformDir = {
  win32: 'windows',
  darwin: 'macos',
  linux: 'debian',
}[process.platform];

function uniq(items) {
  return [...new Set(items.filter(Boolean))];
}

function asarUnpackedPath(candidate) {
  return candidate.includes('app.asar')
    ? candidate.replace('app.asar', 'app.asar.unpacked')
    : candidate;
}

function nodeModuleRoots() {
  const resourcePath = process.resourcesPath || '';
  const appPath = app.getAppPath();

  return uniq([
    path.join(resourcePath, 'app.asar.unpacked', 'node_modules'),
    path.join(resourcePath, 'app', 'node_modules'),
    path.join(appPath, 'node_modules'),
    asarUnpackedPath(path.join(appPath, 'node_modules')),
    path.join(__dirname, '..', '..', 'node_modules'),
  ]);
}

function packageCandidatePaths(name) {
  const executable = `${name}${extension}`;
  const roots = nodeModuleRoots();

  if (name === 'ffmpeg') {
    return roots.map((root) => path.join(root, 'ffmpeg-static', executable));
  }

  if (name === 'gifski' && gifskiPlatformDir) {
    return roots.map((root) => path.join(root, 'gifski', 'bin', gifskiPlatformDir, executable));
  }

  return [];
}

function candidatePaths(name) {
  const executable = `${name}${extension}`;
  const resourcePath = process.resourcesPath || '';
  const appPath = app.getAppPath();

  return uniq([
    path.join(resourcePath, 'bin', executable),
    path.join(resourcePath, 'app.asar.unpacked', 'bin', executable),
    path.join(resourcePath, 'app.asar.unpacked', 'src', 'bin', executable),
    ...packageCandidatePaths(name),
    path.join(appPath, 'bin', executable),
    path.join(appPath, 'src', 'bin', executable),
    path.join(__dirname, '..', 'bin', executable),
  ]).map(asarUnpackedPath);
}

function ensureExecutable(candidate) {
  if (isWindows) return;
  try {
    fs.chmodSync(candidate, 0o755);
  } catch (err) {
    // Ignore chmod failures; execFile will surface a useful error if needed.
  }
}

function versionArgs(name) {
  return name === 'gifski' ? ['--version'] : ['-version'];
}

function resolveFromPath(name) {
  const probe = spawnSync(name, versionArgs(name), { windowsHide: true, stdio: 'ignore' });
  return probe.error ? null : name;
}

function resolveBundledBinary(name) {
  const found = candidatePaths(name).find((candidate) => {
    try {
      return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
    } catch (err) {
      return false;
    }
  });

  if (found) {
    ensureExecutable(found);
    return found;
  }

  const fromPath = resolveFromPath(name);
  if (fromPath) return fromPath;

  throw new Error(`${name} binary not found. Install npm dependencies or bundle ${name}${extension} in resources/bin or src/bin.`);
}

module.exports = { resolveBundledBinary };
