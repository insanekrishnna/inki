# App icons

This directory is the canonical source for project runtime icons.

- `icon.png` is the source icon used for generated app assets.
- `macos/StatusTemplate-volcano-thicker.png` and `macos/StatusTemplate-volcano-thicker@2x.png` are the macOS menu bar template pair.
- `macos/menu/*Template.png` and `macos/menu/*Template@2x.png` are the macOS tray menu icons, rasterized from the pillbar SVG icons.
- `macos/` contains macOS PNG sizes and `icon.icns`.
- `windows/` contains Windows PNG sizes and `icon.ico`.
- `linux/icons/` contains Linux PNG sizes.

Electron Builder reads packaging icons from the repository-level `build/`
directory, while app windows use the generated icons in this folder at runtime.
