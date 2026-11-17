pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
# Website scaffold

Status: source scaffold only; not deployed or browser-tested.

## Included
- Static responsive homepage and independent-project disclaimer.
- Official-source links; no retrieval or AI model integration.
- Local fixed-template builder brief and non-persistent WAO checklist.
- Cloudflare Workers static asset configuration.

## Local preview
With Python 3 installed: `python3 -m http.server 8000 --directory public`, then open localhost port 8000. This static preview does not test the Cloudflare deployment configuration.

## Release gates
- Browser-test required inputs, safe rendering, reset, keyboard access, mobile layout, and source links.
- Verify Cloudflare configuration with the selected Wrangler version.
- Review hosting account, costs, deployment permissions, and exact release version before publication.
- No automatic deployment workflow is included.

## Not included
AI answers, source retrieval, authentication, persistent workspaces, enforced approvals, audit logs, rate limits, blockchain access, or wallet actions. No dependency installation, paid usage, or publication is authorized by this commit.
