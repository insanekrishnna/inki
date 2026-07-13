const { execFile } = require('child_process');
const path = require('path');
const { notarize } = require('@electron/notarize');

function run(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function hasNotarizationCredentials() {
  return Boolean(
    process.env.APPLE_ID &&
      process.env.APPLE_APP_SPECIFIC_PASSWORD &&
      process.env.APPLE_TEAM_ID
  );
}

module.exports = async function signOrNotarizeMac(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appInfo = context.packager.appInfo;
  const appPath = path.join(context.appOutDir, `${appInfo.productFilename}.app`);

  if (hasNotarizationCredentials()) {
    console.log(`Notarizing ${appPath} with Apple notary service...`);
    await notarize({
      appBundleId: appInfo.id,
      appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });
    return;
  }

  console.log('Apple notarization credentials are not configured; using ad-hoc macOS signing.');
  await run('/usr/bin/codesign', [
    '--force',
    '--deep',
    '--sign',
    '-',
    '--identifier',
    appInfo.id,
    appPath,
  ]);
};
