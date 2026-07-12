# ios-safari-ci

A zero-cost rig for viewing and debugging web work in **real iOS Safari** — including iOS 26 "Liquid Glass" browser chrome at mobile viewport sizes — from a Linux machine, with no physical iPhone. It runs on GitHub-hosted `macos-26` runners (free and un-metered on public repositories), which ship macOS 26, Xcode 26, and iOS 26 Simulator runtimes with iPhone 17 device profiles.

An autonomous agent drives it end to end: dispatch a workflow, wait, pull the screenshot artifacts, read them.

## Workflows

### `ios-safari-screenshot`
Boots an iOS Simulator, opens a URL in Mobile Safari, uploads screenshots of the device screen (chrome included).

```
gh workflow run ios-safari-screenshot -R Aeowulf/ios-safari-ci \
  -f url=https://example.com -f device="iPhone 17"
```

### `ios-safari-diagnose`
Same, plus real HID touch injection via [AXe](https://github.com/cameroncooke/AXe): dismisses Safari's first-run coach mark, performs a series of scroll swipes, and screenshots after each — so scroll-driven animations are captured mid-motion. Also dumps `axe --help` and the accessibility tree.

```
gh workflow run ios-safari-diagnose -R Aeowulf/ios-safari-ci \
  -f url=https://example.com -f device="iPhone 17" -f swipes=8
```

## Testing a local dev server

The runner cannot reach `localhost` on the developer machine. Expose the local server first, then pass the public URL as `url`:

- Production build (recommended for QA): `next build && next start`, then tunnel it (`cloudflared tunnel --url http://localhost:3000`). A production build behaves like the deployed site.
- Tailscale (`tailscale funnel 3000`) also works and is same-tailnet-private.

Do **not** QA scroll/animation behavior on a `next dev` build served cross-origin to a device. Next.js dev mode (React StrictMode double-mount, HMR, the Next 15 `allowedDevOrigins` block on `/_next/webpack-hmr` for non-localhost hosts) can break client-side animation libraries such as Lenis in ways the production build does not. This exact trap produced a false "animations are broken on iOS" report on the Togetherland project; production was fine.

## `assets/DebugProbe.tsx`

A drop-in dev-only overlay for Next.js + Lenis + GSAP ScrollTrigger sites. Mount it inside the Lenis provider and load the page with `?probe=1`. It renders a fixed panel (top-left) that turns every screenshot into an instrument readout: caught JS errors, requestAnimationFrame liveness, Lenis scroll-event count and position, native scrollY, inner-height vs `100lvh`, `maxTouch`/`pointer:coarse`, ScrollTrigger count, per-trigger progress, and the first pinned element's computed `position`. Gated on `?probe=1` only, so it survives a production build; strip it before merging to a main branch.

This repository contains only CI configuration and the probe asset. No site code lives here.
