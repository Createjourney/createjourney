# CreateJourney custom domain rollout

## Confirmed ownership (2026-10-30)
- Registrar and DNS: Cloudflare.
- Domain: `gocreatejourney.com`, active, expiration 2028-08-24, auto-renew on.
- DNS currently contains 3 Cloudflare email routing MX records, one DKIM TXT, and one SPF TXT. Preserve all of these.
- Existing app: GitHub Pages at `https://createjourney.github.io/createjourney/`.

## Proposed production routing
- `app.gocreatejourney.com`: existing CreateJourney web application hosted on GitHub Pages.
- `gocreatejourney.com` and `www.gocreatejourney.com`: public landing site, **not yet deployed**. Do not point apex/www at the application or overwrite email DNS records without a separate landing-site plan.

## Cutover procedure (requires DNS access)
1. In Cloudflare DNS add **CNAME** `app` pointing to `createjourney.github.io`. Set **DNS only** (gray cloud) during initial GitHub Pages certificate provisioning.
2. In GitHub repository Settings → Pages → Custom domain enter `app.gocreatejourney.com` and save. GitHub may require verification of the domain before allowing it.
3. Ensure the repository root `CNAME` matches `app.gocreatejourney.com`. Merge the associated PR only as part of the planned cutover; do not set two conflicting custom domains.
4. Wait for DNS validation and HTTPS certificate issuance. Enable **Enforce HTTPS** when available. Verify authenticated login, Supabase calls, board tap flows, and relative asset paths on the new hostname.
5. Update any auth redirect allowlists / callback URLs in Supabase only after checking the current settings; retain existing GitHub Pages URLs during migration. Keep the original Pages URL available for rollback until validated.

## Rollback
- Remove custom domain in GitHub Pages Settings and revert `CNAME` change if cutover fails. Remove only the new `app` DNS record; leave existing MX/TXT records intact.

## Important
Creating this PR does **not** configure Cloudflare DNS, GitHub Pages Settings, or deploy the public landing page. Do not claim the custom domain is live until an HTTPS request and app flows pass verification.
