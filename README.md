# ios-safari-ci

Rendering checks for web work in iOS Safari, run on GitHub-hosted macOS runners.

The `ios-safari-screenshot` workflow boots an iOS Simulator on a `macos-26` runner, opens a given URL in Mobile Safari, and uploads screenshots of the device screen (including the browser chrome) as build artifacts.

Trigger it from the Actions tab or with the GitHub CLI:

```
gh workflow run ios-safari-screenshot -f url=https://example.com -f device="iPhone 17"
```

This repository contains only CI configuration. No site code lives here.
