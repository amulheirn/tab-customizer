# Custom Tab Titles & Favicons

When you have lots of Forward tabs open in a browser, they all look the same.  When you have so many that the words disappear, only the Favicon remains. This leaves you clicking between tabs to find where you were a few minutes ago.

This is a small Chrome extension that sets a custom tab title and favicon for various Forward sites, based on hostname and path/query rules. Currently configured for:

- `fwd.app/docs/*` → "FwdDocs"
- `fwd.app/?/*` → "FwdApp"
- `scaling700.ext.forwardnetworks.com` → "S700"

You can add your own 

## Folder structure

```
tab-customizer/
├── manifest.json
├── content.js
├── icons/
│   ├── icons8-red-dot-32.png
│   └── icons8-blue-dot-32.png
```

## Installation

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `tab-customizer` folder

## Updating rules

Rules live in `content.js` in the `rules` array. Each rule needs:

- `test()` — a function returning `true`/`false` based on `host`, `path`, and `query`
- `title` — the tab title to apply
- `icon` — path to the icon file (must live under `icons/`)

Rules are checked in order; the first match wins.

```javascript
{
  test: () => host === "example.com" && path.startsWith("/app"),
  title: "My Title",
  icon: "icons/my-icon.png"
}
```

## Adding a new site

1. Add the new URL pattern to **both** `matches` arrays in `manifest.json` (under `content_scripts` and `web_accessible_resources`).
2. Add a new rule to the `rules` array in `content.js`.
3. Drop the icon file into `icons/`.
4. Reload the extension from `chrome://extensions` (click the refresh icon on the extension card).

## Notes

- Icons should be small (16x16 or 32x32 PNGs work well).  The ones in this package are 32x32 taken from https://icons8.com/icons (free download for small sizes)
- Icons of different size will fail to display.