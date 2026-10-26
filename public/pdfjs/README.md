# PDF.js generic viewer

This directory contains the modern generic viewer from the official Mozilla
PDF.js `v6.4.299` release archive.

The release was copied without source maps or its example PDF. The only local
code change is in `web/viewer.mjs`, where the file-origin check also permits the
Google Cloud Storage and Firebase Storage origins used by this application.

Source: https://github.com/mozilla/pdf.js/releases/tag/v6.4.299
