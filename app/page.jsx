'use client';

import { useEffect, useMemo, useState } from 'react';

// Wi-Fi details live only in the URL fragment (#s=...&p=...&t=...).
// Browsers never send the fragment to the server, so opening this page
// leaks nothing to hosting logs.

function readHash() {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return null;
  const q = new URLSearchParams(raw);
  const ssid = q.get('s') || '';
  if (!ssid) return null;
  return {
    ssid,
    password: q.get('p') || '',
    type: (q.get('t') || 'WPA').toUpperCase(),
  };
}

function detectPlatform() {
  const ua = navigator.userAgent || '';
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Macintosh/.test(ua)) return 'mac';
  return 'other';
}

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [wifi, setWifi] = useState(null);
  const [platform, setPlatform] = useState('other');

  useEffect(() => {
    const load = () => {
      const data = readHash();
      if (data) {
        setWifi(data);
        // Remove the details from the address bar and browser history.
        history.replaceState(null, '', window.location.pathname);
      }
    };
    load();
    setPlatform(detectPlatform());
    setMounted(true);
    window.addEventListener('hashchange', load);
    return () => window.removeEventListener('hashchange', load);
  }, []);

  if (!mounted) return <main className="wrap" />;

  return (
    <main className="wrap">
      {wifi ? <Connect wifi={wifi} platform={platform} /> : <Generator />}
    </main>
  );
}

/* ---------- Guest view: opened from the NFC tag ---------- */

function Connect({ wifi, platform }) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);
  const open = wifi.type === 'NOPASS' || wifi.type === 'NONE';
  const apple = platform === 'ios' || platform === 'mac';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wifi.password);
    } catch {
      const t = document.createElement('textarea');
      t.value = wifi.password;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const appleBlock = (
    <section className="card">
      <form method="POST" action="/api/profile">
        <input type="hidden" name="s" value={wifi.ssid} />
        <input type="hidden" name="p" value={wifi.password} />
        <input type="hidden" name="t" value={wifi.type} />
        <button type="submit" className="btn primary">
          Connect
          <span className="sub">iPhone · iPad · Mac</span>
        </button>
      </form>
      <ol className="steps">
        <li>Tap <b>Allow</b> when asked to download a configuration profile.</li>
        <li>Open <b>Settings</b> → <b>Profile Downloaded</b> → <b>Install</b>.</li>
        <li>You&apos;re connected. Remove it later under Settings → General → VPN &amp; Device Management.</li>
      </ol>
    </section>
  );

  const manualBlock = (
    <section className="card">
      {!open && (
        <button type="button" className="btn primary" onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy password'}
        </button>
      )}
      <ol className="steps">
        <li>Open <b>Settings</b> → <b>Wi-Fi</b>.</li>
        <li>Choose <b>{wifi.ssid}</b>.</li>
        {!open && <li>Paste the password and tap <b>Connect</b>.</li>}
      </ol>
    </section>
  );

  return (
    <>
      <div className="icon" aria-hidden>
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="1" fill="currentColor" />
        </svg>
      </div>
      <h1>Join Wi-Fi</h1>

      <section className="card details">
        <div className="row">
          <span className="label">Network</span>
          <span className="value">{wifi.ssid}</span>
        </div>
        {!open && (
          <div className="row">
            <span className="label">Password</span>
            <button type="button" className="value mono reveal" onClick={() => setShow(!show)}>
              {show ? wifi.password : '•'.repeat(Math.min(wifi.password.length, 12))}
              <span className="hint">{show ? 'hide' : 'show'}</span>
            </button>
          </div>
        )}
      </section>

      {apple ? (
        <>
          {appleBlock}
          <p className="or">or connect manually</p>
          {manualBlock}
        </>
      ) : (
        <>
          {manualBlock}
          {platform === 'other' && (
            <>
              <p className="or">on an Apple device?</p>
              {appleBlock}
            </>
          )}
        </>
      )}
    </>
  );
}

/* ---------- Owner view: build the URL to write to the tag ---------- */

function Generator() {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState('WPA');
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    if (!ssid) return '';
    const parts = [`s=${encodeURIComponent(ssid)}`];
    if (type !== 'NOPASS') parts.push(`p=${encodeURIComponent(password)}`);
    if (type !== 'WPA') parts.push(`t=${type}`);
    return `${window.location.origin}/#${parts.join('&')}`;
  }, [ssid, password, type]);

  // NFC Tools stores "https://" as a 1-byte prefix, so subtract it.
  const size = url ? new TextEncoder().encode(url.replace(/^https?:\/\//, '')).length + 1 : 0;
  const tag = size === 0 ? '' : size <= 132 ? 'Fits NTAG213 / 215 / 216' : size <= 490 ? 'Needs NTAG215 or 216' : 'Needs NTAG216';
  const weak = type === 'WPA' && password && (password.length < 8 || password.length > 63);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <h1>NFC Wi-Fi tag</h1>
      <p className="lead">
        Enter your guest network. Everything stays in this browser — the link
        carries the details after <code>#</code>, which is never sent to the server.
      </p>

      <section className="card">
        <label>
          Network name (SSID)
          <input value={ssid} onChange={(e) => setSsid(e.target.value)} autoComplete="off" spellCheck={false} />
        </label>
        <label>
          Security
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="WPA">WPA / WPA2 / WPA3</option>
            <option value="WEP">WEP</option>
            <option value="NOPASS">None (open)</option>
          </select>
        </label>
        {type !== 'NOPASS' && (
          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" spellCheck={false} />
            {weak && <span className="warn">WPA passwords must be 8–63 characters.</span>}
          </label>
        )}
      </section>

      {url && (
        <section className="card">
          <span className="label">URL to write to the tag</span>
          <div className="url mono">{url}</div>
          <div className="meta">
            ~{size} bytes · {tag}
          </div>
          <button type="button" className="btn primary" onClick={copy}>
            {copied ? 'Copied ✓' : 'Copy URL'}
          </button>
          <a className="btn ghost" href={url.replace(window.location.origin, '')} target="_blank" rel="noreferrer">
            Preview guest page
          </a>
          <p className="small">
            In NFC Tools: Write → Add a record → <b>URL / URI</b> → paste → Write.
          </p>
        </section>
      )}
    </>
  );
}
