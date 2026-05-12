import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = 'http://localhost:3001/api';
const EMAIL = 'test@wreckify.com';
const PASS  = 'Test1234!';

async function json(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function main() {
  // 1. Login
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  const login = await json(loginRes);
  const token = login.data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  console.log('1. Login OK —', login.data.user.email);

  // 2. Create vehicle
  const vRes = await fetch(`${BASE}/vehicles`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ make: 'Honda', model: 'City', year: 2020 }),
  });
  const v = await json(vRes);
  const vehicleId = v.data.id;
  console.log('2. Vehicle —', vehicleId);

  // 3. Create scan
  const sRes = await fetch(`${BASE}/scans`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehicleId }),
  });
  const s = await json(sRes);
  if (!s.data?.id) {
    console.error('3. Scan creation FAILED:', JSON.stringify(s));
    return;
  }
  const scanId = s.data.id;
  console.log('3. Scan created —', scanId, 'status:', s.data.status);

  // 4. Upload test image
  const dir = path.dirname(fileURLToPath(import.meta.url));
  let imgPath = path.join(dir, 'test_car.png');
  let mimeType = 'image/png';
  let fileName = 'test_car.png';
  if (!fs.existsSync(imgPath)) {
    imgPath = path.join(dir, 'test_car.jpg');
    mimeType = 'image/jpeg';
    fileName = 'test_car.jpg';
  }
  if (!fs.existsSync(imgPath)) {
    console.error('4. No test image found — place test_car.png or test_car.jpg in the repo root');
    return;
  }
  console.log(`4. Using image: ${fileName}`);

  const form = new FormData();
  const blob = new Blob([fs.readFileSync(imgPath)], { type: mimeType });
  form.append('images', blob, fileName);

  const uploadRes = await fetch(`${BASE}/scans/${scanId}/images`, {
    method: 'POST', headers, body: form,
  });
  const upload = await json(uploadRes);
  console.log(`4. Upload HTTP ${uploadRes.status} — images: ${upload.data?.images?.length ?? 'err'}`);

  // 5. Trigger detection (returns immediately — job queued)
  const detectRes = await fetch(`${BASE}/scans/${scanId}/detect`, {
    method: 'POST', headers,
  });
  const detect = await json(detectRes);
  console.log(`5. Detection queued — status: ${detect.data?.status}`);

  // 6. Poll until complete (max 90s)
  console.log('6. Polling for result...');
  const start = Date.now();
  let scanData;
  while (Date.now() - start < 90_000) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`${BASE}/scans/${scanId}`, { headers });
    scanData = (await json(pollRes)).data;
    console.log(`   ...status: ${scanData.status}  parts: ${scanData.detectedParts?.length ?? 0}`);
    if (scanData.status !== 'PROCESSING') break;
  }

  if (scanData.status !== 'COMPLETED') {
    console.log('Detection did not complete:', scanData.status);
    return;
  }
  console.log(`   Parts detected: ${scanData.detectedParts.map(p => p.partName).join(', ') || '(none)'}`);

  // 7. Request cost estimate
  const estRes = await fetch(`${BASE}/scans/${scanId}/estimate`, {
    method: 'POST', headers,
  });
  const est = await json(estRes);
  const estimate = est.data?.costEstimate;
  if (estimate) {
    console.log(`7. Estimate — PKR ${estimate.totalMin.toLocaleString()}–${estimate.totalMax.toLocaleString()}`);
    estimate.lineItems.forEach(li =>
      console.log(`   ${li.part}: parts ${li.partsMin}–${li.partsMax}, labour ${li.laborMin}–${li.laborMax}`)
    );
    console.log(`   Narrative: ${estimate.narrative}`);
  } else {
    console.log('7. Estimate response:', JSON.stringify(est).substring(0, 300));
  }
}

main().catch(console.error);
