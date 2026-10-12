# Glance — Deploy

Glance runs as **one Docker container** (tech-design D17): the Next.js `standalone` server, with SQLite and photos on a volume at `/data`. It must stay a single process (the sync bus is in memory), so run one container per family and don't scale it out.

## Build and run

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

## HTTPS with Caddy

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

## What's in `/data`

```
/data/glance.db            SQLite database (WAL: also glance.db-wal, glance.db-shm)
/data/photos/{account}/    uploaded photos: {id}.orig, {id}.display, {id}.thumb
/data/backups/             nightly database copies: glance-YYYY-MM-DD.db
```

## Backups

Every night (and at boot, once per UTC day) the server writes a consistent copy of the database with `VACUUM INTO` to `/data/backups/glance-YYYY-MM-DD.db` and keeps the 7 newest (tech-design §6.4). **These copies sit on the same disk as the live database, so the host must copy them off the machine.** Copy `/data/backups` and `/data/photos`; never copy the live `glance.db` file while the container runs.

For example, a cron job on the host that runs daily after 01:00 UTC, once the day's copy exists (the server makes it on its first hourly tick of each UTC day):

```sh
rsync -a /srv/glance/backups /srv/glance/photos backup-host:glance/
```

Any tool that copies files off the machine works (rsync, restic, borg, a NAS sync). Photos are never changed once written, so an incremental copy is enough.

## Restore

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

## Update

```sh
git pull
docker build -t glance .
docker stop glance && docker rm glance
docker run ...   # the same command as above
```

Migrations run on start. Open screens notice the new version and reload themselves when they are idle (tech-design §4.5).
