pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
# Team workspace prototype

Open `public/team.html` alongside the existing homepage. This adds a standalone WAO planning board without changing existing files.

## Preview
Run `python3 -m http.server 8000 --directory public` from the repository, then open http://localhost:8000/team.html.

## Implemented
- Responsive task board: Proposed, In progress, Review, Accepted.
- Contributor, reviewer, acceptance criteria, source-reference fields.
- Browser-local persistence and JSON snapshot export/import.
- Input rendering through textContent; imported JSON schema, size, and duplicate-ID checks.
- No remote requests from application JavaScript.

## Limitations
No connected model, synchronized team database, user authentication, identity verification, enforced approvals, on-chain access, or agent execution. Planning states are editable labels, not authorization evidence. Browser storage is not encrypted or a reliable backup. Export contains all task data; do not store secrets or confidential material. Export/import is manual snapshot replacement, not merging.

## Validation
Source inspection and HTML parsing performed during preparation. Browser interactions, accessibility, responsive layout, JavaScript runtime, and hosting remain untested. This is not production-ready.

## Team review acceptance checklist
- Add task, move it, reload, confirm persistence.
- Export/import round trip, cancel replacement, malformed JSON, oversized file, duplicate IDs.
- Confirm markup entered as text never executes.
- Keyboard navigation, mobile layout, unavailable local storage.
- Confirm no model calls, transactions, or automated execution.

## Publication
Hosting requires a separately connected service, review of account costs and access, and approval of an exact release. No automatic deployment workflow is added. Do not assume a private repository produces a private hosted website.
