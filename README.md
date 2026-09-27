# Coming Soon

Minimal React/Vite signup page with a Node/Express endpoint that appends confirmed signups to the supplied Google Sheet.

## Run locally

1. Use Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and complete the Google credentials as described below.
4. Run `npm run dev` and open the Vite URL printed in the terminal.
5. Run `npm test` for endpoint checks and `npm run build` for the production build.

Without valid Google credentials the endpoint returns an error and the page displays its retry message. It never reports a successful signup unless the email was already present in the sheet or Google confirms the append.

## Connect Google Sheets

1. In Google Cloud Console, create a project and enable the Google Sheets API.
2. Create a service account and generate a JSON key. Keep the key private; do not commit `.env` or put these values in frontend or `VITE_*` variables.
3. Share the existing spreadsheet with the service account's `client_email` as an Editor. The spreadsheet remains private.
4. Set `GOOGLE_SHEETS_ID` to the spreadsheet ID and `GOOGLE_SHEETS_TAB` to the exact tab name (`Лист1` in the supplied spreadsheet).
5. Put the service-account JSON in `GOOGLE_SERVICE_ACCOUNT_JSON` as a single-line JSON value. In the JSON string, encode private-key line breaks as `\n`.
6. Keep columns A and B for email and the UTC subscription timestamp. The API reads existing emails for case-insensitive duplicate checks and appends new rows using the Sheets API `RAW` mode; it does not clear or overwrite existing cells.

The supplied spreadsheet opened in the browser, but only without an authenticated Google account; no service-account credentials are available here. Therefore, live writes and the spreadsheet's current write permission have not been verified. The API and configuration path are prepared, and an unconfigured or denied write returns an error instead of a success state.

## Publish

Deploy as a Node.js web service (for example, Render, Railway, or another Node host) with Node.js 20+, build command `npm install && npm run build`, and start command `npm start`. Set the four server environment variables above in the host's secret settings. The same Express process serves the built site and `/api/signup`.

The included rate limit allows five requests per IP per 15 minutes in a single server process. For multiple instances, replace its in-memory store with a shared rate-limit store. Configure the host's trusted-proxy setting deliberately before relying on forwarded client IP addresses.