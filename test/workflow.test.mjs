pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, verify } from 'node:crypto';
import { createApp } from '../server/index.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-mvp-test-'));
const options = { dbPath: path.join(dir, 'test.db'), keyFile: path.join(dir, 'audit.pem') };
let fixture, server, base, project, task, contributorTask, ownerCookie, reviewerCookie, outsiderCookie;
async function start() { fixture = createApp(options); server = fixture.app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = 'http://127.0.0.1:' + server.address().port; }
async function request(url, { cookie = '', body, method = body === undefined ? 'GET' : 'POST', origin } = {}) {
  const response = await fetch(base + '/api/workspace' + url, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
before(start);
after(async () => { await new Promise(resolve => server.close(resolve)); fixture.db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

test('local accounts, cookie access, and cross-origin protection', async () => {
  assert.equal((await request('/projects')).status, 401);
  const a = await request('/auth/register', { body: { username: 'builder', password: 'local-password-for-tests' } });
  const b = await request('/auth/register', { body: { username: 'reviewer', password: 'another-local-password' } });
  const c = await request('/auth/register', { body: { username: 'outsider', password: 'outsider-local-password' } });
  assert.equal(a.status, 200); assert.equal(b.status, 200); assert.equal(c.status, 200);
  ownerCookie = a.cookie; reviewerCookie = b.cookie; outsiderCookie = c.cookie;
  assert.equal((await request('/auth/login', { body: { username: 'builder', password: 'incorrect-password' } })).status, 401);
  assert.equal((await request('/projects', { cookie: ownerCookie, body: {}, origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await request('/me', { cookie: ownerCookie })).data.user.username, 'builder');
});
test('projects persist scoped briefs, assignments, and private membership', async () => {
  const created = await request('/projects', { cookie: ownerCookie, body: { title: 'Synthetic eUSD application', idea: 'Explore an invoice matching workflow using synthetic data', audience: 'Developers', outcome: 'A testable local reconciliation prototype', useCase: 'eusd' } });
  assert.equal(created.status, 201); project = created.data.id;
  assert.equal(created.data.brief.mode, 'mock-planner');
  assert.ok(created.data.brief.trackRequirements.some(value => value.includes('synthetic invoice')));
  assert.ok(created.data.brief.trackRequirements.some(value => value.includes('disabled')));
  assert.equal((await request('/projects/' + project, { cookie: outsiderCookie })).status, 403);
  const data = (await request('/projects/' + project, { cookie: ownerCookie })).data;
  assert.equal(data.agents.length, 5); assert.equal(data.tasks.length, 4); assert.equal(data.checklist.length, 4);
  task = data.tasks[0]; contributorTask = data.tasks[1];
  assert.equal((await request('/projects/' + project + '/members', { cookie: ownerCookie, body: { username: 'reviewer', role: 'reviewer' } })).status, 200);
  assert.equal((await request('/projects/' + project + '/members', { cookie: reviewerCookie, body: { username: 'outsider', role: 'contributor' } })).status, 403);
  assert.equal((await request('/community')).data.length, 0);
  await request('/projects/' + project + '/publish', { cookie: ownerCookie, body: { visibility: 'community' } });
  const publicData = (await request('/community')).data;
  assert.equal(publicData.length, 1); assert.ok(!('brief' in publicData[0])); assert.ok(!('evidence' in publicData[0]));
});
test('human authorization, independent review, and exact-version acceptance are enforced', async () => {
  const taskUrl = '/tasks/' + task.id;
  assert.equal((await request(taskUrl + '/run', { cookie: ownerCookie, body: {} })).status, 409);
  assert.equal((await request(taskUrl + '/authorize', { cookie: ownerCookie, body: { revision: 9 } })).status, 409);
  assert.equal((await request(taskUrl + '/authorize', { cookie: ownerCookie, body: { revision: task.revision } })).status, 200);
  const run = await request(taskUrl + '/run', { cookie: ownerCookie, body: {} });
  assert.equal(run.status, 200); assert.equal(run.data.mode, 'mock');
  const review = { revision: task.revision, evidenceHash: run.data.evidenceHash, verdict: 'pass', notes: 'Reviewed the exact mock artifact and its stated limitations.' };
  assert.equal((await request(taskUrl + '/review', { cookie: ownerCookie, body: review })).status, 403);
  assert.equal((await request(taskUrl + '/review', { cookie: reviewerCookie, body: { ...review, evidenceHash: 'stale' } })).status, 409);
  assert.equal((await request(taskUrl + '/review', { cookie: reviewerCookie, body: review })).status, 200);
  assert.equal((await request(taskUrl + '/accept', { cookie: reviewerCookie, body: { ...review, note: 'A reviewer cannot accept for the owner.' } })).status, 403);
  assert.equal((await request(taskUrl + '/accept', { cookie: ownerCookie, body: { ...review, note: 'Accepted only as a local mock workflow fixture.' } })).status, 200);
  assert.equal((await request(taskUrl + '/wisdom', { cookie: ownerCookie, body: { content: 'Mock output must never be treated as verified implementation evidence.' } })).status, 409);
  const state = (await request('/projects/' + project, { cookie: ownerCookie })).data;
  assert.equal(state.agents.reduce((n, a) => n + a.reputation, 0), 0);
});
test('contributor evidence earns reputation once, supports wisdom, and revisions invalidate approvals', async () => {
  const taskUrl = '/tasks/' + contributorTask.id;
  await request(taskUrl + '/authorize', { cookie: ownerCookie, body: { revision: 1 } });
  const submitted = await request(taskUrl + '/submit', { cookie: ownerCookie, body: { evidence: 'Synthetic test evidence: this local API fixture checks that data is stored and bound to a hash. No production or financial service was called.' } });
  assert.equal(submitted.status, 200);
  const binding = { revision: 1, evidenceHash: submitted.data.evidenceHash };
  await request(taskUrl + '/review', { cookie: reviewerCookie, body: { ...binding, verdict: 'pass', notes: 'The submitted synthetic evidence and scope have been reviewed.' } });
  assert.equal((await request(taskUrl + '/accept', { cookie: ownerCookie, body: { ...binding, note: 'Accepted for this local integration test only.' } })).status, 200);
  assert.equal((await request(taskUrl + '/accept', { cookie: ownerCookie, body: { ...binding, note: 'A replay must not issue more reputation.' } })).status, 409);
  assert.equal((await request(taskUrl + '/wisdom', { cookie: ownerCookie, body: { content: 'Bind acceptance to the actual evidence hash and task revision, and reject stale reviews.' } })).status, 201);
  let state = (await request('/projects/' + project, { cookie: ownerCookie })).data;
  assert.equal(state.agents.reduce((n, a) => n + a.reputation, 0), 10); assert.equal(state.wisdom.length, 1);
  await request(taskUrl + '/revise', { cookie: ownerCookie, body: { criteria: 'A changed scope needs a new human authorization and fresh evidence.' } });
  state = (await request('/projects/' + project, { cookie: ownerCookie })).data;
  const revised = state.tasks.find(t => t.id === contributorTask.id);
  assert.equal(revised.revision, 2); assert.equal(revised.status, 'proposed'); assert.equal(revised.evidence_hash, null);
  assert.equal((await request(taskUrl + '/run', { cookie: ownerCookie, body: {} })).status, 409);
});
test('integration adapters are local fixtures and all financial actions remain disabled', async () => {
  const integration = '/projects/' + project + '/integrations';
  const data = await request(integration, { cookie: ownerCookie, body: { adapter: 'wao-of-waos', action: 'task_propose' } });
  assert.equal(data.status, 200); assert.equal(data.data.mode, 'MOCK_LOCAL_ONLY'); assert.equal(data.data.externally_submitted, false); assert.equal(data.data.financial_actions, false);
  for (const action of ['sign', 'broadcast', 'transfer', 'issue', 'activate']) assert.equal((await request(integration, { cookie: ownerCookie, body: { adapter: 'tokenization', action } })).status, 400);
});
test('checklists and signed audit chains survive a server restart', async () => {
  const state = (await request('/projects/' + project, { cookie: ownerCookie })).data;
  await request('/projects/' + project + '/checklist', { cookie: ownerCookie, body: { id: state.checklist[0].id, done: true } });
  const exported = (await request('/projects/' + project + '/export', { cookie: ownerCookie })).data;
  let previous = '0'.repeat(64);
  for (const event of exported.audit) {
    assert.equal(event.previous_hash, previous);
    assert.equal(event.hash, createHash('sha256').update(event.payload).digest('hex'));
    assert.equal(verify(null, Buffer.from(event.payload), exported.public_key, Buffer.from(event.signature, 'base64')), true);
    previous = event.hash;
  }
  await new Promise(resolve => server.close(resolve)); fixture.db.close(); await start();
  const restarted = (await request('/projects/' + project, { cookie: ownerCookie })).data;
  assert.equal(restarted.checklist.find(c => c.id === state.checklist[0].id).done, 1);
  assert.equal(restarted.wisdom.length, 1); assert.equal(restarted.members.length, 2);
  assert.equal((await request('/auth/logout', { cookie: ownerCookie, body: {} })).status, 200);
  assert.equal((await request('/projects', { cookie: ownerCookie })).status, 401);
});
