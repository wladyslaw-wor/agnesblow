# Coming Soon

Minimal React/Vite signup page with a Node/Express endpoint. Subscriptions are appended to a CSV file on the DigitalOcean Droplet.

## Privacy warning

`https://agnesblow.com/signups.csv` is public by design. Anyone who knows or discovers the URL can download the email addresses and subscription timestamps. Do not use this setup unless subscribers are clearly told their addresses will be publicly accessible and that use complies with applicable privacy rules. To keep the list private, remove the public route and use an authenticated export or email service instead.

## Run locally

1. Use Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` if you want to change the local CSV path; by default it is `data/signups.csv`.
4. Run `npm run dev` and open the Vite URL printed in the terminal.
5. Run `npm test` for API checks and `npm run build` for the production build.

A signup is confirmed only after the CSV file has been written successfully. Email addresses are trimmed and validated on client and server, deduplicated case-insensitively, and stored with a UTC ISO timestamp. Writes are serialized within the Node process. The rate limit is five requests per IP per 15 minutes per process.

## Deploy on DigitalOcean Ubuntu

These steps add this app alongside other sites. They assume the Droplet already runs Nginx; do not replace its global config. Update only the virtual host for `agnesblow.com`.

### Install and build

Run commands as `root` unless otherwise noted:

```sh
apt update
apt install -y ca-certificates curl git
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
bash /tmp/nodesource_setup.sh
apt install -y nodejs
id agnesblow >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin agnesblow
mkdir -p /opt/agnesblow /var/lib/agnesblow
```

Push the project to the `master` branch of GitHub, then clone it on the server:

```sh
git clone -b master https://github.com/wladyslaw-wor/agnesblow.git /opt/agnesblow
chown -R agnesblow:agnesblow /opt/agnesblow /var/lib/agnesblow
runuser -u agnesblow -- sh -lc 'cd /opt/agnesblow && npm ci && npm run build'
```

The CSV is kept outside the repository at `/var/lib/agnesblow/signups.csv`, so pulling new code does not replace subscriber data. Set ownership and permissions for the service:

```sh
chown agnesblow:agnesblow /var/lib/agnesblow
chmod 750 /var/lib/agnesblow
```

### Configure systemd

Create `/etc/agnesblow.env`:

```dotenv
NODE_ENV=production
PORT=3001
HOST=127.0.0.1
SIGNUPS_FILE=/var/lib/agnesblow/signups.csv
```

Create `/etc/systemd/system/agnesblow.service`:

```ini
[Unit]
Description=agnesblow coming-soon website
After=network.target

[Service]
Type=simple
User=agnesblow
Group=agnesblow
WorkingDirectory=/opt/agnesblow
EnvironmentFile=/etc/agnesblow.env
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Check `command -v node` and adjust `ExecStart` if Node is installed elsewhere. Start the app:

```sh
systemctl daemon-reload
systemctl enable --now agnesblow
systemctl status agnesblow --no-pager
journalctl -u agnesblow -n 50 --no-pager
```

### Nginx and direct CSV URL

Back up the current Nginx virtual host for `agnesblow.com`. Add the following location inside its existing `server` block; leave other sites and server blocks alone:

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Then validate and reload Nginx:

```sh
nginx -t && systemctl reload nginx
```

The CSV is available at `https://agnesblow.com/signups.csv`. It includes a header row and the columns `email` and `subscribed_at_utc`. The endpoint sends `Cache-Control: no-store`; web crawlers are asked not to index it, but this does not make it private. Anyone can still open the direct URL.

## Updating the deployment

After pushing changes to `master`, update the app without touching the CSV:

```sh
cd /opt/agnesblow
git pull --ff-only origin master
runuser -u agnesblow -- sh -lc 'cd /opt/agnesblow && npm ci && npm run build'
systemctl restart agnesblow
systemctl status agnesblow --no-pager
```

The file-based rate limiter and write queue are per-process. Run exactly one app process as configured above; a process restart clears rate-limit counters but preserves CSV data. Keep regular protected backups of `/var/lib/agnesblow/signups.csv`.
