const fs = require('fs');
const path = require('path');

const target = (process.env.YOUR_PROJECT_LICENSE_TARGET || 'pre').trim().toLowerCase();

const defaults = {
  pre: {
    buyLicenseUrl: 'https://example.com/your-test-checkout-link',
    licenseApiBaseUrl: 'https://your-pre-supabase-project-ref.supabase.co/functions/v1',
    supabasePublishableKey: 'YOUR_PRE_SUPABASE_PUBLISHABLE_KEY',
  },
  pro: {
    buyLicenseUrl: 'https://example.com/your-live-checkout-link',
    licenseApiBaseUrl: 'https://your-pro-supabase-project-ref.supabase.co/functions/v1',
    supabasePublishableKey: 'YOUR_PRO_SUPABASE_PUBLISHABLE_KEY',
  },
};

const envPrefix = `YOUR_PROJECT_${target.toUpperCase()}`;
const config = {
  buyLicenseUrl: process.env[`${envPrefix}_BUY_LICENSE_URL`] || defaults[target]?.buyLicenseUrl || '',
  licenseApiBaseUrl: process.env[`${envPrefix}_LICENSE_API_BASE_URL`] || defaults[target]?.licenseApiBaseUrl || '',
  supabasePublishableKey: process.env[`${envPrefix}_SUPABASE_PUBLISHABLE_KEY`] || defaults[target]?.supabasePublishableKey || '',
};

for (const [key, value] of Object.entries(config)) {
  if (!value) {
    throw new Error(`Missing ${key} for ${target}. Set ${envPrefix}_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}.`);
  }
}

const outputPath = path.join(__dirname, '..', 'src', 'license-config.js');
const output = `module.exports = ${JSON.stringify(config, null, 2)};\n`;

fs.writeFileSync(outputPath, output);
console.log(`Configured Your Project ${target.toUpperCase()} license endpoint: ${config.licenseApiBaseUrl}`);
