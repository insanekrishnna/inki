# Bundled Pro media binaries

The app now declares runtime dependencies on `ffmpeg-static` and `gifski`, and
Electron Builder unpacks those packages so Pro recording conversion can execute
their binaries in packaged builds.

You can still place platform-specific executable binaries here to override the
npm-provided tools for local development or custom distribution:

- `ffmpeg` / `ffmpeg.exe`
- `gifski` / `gifski.exe`

Electron Builder copies this directory to packaged app resources as `bin/`.
Files in this directory take precedence over npm-provided binaries at runtime.
