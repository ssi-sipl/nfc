# NFC Wi-Fi

A one-page Next.js app for guest Wi-Fi NFC tags. The SSID and password are
stored **on the tag** in the URL fragment, for example:

```
https://your-app.vercel.app/#s=GuestWiFi&p=hunter2222
```

Nothing is stored on the server, and the page has no database or config.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy

```bash
npx vercel --prod
```

Any host that runs Next.js works. NFC needs `https`, which Vercel gives you
automatically.

## Make a tag

1. Open your deployed site **without** a `#` (for example `https://your-app.vercel.app`).
   You get the tag generator.
2. Enter the SSID, password and security type, then tap **Copy URL**.
3. In **NFC Tools**: Write → Add a record → **URL / URI** → paste → Write.
4. Test the tag with both an iPhone and an Android phone.

URL parameters:

| Param | Meaning | Default |
|---|---|---|
| `s` | SSID | required |
| `p` | Password | empty |
| `t` | `WPA`, `WEP` or `NOPASS` | `WPA` |

## What guests see

- **iPhone / iPad / Mac**: a **Connect** button. It downloads a Wi-Fi
  configuration profile. The guest taps Allow, then Settings → Profile
  Downloaded → Install, and the device joins the network. Apple doesn't let a
  web page join Wi-Fi in fewer steps than this.
- **Android**: a **Copy password** button and the steps to finish. Browsers
  can't join Wi-Fi on Android. To get a true one-tap join on Android, add a
  second record to the same tag (NFC Tools → Add a record → **Wi-Fi network**).
  Test the order of the two records on your phones.

## Privacy

- **Opening the page:** the details are after `#`. Browsers never send that
  part to the server, so it doesn't show up in Vercel logs. The page also
  removes it from the address bar and history once it has read it.
- **Connect button (Apple):** the details are sent once in a POST body to
  `/api/profile` to build the profile file. They aren't stored, and request
  bodies don't appear in Vercel's request logs. If even that is too much,
  delete `app/api/profile` and the Apple block in `app/page.jsx`. The copy
  button still works with nothing leaving the phone.
- **The tag itself:** anyone with an NFC app can read the password from it.
  Only use this for a guest network that is isolated from your main LAN.
- Pages are marked `noindex`, and links send no referrer.

## Notes

- The profile isn't signed, so iOS shows it as **"Not Verified"**. That's
  normal for self-made profiles.
- Once installed, the profile stays on the device. Guests can remove it under
  Settings → General → VPN & Device Management.
