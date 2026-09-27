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

The existing React site on the Droplet belongs to another project/domain and is not changed by this deployment. `agnesblow.com` is configured as a separate new Nginx virtual host and systemd service. Do not edit the other site's files or Nginx server block.

The requested systemd process runs as `root`. This is less secure than running Node as a dedicated service user: a vulnerability in the app or a dependency could grant full server access. The app only needs an unprivileged port and access to its own CSV, so a dedicated user is strongly recommended. The steps below honor the request to run under root.

### Install and build

Run on the Droplet as `root`:

```sh
apt update
apt install -y ca-certificates curl git
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
bash /tmp/nodesource_setup.sh
apt install -y nodejs
node --version
npm --version
mkdir -p /var/www/agnesblow /var/lib/agnesblow
```

Keep the existing React site's files where they are. Clone this app into its own directory; do not clone over the existing site's document root:

```sh
git clone -b master https://github.com/wladyslaw-wor/agnesblow.git /var/www/agnesblow
cd /var/www/agnesblow
npm ci
npm test
npm run build
chmod 750 /var/lib/agnesblow
```

The CSV lives outside the repository at `/var/lib/agnesblow/signups.csv`, so code updates do not replace collected addresses.

### Configure systemd as root

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
User=root
Group=root
WorkingDirectory=/var/www/agnesblow
EnvironmentFile=/etc/agnesblow.env
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Check `command -v node`; adjust `ExecStart` if the binary is not `/usr/bin/node`. Start and test the service before changing Nginx:

```sh
systemctl daemon-reload
systemctl enable --now agnesblow
systemctl status agnesblow --no-pager
journalctl -u agnesblow -n 50 --no-pager
curl -fsS http://127.0.0.1:3001/ >/dev/null && echo "New app is ready"
```

### Add the new domain to Nginx

Point DNS `A` records for `agnesblow.com` and `www.agnesblow.com` to the Droplet's public IPv4 address. If there are `AAAA` records, they must point to this server too; otherwise remove them. Confirm Nginx is active and the domain is not already configured:

```sh
systemctl is-active nginx
nginx -T | grep -n 'server_name'
```

Create a new `/etc/nginx/sites-available/agnesblow.com` file. This is a new server block for this domain; it does not replace or edit the unrelated React site's virtual host:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name agnesblow.com www.agnesblow.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable only the new domain and validate the full Nginx configuration before reloading:

```sh
ln -s /etc/nginx/sites-available/agnesblow.com /etc/nginx/sites-enabled/agnesblow.com
nginx -t && systemctl reload nginx
curl -I http://agnesblow.com/
```

Once HTTP works and DNS has propagated, add HTTPS with Certbot:

```sh
apt install -y certbot python3-certbot-nginx
certbot --nginx -d agnesblow.com -d www.agnesblow.com
certbot renew --dry-run
```

Certbot may add an HTTPS server block to this new site's config. Check and reload Nginx after it completes. The proxy location should remain:

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

Verify the public site and public CSV URL:

```sh
curl -I https://agnesblow.com/
curl -fsS https://agnesblow.com/signups.csv
```

The CSV URL is public and contains emails and UTC signup timestamps. `noindex` and `no-store` headers do not restrict access.

### Roll back this domain

If you need to disable this deployment, disable only the new `agnesblow.com` virtual host. The unrelated React site and its Nginx config are not involved:

```sh
rm /etc/nginx/sites-enabled/agnesblow.com
nginx -t && systemctl reload nginx
```

### Updating this deployment

After pushing changes to `master`, update code and restart only this service. Do not pull into the old React site's document root:

```sh
cd /var/www/agnesblow

npm ci
npm test
npm run build
systemctl restart agnesblow
systemctl status agnesblow --no-pager
```

The CSV at `/var/lib/agnesblow/signups.csv` is untouched. Run one Node process so its write queue and per-IP rate limit remain effective. Back up the CSV to a protected location regularly.
