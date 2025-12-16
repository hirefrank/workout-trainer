/**
 * Generate VAPID keys for Web Push notifications
 * Run: node scripts/generate-vapid-keys.js
 */

const crypto = require('crypto');

function generateVapidKeys() {
  // Generate ECDSA P-256 key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });

  // Convert to URL-safe base64
  const publicKeyBase64 = publicKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const privateKeyBase64 = privateKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  console.log('\n=== VAPID Keys Generated ===\n');
  console.log('Public Key (use in client-side code):');
  console.log(publicKeyBase64);
  console.log('\nPrivate Key (set as Cloudflare secret):');
  console.log(privateKeyBase64);
  console.log('\n=== Setup Instructions ===\n');
  console.log('1. Update public/workout/app.js:');
  console.log(`   Replace 'YOUR_VAPID_PUBLIC_KEY_HERE' with: ${publicKeyBase64}`);
  console.log('\n2. Set Cloudflare secret:');
  console.log(`   wrangler secret put VAPID_PRIVATE_KEY`);
  console.log('   Paste the private key when prompted');
  console.log('\n3. Set VAPID_PUBLIC_KEY in wrangler.jsonc vars section');
  console.log('');
}

generateVapidKeys();
