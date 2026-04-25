# backend/uploads

This directory is a runtime workspace, not a source-code folder.

Use it for files created by upload endpoints while the app is running.

## Typical flow

1. User uploads file from UI.
2. Backend stores temporary file here.
3. Service reads/processes file.
4. File is archived or cleaned.

## Safe usage notes

- Keep this directory writable for the server process.
- Do not commit real patient or production files.
- For local tests, use clearly fake sample files only.

## When folder grows

Create subfolders by feature, for example:
- `requests/`
- `reports/`
- `tmp/`

Delete stale files regularly so local runs stay fast.
