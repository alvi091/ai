const fs = require('fs');
const j = JSON.parse(fs.readFileSync('scripts/_fk_api_resp.json', 'utf8'));
const data = j.RESPONSE.data;
console.log('data items:', data.length);
const r = data[0];
console.log('item keys:', Object.keys(r));
console.log('value keys:', r.value ? Object.keys(r.value) : 'none');
console.log(JSON.stringify(r, null, 1).slice(0, 1500));
// pagination
console.log('\nRESPONSE params:', JSON.stringify(j.RESPONSE.params || {}).slice(0, 600));
console.log('\ntracking:', JSON.stringify(j.RESPONSE.tracking || {}).slice(0, 400));