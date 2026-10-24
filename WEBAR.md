# Paper / Play — image-tracked WebAR

This adds `dist/ar/` alongside the existing video portfolio. Existing routes and media are preserved.

## Routes

- `ar/ikea/`
- `ar/whiskas/`
- `ar/plot-twist/`
- `ar/wow-inheritance/`
- `ar/test.html`: display a campaign image on a desktop screen as the physical target.
- `ar/prepare.html`: compile replacement target images and generate QR codes.

On GitHub Pages, prefix each path with `https://kanishkkarande.github.io/srishti-portfolio/`. The existing workflow publishes `dist/` when changes land on `main`. A pushed feature branch is not a live deployment. All app URLs are relative and support the GitHub Pages project prefix or a custom domain.

## Run locally

Serve `dist/`: `python3 -m http.server 8766 --directory dist`, then open `http://localhost:8766/ar/test.html`. A phone cannot reach the desktop using its own `localhost`. Use the public HTTPS deployment for phone camera permission.

## How it works

MindAR 1.2.5 detects the supplied PNG through a compiled `.mind` target. Three.js 0.152.2 renders the campaign video as a VideoTexture on a plane attached to `addAnchor(0).group`. Camera-based position, rotation and perspective drive that plane. It is genuine image tracking, not a screen overlay. Each campaign loads one separate target and one local optimised H.264/AAC video. Camera frames stay on the device; microphone access is not needed.

Direct campaign links begin camera acquisition automatically. Browser camera permission is still required. Video autoplay is attempted muted after target recognition; a Play button handles autoplay restrictions. Sound, pause, replay, target-loss pause/hide and camera-close controls are included. Reacquisition resumes unless the visitor manually paused. Backgrounding closes the camera. Direct fallback uses a local MP4 and does not require Drive, Canva or Google sign-in.

## Phone test

Open `ar/test.html` on the desktop. Enter the live HTTPS URL ending in `/srishti-portfolio/ar/` (or your custom domain's `/ar/` folder). Choose a campaign and generate its QR code. Scan the separate AR code with your phone, allow camera access, and point back at the desktop image. Move and rotate the phone: playback should follow the image's perspective. Move the target out of view: playback should pause and disappear, then resume on return. Test iOS Safari and Android Chrome, sound, pause/replay and denied-camera fallback.

**The QR codes embedded inside the supplied screenshots still point to the original Drive/Canva videos. Scan the separate new AR QR for testing.** Do not alter the target pixels without recompiling the target. Put a production AR QR beside the unchanged tracked image, or compile the final revised print artwork again after changing its QR.

The black Canal+ frame contains very few visual features and may not track reliably. Use a more detailed campaign still or full case-study layout for production. Compilation does not guarantee recognition quality. Use matte prints, avoid glare and keep the image flat. Physical-phone tracking has not been certified in this development environment.

## Replace targets and videos

Compile exactly one flat print image with `ar/prepare.html`; save it as the campaign's `.mind` file, replace the matching PNG, and set the exact PNG pixel dimensions in `campaigns.json`. Print that exact image without stretching or cropping. Each target file contains one image at index 0.

`rectangle` uses fractions of the full target image: x/y from the top left, width/height from 0 to 1. The default covers the full frame. Match the video's aspect ratio to the rectangle. The plane is placed in target coordinates, not screen coordinates.

All four MP4s are included, including the 10 MB mobile Ikea encode. For replacements use H.264/AAC, yuv420p, 24–30fps, 720p–1280px wide, and fast-start metadata:

```sh
ffmpeg -i input.mp4 -vf 'scale=1280:-2' -r 30 -c:v libx264 -preset fast -crf 25 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart output.mp4
```

Keep videos on the same origin, or use a CORS-enabled HTTPS media host with byte-range support. A sharing/watch page cannot be used as a video texture. On hosting that supports `_headers`, apply camera=(self), microphone=() and media caching there; GitHub Pages ignores `_headers` but supplies HTTPS. External runtime modules are version-pinned to jsDelivr. Offline use requires vendoring the complete module graph and its licences.

Framework source: https://github.com/hiukim/mind-ar-js
