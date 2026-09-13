![ScotMesh](social/readme-header.png)

# ScotMesh branding

Logos, colours, type and social graphics for ScotMesh, Scotland's off-grid radio mesh community running MeshCore, Meshtastic and Reticulum.

## The mark

The saltire drawn as a mesh: four nodes linked through a node at the centre, with fainter neighbours meshing around the edge. It's the flag and the network in one shape.

| Mark | On light | On dark |
| --- | --- | --- |
| <img src="logo/scotmesh-mark.svg" width="120" alt="ScotMesh mark"> | <img src="logo/scotmesh-glyph-blue.svg" width="120" alt="ScotMesh glyph in blue"> | <img src="logo/scotmesh-glyph-white.svg" width="120" alt="ScotMesh glyph in white"> |
| `logo/scotmesh-mark.svg` | `logo/scotmesh-glyph-blue.svg` | `logo/scotmesh-glyph-white.svg` |

**Small sizes.** Below 48px, use `logo/scotmesh-mark-small.svg`. It drops the faint outer mesh and thickens the links so the saltire still reads at 16px. The favicons are built from it.

**Clear space.** Keep at least the width of one corner node clear on every side of the mark (about a tenth of its width).

**Don't** recolour the mark outside the palette, rotate it (a turned saltire is just a plus sign), stretch it, or put the blue mark on a busy photo without its field.

## Wordmark

The name is always set lowercase in IBM Plex Mono SemiBold: **scotmesh**. In running text, write it as ScotMesh.

| On light | On dark |
| --- | --- |
| `wordmark/scotmesh-lockup-on-light.svg` | `wordmark/scotmesh-lockup-on-dark.svg` |
| `wordmark/scotmesh-wordmark-on-light.svg` | `wordmark/scotmesh-wordmark-on-dark.svg` |

All text in the SVGs is converted to outlines, so nothing depends on the fonts being installed.

## Colour

| | Name | Hex | Use |
| --- | --- | --- | --- |
| ![#005EB8](https://placehold.co/24x24/005EB8/005EB8.png) | Saltire | `#005EB8` | The mark's field, links and primary actions. Pantone 300, the saltire blue. |
| ![#0A1424](https://placehold.co/24x24/0A1424/0A1424.png) | Night | `#0A1424` | Dark backgrounds and text on light. |
| ![#E6EDF7](https://placehold.co/24x24/E6EDF7/E6EDF7.png) | Mist | `#E6EDF7` | Light backgrounds and text on dark. |
| ![#F2B33D](https://placehold.co/24x24/F2B33D/F2B33D.png) | Signal | `#F2B33D` | Sparingly: a packet in flight, a live status, one highlight per view. |

Supporting tints used in the banners: mesh links `#23406A`, mesh nodes `#4B72A6`, secondary text on Night `#C9D6E8` and `#7FA7D9`.

## Type

- **IBM Plex Mono**: the wordmark, headings, node IDs, frequencies and anything technical.
- **IBM Plex Sans Condensed**: body copy and taglines.

Both are free under the SIL Open Font License, available from [Google Fonts](https://fonts.google.com/?query=IBM+Plex) or [IBM](https://github.com/IBM/plex).

## Platform assets

| Where | File | Size | Notes |
| --- | --- | --- | --- |
| GitHub org avatar | `avatars/github-org-avatar.png` | 1024×1024 | Organisation settings → Profile picture |
| Discord server icon | `avatars/discord-server-icon.png` | 512×512 | Discord crops it to a circle; the mark is built to survive that |
| Discord server banner | `social/discord-banner.png` | 960×540 | Needs server boost level 2 |
| Discord invite background | `social/discord-invite-splash.png` | 1920×1080 | Needs server boost level 1. The saltire sits right of centre, clear of the invite card |
| GitHub social preview | `social/github-social-preview.png` | 1280×640 | Repo settings → Social preview |
| X / Mastodon / Bluesky header | `social/header-1500x500.png` | 1500×500 | Text sits high, above where the profile picture overlaps |
| README header | `social/readme-header.png` | 1600×400 | |
| Favicon | `logo/favicon.ico` | 16, 32, 48 | Plus separate PNGs in `logo/` |

Every PNG has a matching SVG next to it.

## Building

Everything is generated from `src/build.mjs`, so change the geometry or colours there rather than editing outputs by hand.

```sh
npm install
npm run build
```

Needs Node 18+, `rsvg-convert` (librsvg) and ImageMagick's `magick` on your `PATH`. The fonts in `src/fonts/` are IBM Plex, redistributed under the [SIL Open Font License](src/fonts/OFL.txt).
