const { build } = require('../package.json');
const { publish: _publish, ...buildWithoutPublish } = build;

const legacyMacBuild = {
  ...buildWithoutPublish,
  artifactName: 'your-project-legacy.${ext}',
  electronVersion: '22.3.27',
  directories: {
    ...build.directories,
    output: 'dist/legacy',
  },
  mac: {
    ...build.mac,
    minimumSystemVersion: '10.13.0',
    target: [
      {
        target: 'dmg',
        arch: ['x64'],
      },
    ],
  },
};

module.exports = legacyMacBuild;
