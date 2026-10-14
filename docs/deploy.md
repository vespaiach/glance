# Glance — Deploy

Glance runs as **one Node process** with SQLite and photos in a data folder (tech-design D17). It must stay a single process (the sync bus is in memory), so run one per family and don't scale it out. There are two ways to host it:

- **[shipit](https://github.com/vespaiach/shipit)** on a Debian 13 VPS (the main way): builds from GitHub, systemd, Caddy with HTTPS, releases with rollback.
- **Docker** (the second way): one container with the data on a volume, Caddy in front.

## Deploy with shipit

### Setup

Once per VPS:

```sh
git clone https://github.com/vespaiach/shipit.git && sudo shipit/install.sh
sudo shipit setup
```

### First deploy

```sh
sudo shipit deploy https://github.com/vespaiach/glance
```

It asks:

- the **domain**, e.g. `glance.example.com`;
- **Create a PostgreSQL database? [y/N]**: answer **N** (the default). Glance keeps SQLite in `DATA_DIR`, so the app config gets an empty `DATABASE`;
- a value for each key of [`.env.example`](../.env.example) that the app's env file doesn't have yet, with hidden input. Example values are never used, so type each one:

| Key | Value |
|---|---|
| `DATA_DIR` | `/var/lib/glance`. Outside the release folders, so it survives deploys and rollbacks. |
| `APP_URL` | Not asked: shipit writes `https://<domain>`. Sign-in links point here and writes must come from this origin. |
| `SMTP_URL` | Nodemailer SMTP URL for sign-in emails, e.g. `smtps://user:password@smtp.example.com:465`. |
| `MAIL_FROM` | Sender of sign-in emails, e.g. `Glance <glance@example.com>`. |

Values can't contain quotes or backslashes (shipit refuses them). `PORT` and `NODE_ENV` come from the systemd unit. Change a value later with `sudo shipit env glance`, which restarts the app. Bad or missing config stops the app at boot, and `sudo shipit logs glance` names the bad variables (never their values).

[`deploy.conf`](../deploy.conf) builds with `npm ci` and `npm run build` and runs one process, `next start` on `127.0.0.1:$PORT`. The health check asks `/signin` for a 200. The log's warning that `next start` doesn't work with `output: "standalone"` is expected: the setting is there for the Docker image, and `next start` serves the normal build.

**This first deploy ends with a failed health check**, because shipit doesn't create `/var/lib/glance` and the `glance` user can't create a folder in `/var/lib`. The deploy creates that user, so now make the folder:

```sh
sudo install -d -m 700 -o glance -g glance /var/lib/glance
```

### App config

Set `HEALTH_FAIL=rollback` in `/etc/shipit/apps/glance.conf`, so a release that fails `/signin` is switched back. It then reads like this:

```sh
REPO=https://github.com/vespaiach/glance
BRANCH=main
DOMAIN=glance.example.com
PORT=3001
DATABASE=''
HEALTH_FAIL=rollback
```

Then apply it, which also starts the app with its folder in place:

```sh
sudo shipit deploy glance
```

### Update and rollback

```sh
sudo shipit deploy glance              # build the branch, switch, restart, check /signin
sudo shipit deploy glance --ref <sha>  # one commit
sudo shipit rollback glance            # back to the previous release
sudo shipit status glance              # releases, process and health
sudo shipit logs glance                # follow the app's log
```

**Migrations run when the app starts** (tech-design §6.4), not as a deploy step. So when a new release fails its health check and `HEALTH_FAIL=rollback` switches back, the database keeps the new release's migrations, and the previous release runs on the newer schema. Every migration must keep the previous release working: add tables and columns, and leave renames and drops to a later release. Open screens notice a new version and reload themselves when they are idle (tech-design §4.5).

### Where things live

```
/var/lib/glance/glance.db             SQLite database (WAL: also glance.db-wal, glance.db-shm)
/var/lib/glance/photos/{account}/     uploaded photos: {id}.orig, {id}.display, {id}.thumb
/var/lib/glance/backups/              nightly database copies: glance-YYYY-MM-DD.db (7 newest)
/etc/glance/env                       secrets (root, 600; edit with sudo shipit env glance)
/opt/glance/current                   the running release
/var/log/shipit/glance/               logs (sudo shipit logs glance)
```

### Backups

Every night (and at boot, once per UTC day) Glance writes a consistent copy of the database with `VACUUM INTO` to `/var/lib/glance/backups/glance-YYYY-MM-DD.db` and keeps the 7 newest (tech-design §6.4). shipit only backs up PostgreSQL databases, so `shipit backup`, `shipit restore` and the backup line of `shipit status` don't apply to Glance.

**The copies sit on the VPS's own disk, so copy them off the machine.** Copy `backups/` and `photos/`, never the live `glance.db`: a copy of a SQLite file taken while the app writes to it can be torn. From another machine, for example a daily cron job after 01:00 UTC, once the day's copy exists:

```sh
rsync -a --rsync-path="sudo rsync" admin@vps.example.com:/var/lib/glance/backups /var/lib/glance/photos glance-backups/
```

`admin` is the VPS account you log in with. Photos are never changed once written, so an incremental copy is enough. Your VPS provider's snapshots also count as an off-machine copy.

### Restore

1. If the folder is gone (a new VPS), deploy first (see above), then copy `backups/` and `photos/` back into `/var/lib/glance/`.
2. Put the chosen copy in place with the app stopped:
   ```sh
   sudo systemctl stop glance.target
   sudo cp /var/lib/glance/backups/glance-2026-10-01.db /var/lib/glance/glance.db
   sudo rm -f /var/lib/glance/glance.db-wal /var/lib/glance/glance.db-shm
   sudo chown -R glance:glance /var/lib/glance
   sudo systemctl start glance.target
   ```
3. On each screen: Settings › Account › **Sign out**, then sign in again. A screen still holds data newer than the backup, and signing out clears it, so it loads the restored data from scratch. Changes made after the backup are lost.

Photos uploaded after the backup stay on disk without a row and are never shown.

## Deploy with Docker

The Docker image is the Next.js `standalone` server, with SQLite and photos on a volume at `/data`.

### Build and run

```sh
docker build -t glance .

docker run -d --name glance --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -v /srv/glance:/data \
  -e APP_URL=https://glance.example.com \
  -e SMTP_URL=smtps://user:password@smtp.example.com:465 \
  -e 'MAIL_FROM=Glance <glance@example.com>' \
  glance
```

The container runs as the `node` user (uid 1000). A bind-mounted folder like `/srv/glance` must be writable by it: `sudo chown 1000:1000 /srv/glance`. A named volume (`-v glance-data:/data`) needs nothing.

| Variable | Required | Meaning |
|---|---|---|
| `APP_URL` | yes | The public URL the screens open, e.g. `https://glance.example.com`. Sign-in links point here, write requests must come from this origin, and an `https:` URL makes the session cookie `Secure`. |
| `SMTP_URL` | yes | Nodemailer SMTP URL for sign-in emails, e.g. `smtps://user:password@host:465`. |
| `MAIL_FROM` | yes | Sender of sign-in emails, e.g. `Glance <glance@example.com>`. |
| `DATA_DIR` | no | Set to `/data` by the image. |
| `PORT` | no | Set to `3000` by the image. |

Bad or missing config stops the container at boot. `docker logs glance` names the bad variables (never their values). Migrations run at every start, before the server takes requests.

### HTTPS with Caddy

The service worker (offline start, OFF-06/07) only works over HTTPS, so put [Caddy](https://caddyserver.com) in front of the container. It gets and renews the certificate itself:

```caddyfile
glance.example.com {
	reverse_proxy 127.0.0.1:3000
}
```

- `reverse_proxy` streams responses, so the sync stream (`/api/sync/stream`, SSE) works without extra settings.
- The sign-in rate limit counts per IP from the **last** `X-Forwarded-For` entry, the one Caddy writes. Don't put another proxy between Caddy and the container, and don't publish port 3000 beyond `127.0.0.1`, or every screen shares one rate-limit bucket.
- `APP_URL` must be exactly the address in the Caddyfile (`https://glance.example.com`), or writes fail the Origin check.
- On a home server with no public name, use a name on your LAN with Caddy's `tls internal` and trust Caddy's root certificate on each screen.

### What's in `/data`

```
/data/glance.db            SQLite database (WAL: also glance.db-wal, glance.db-shm)
/data/photos/{account}/    uploaded photos: {id}.orig, {id}.display, {id}.thumb
/data/backups/             nightly database copies: glance-YYYY-MM-DD.db
```

### Backups

Every night (and at boot, once per UTC day) the server writes a consistent copy of the database with `VACUUM INTO` to `/data/backups/glance-YYYY-MM-DD.db` and keeps the 7 newest (tech-design §6.4). **These copies sit on the same disk as the live database, so the host must copy them off the machine.** Copy `/data/backups` and `/data/photos`; never copy the live `glance.db` file while the container runs.

For example, a cron job on the host that runs daily after 01:00 UTC, once the day's copy exists (the server makes it on its first hourly tick of each UTC day):

```sh
rsync -a /srv/glance/backups /srv/glance/photos backup-host:glance/
```

Any tool that copies files off the machine works (rsync, restic, borg, a NAS sync). Photos are never changed once written, so an incremental copy is enough.

### Restore

1. `docker stop glance`.
2. Copy the chosen backup over the database and remove the WAL files:
   ```sh
   cp backups/glance-2026-10-01.db /srv/glance/glance.db
   rm -f /srv/glance/glance.db-wal /srv/glance/glance.db-shm
   ```
3. Copy `photos/` back into `/srv/glance/photos` (on a new machine, also `chown -R 1000:1000 /srv/glance`).
4. `docker start glance`.
5. On each screen: Settings › Account › **Sign out**, then sign in again. A screen still holds data newer than the backup, and signing out clears it, so it loads the restored data from scratch. Changes made after the backup are lost.

Photos uploaded after the backup stay on disk without a row and are never shown.

### Update

```sh
git pull
docker build -t glance .
docker stop glance && docker rm glance
docker run ...   # the same command as above
```

Migrations run on start. Open screens notice the new version and reload themselves when they are idle (tech-design §4.5).
