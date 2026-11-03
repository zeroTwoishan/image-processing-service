# Fonts

Self-hosted, Latin subset only, from [Fontsource](https://fontsource.org) (the same files Google Fonts serves).
Served from our own domain instead of fonts.googleapis.com + fonts.gstatic.com: on a slow phone connection, every
extra server costs a DNS lookup, a TLS handshake and a round trip before the first byte. It's also one less
third party that sees our visitors.

| File | Used for |
| --- | --- |
| geist-latin-400/500/600-normal.woff2 | All UI text and headlines (`font-sans`) |
| geist-mono-latin-400/500-normal.woff2 | Numbers, file names, labels (`font-mono`) |
| instrument-serif-latin-400-italic.woff2 | The italic accents and the wordmark (`font-display`); the upright cut isn't used |

All three families are under the SIL Open Font License 1.1 (LICENSE-*.txt), which allows bundling them with an app.
The @font-face rules are at the top of `src/index.css`; the three above-the-fold files are preloaded in `index.html`.
