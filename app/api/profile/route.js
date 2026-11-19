import { randomUUID } from 'crypto';

// Builds an Apple Wi-Fi configuration profile on the fly.
// Credentials arrive in the POST body (not the URL), are used once to build
// the response, and are never stored or logged.

export const dynamic = 'force-dynamic';

const xml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const bytes = (s) => new TextEncoder().encode(s).length;

export async function POST(req) {
  let form;
  try {
    form = await req.formData();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const ssid = String(form.get('s') || '');
  const password = String(form.get('p') || '');
  const type = String(form.get('t') || 'WPA').toUpperCase();

  if (bytes(ssid) < 1 || bytes(ssid) > 32) {
    return new Response('Invalid network name', { status: 400 });
  }

  let encryption = 'WPA'; // covers WPA / WPA2 / WPA3 Personal
  if (type === 'WEP') encryption = 'WEP';
  if (type === 'NOPASS' || type === 'NONE') encryption = 'None';

  if (encryption === 'WPA' && (password.length < 8 || password.length > 63)) {
    return new Response('Invalid password length', { status: 400 });
  }

  const outerUUID = randomUUID().toUpperCase();
  const wifiUUID = randomUUID().toUpperCase();

  const passwordBlock =
    encryption === 'None'
      ? ''
      : `
      <key>Password</key>
      <string>${xml(password)}</string>`;

  const profile = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadType</key>
      <string>com.apple.wifi.managed</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>PayloadIdentifier</key>
      <string>wifi.guest.${wifiUUID}</string>
      <key>PayloadUUID</key>
      <string>${wifiUUID}</string>
      <key>PayloadDisplayName</key>
      <string>Wi-Fi: ${xml(ssid)}</string>
      <key>SSID_STR</key>
      <string>${xml(ssid)}</string>
      <key>EncryptionType</key>
      <string>${encryption}</string>${passwordBlock}
      <key>AutoJoin</key>
      <true/>
      <key>HIDDEN_NETWORK</key>
      <false/>
      <key>IsHotspot</key>
      <false/>
    </dict>
  </array>
  <key>PayloadDisplayName</key>
  <string>${xml(ssid)} Wi-Fi</string>
  <key>PayloadDescription</key>
  <string>Connects this device to the ${xml(ssid)} Wi-Fi network.</string>
  <key>PayloadIdentifier</key>
  <string>wifi.guest.profile.${outerUUID}</string>
  <key>PayloadUUID</key>
  <string>${outerUUID}</string>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadRemovalDisallowed</key>
  <false/>
</dict>
</plist>
`;

  return new Response(profile, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-apple-aspen-config',
      'Content-Disposition': 'attachment; filename="wifi.mobileconfig"',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export function GET() {
  return new Response('Method not allowed', { status: 405 });
}
