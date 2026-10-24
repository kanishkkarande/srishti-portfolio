# Srishti — Advertising Video Portfolio

A mobile-first video portfolio with stable routes `/skoda`, `/enamor`, and `/wow`.

## Run locally

Serve `dist` with any static web server:

```sh
python3 -m http.server 4173 --directory dist
```

Open http://localhost:4173. No build or package installation is required.

## Publish

Deploy `dist` as the static site root on your hosting provider. Physical directory index files support direct brand links. The absolute asset paths require deployment at the domain root. Use a permanent public domain before printing QR codes. This repository does not automatically enable hosting.

## Content

Edit `dist/content.js`. Each brand has an ordered `videos` array. Move objects to reorder; update `title`, optional `category`, `src`, `poster`, and `aspect` (width divided by height). Upload files to `dist/media`. Use direct hosted MP4 URLs if preferred. Only referenced, current media are included.

- Škoda: three campaign videos.
- Enamor: five videos, grouped as #LiftsMeUp, Athleisure, Galentine’s Day.
- WOW AD: eleven videos, grouped as Boen, The Rising, Margarida Romao, Azure Collection.

Frames follow original video proportions. WOW videos have the phone bezel cropped away. Text fades after three seconds of active playback. The active reel plays; inactive reels pause. All brands attempt sound autoplay, falling back to muted playback and a Tap for sound prompt when browsers require interaction. Mute/unmute, play/pause, seeking, loading and retry controls are included.

## QR codes

Use static QR codes pointing to `https://YOUR-DOMAIN/skoda`, `/enamor`, and `/wow`. Keep the same domain and paths when changing content. For printable SVGs:

```sh
python3 -m pip install 'qrcode[pil]'
python3 generate_qr.py https://YOUR-DOMAIN
```

Test the published URLs signed out and scan a printed proof before production.
