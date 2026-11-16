// Saves the rules currently live on the neonxi Realtime Database (REST /.settings/rules.json) to a file.
// Auth: a service account via GOOGLE_APPLICATION_CREDENTIALS (see .github/workflows/firebase-rules.yml).
const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');
const out = process.argv[2] || 'live-rules.json';
(async () => {
  const client = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/firebase.database', 'https://www.googleapis.com/auth/userinfo.email'] }).getClient();
  const r = await client.request({ url: 'https://neonxi-default-rtdb.europe-west1.firebasedatabase.app/.settings/rules.json', responseType: 'text' });
  fs.writeFileSync(out, typeof r.data === 'string' ? r.data : JSON.stringify(r.data, null, 2));
  console.log('live rules saved to', out);
})().catch(e => { console.error('could not read the live rules:', e.message); process.exit(1); });
