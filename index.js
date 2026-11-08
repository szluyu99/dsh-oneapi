/**
 * @szluyu99/dsh-oneapi — host half.
 *
 * Wraps the existing `@deepseek-ai/dsh-llm-pi-ai` provider configuration with:
 *   - a settings page (client half) that reads/edits the `oneapi` provider route,
 *   - a small HTTP API the client page drives (`/api/oneapi/*`),
 *   - agent tools so a session can inspect / test / configure OneAPI directly.
 *
 * The plugin does NOT own a second copy of the config: it reads and writes the
 * single `llm-pi-ai` entry through the sanctioned `configEditor` seam, stores the
 * API key through `credentials` (never in plain config), and sets the default
 * model through `agentDefaultModel`.
 */

export const name = 'oneapi';
export const inject = ['webServer', 'tools'];

const LLM_ENTRY_NAME = '@deepseek-ai/dsh-llm-pi-ai';
const OWN_ENTRY_NAME = '@szluyu99/dsh-oneapi';
const PROVIDER = 'oneapi';

function getConfigEditor(ctx) {
  try { return ctx.get('configEditor'); } catch { return undefined; }
}
function getCredentials(ctx) {
  try { return ctx.get('credentials'); } catch { return undefined; }
}
function getAgentDefaultModel(ctx) {
  try { return ctx.get('agentDefaultModel'); } catch { return undefined; }
}

/** Locate the llm-pi-ai Loader row plus its layered config values. */
function findLlmRow(ctx) {
  const editor = getConfigEditor(ctx);
  if (!editor || typeof editor.configuration !== 'function') return null;
  let rows;
  try { rows = editor.configuration(); } catch { return null; }
  if (!Array.isArray(rows)) return null;
  return rows.find((row) => {
    const e = (row && row.entry) || {};
    return e.name === LLM_ENTRY_NAME
      || e.patchId === 'llm-pi-ai'
      || e.id === 'llm-pi-ai'
      || e.id === 'include:llm-pi-ai';
  }) || null;
}

/** Locate this plugin's own Loader row (for the showInSidebar option). */
function findOwnRow(ctx) {
  const editor = getConfigEditor(ctx);
  if (!editor || typeof editor.configuration !== 'function') return null;
  let rows;
  try { rows = editor.configuration(); } catch { return null; }
  if (!Array.isArray(rows)) return null;
  return rows.find((row) => {
    const e = (row && row.entry) || {};
    return e.name === OWN_ENTRY_NAME
      || e.patchId === 'oneapi'
      || e.id === 'oneapi'
      || e.id === 'include:oneapi';
  }) || null;
}

/** Read the "show in sidebar" option (default true until explicitly turned off). */
function readShowInSidebar(ctx) {
  const row = findOwnRow(ctx);
  const cfg = (row && typeof row.override === 'object' && row.override) || {};
  return cfg.showInSidebar !== false;
}

/** Persist the "show in sidebar" option into this plugin's own config. */
async function saveShowInSidebar(ctx, value) {
  const editor = getConfigEditor(ctx);
  if (!editor || typeof editor.edit !== 'function') return { ok: false, error: 'configEditor 不可用' };
  const row = findOwnRow(ctx);
  if (!row) return { ok: false, error: '找不到插件自身配置条目' };
  try {
    await editor.edit(row.entry, (current) => ({ ...(current && typeof current === 'object' ? current : {}), showInSidebar: !!value }));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/** Read the current `oneapi` provider profile from the layered config. */
function readProvider(ctx) {
  const row = findLlmRow(ctx);
  if (!row) return { ok: false, error: '找不到 llm-pi-ai 配置条目' };
  const override = (row.override && typeof row.override === 'object') ? row.override : {};
  const inherited = (row.inherited && typeof row.inherited === 'object') ? row.inherited : {};
  const providers = { ...(inherited.providers || {}), ...(override.providers || {}) };
  const provider = providers[PROVIDER] || null;
  return { ok: true, provider, inheritedProvider: inherited.providers?.[PROVIDER] || null };
}

/** Derive the API-key credential ref name from the profile, with a sane fallback. */
function apiKeyRef(ctx) {
  const { provider } = readProvider(ctx);
  const env = provider?.apiKeyEnv;
  return (typeof env === 'string' && env.length > 0) ? env : 'ONEAPI_API_KEY';
}

async function readApiKeyStatus(ctx) {
  const credentials = getCredentials(ctx);
  const ref = apiKeyRef(ctx);
  if (!credentials || typeof credentials.describe !== 'function') {
    return { configured: false, writable: false, ref, error: 'credentials 服务不可用' };
  }
  try {
    const info = await credentials.describe(ref);
    return { configured: !!info?.configured, writable: !!info?.writable, ref, source: info?.source };
  } catch (err) {
    return { configured: false, writable: false, ref, error: String(err?.message || err) };
  }
}

async function resolveApiKey(ctx) {
  const credentials = getCredentials(ctx);
  const ref = apiKeyRef(ctx);
  if (!credentials || typeof credentials.resolve !== 'function') return null;
  try {
    const r = await credentials.resolve(ref);
    return (r && typeof r.value === 'string' && r.value.length > 0) ? r.value : null;
  } catch { return null; }
}

/** Edit the oneapi provider profile in place, keeping everything else untouched. */
async function editProvider(ctx, patch) {
  const editor = getConfigEditor(ctx);
  if (!editor || typeof editor.edit !== 'function') return { ok: false, error: 'configEditor 不可用' };
  const row = findLlmRow(ctx);
  if (!row) return { ok: false, error: '找不到 llm-pi-ai 配置条目' };
  try {
    await editor.edit(row.entry, (current, inherited) => {
      const cur = (current && typeof current === 'object') ? current : {};
      const base = (inherited && typeof inherited === 'object' && inherited.providers) ? inherited.providers : {};
      const providers = { ...(cur.providers || base) };
      const existing = (providers[PROVIDER] && typeof providers[PROVIDER] === 'object') ? providers[PROVIDER] : {};
      providers[PROVIDER] = { ...existing, ...patch };
      return { ...cur, providers };
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

async function readDefaultModel(ctx) {
  const svc = getAgentDefaultModel(ctx);
  if (!svc || typeof svc.currentSelection !== 'function') return { ok: false, error: 'agentDefaultModel 服务不可用' };
  try {
    const sel = svc.currentSelection();
    return { ok: true, selection: sel || null };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

async function saveDefaultModel(ctx, model) {
  const svc = getAgentDefaultModel(ctx);
  if (!svc || typeof svc.saveSelection !== 'function') return { ok: false, error: 'agentDefaultModel 服务不可用' };
  if (typeof model !== 'string' || model.length === 0) return { ok: false, error: 'defaultModel 不能为空' };
  try {
    let base = {};
    if (typeof svc.currentSelection === 'function') {
      try { base = svc.currentSelection() || {}; } catch { base = {}; }
    }
    await svc.saveSelection({ ...base, provider: PROVIDER, model });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/** Test connectivity by interrogating the gateway's model list. */
async function testConnection(ctx, baseURLOverride) {
  const { provider } = readProvider(ctx);
  const baseURL = (typeof baseURLOverride === 'string' && baseURLOverride.length > 0)
    ? baseURLOverride
    : provider?.baseURL;
  if (typeof baseURL !== 'string' || baseURL.length === 0) {
    return { ok: false, status: 0, error: '未配置 baseURL' };
  }
  const key = await resolveApiKey(ctx);
  const url = baseURL.replace(/\/+$/, '') + '/models';
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(15000),
    });
    const latencyMs = Date.now() - t0;
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    const data = body && body.data && Array.isArray(body.data) ? body.data : [];
    const ids = data.map((m) => (m && m.id)).filter((v) => typeof v === 'string' && v.length > 0);
    const errText = res.ok ? '' : (body?.error?.message || (typeof body?.error === 'string' ? body.error : '') || `HTTP ${res.status}`);
    return { ok: res.ok, status: res.status, latencyMs, modelCount: ids.length, modelIds: ids.slice(0, 300), error: errText };
  } catch (err) {
    return { ok: false, status: 0, latencyMs: Date.now() - t0, modelCount: 0, modelIds: [], error: String(err?.message || err) };
  }
}

/**
 * Pull the gateway's real model list and write it back into the provider config.
 * Models already known by id keep their rich metadata (contextWindow, reasoning
 * efforts, …); new ids are added as `{ id, name: id }` so defaults apply.
 */
async function syncModels(ctx) {
  const { provider } = readProvider(ctx);
  const baseURL = provider?.baseURL;
  if (typeof baseURL !== 'string' || baseURL.length === 0) return { ok: false, error: '未配置 baseURL' };
  const key = await resolveApiKey(ctx);
  const url = baseURL.replace(/\/+$/, '') + '/models';
  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
  if (!res.ok) {
    let body = null; try { body = await res.json(); } catch {}
    const errText = (body && body.error && (body.error.message || (typeof body.error === 'string' ? body.error : ''))) || `HTTP ${res.status}`;
    return { ok: false, status: res.status, error: errText || `HTTP ${res.status}` };
  }
  let body; try { body = await res.json(); } catch { return { ok: false, error: '网关返回了无法解析的响应' }; }
  const data = (body && body.data && Array.isArray(body.data)) ? body.data : [];
  const ids = data.map((m) => m && m.id).filter((v) => typeof v === 'string' && v.length > 0);
  if (ids.length === 0) return { ok: false, error: '网关未返回任何模型' };

  const existing = Array.isArray(provider?.models) ? provider.models : [];
  const byId = new Map(existing.map((m) => [m && m.id, m]));
  const seen = new Set();
  const merged = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const prev = byId.get(id);
    merged.push(prev && typeof prev === 'object' ? prev : { id, name: id });
  }
  const added = merged.filter((m) => !byId.has(m.id)).length;
  const removed = existing.filter((m) => !seen.has(m && m.id)).length;

  const r = await editProvider(ctx, { models: merged });
  if (!r.ok) return r;
  return { ok: true, synced: merged.length, added, removed, modelIds: ids };
}

/** Minimal chat-completion ping for one model. */
async function pingModel(endpoint, key, id) {
  const t0 = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({ model: id, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1, stream: false }),
      signal: AbortSignal.timeout(12000),
    });
    const latencyMs = Date.now() - t0;
    let error = '';
    if (!res.ok) {
      let b = null; try { b = await res.json(); } catch {}
      error = (b && b.error && (b.error.message || (typeof b.error === 'string' ? b.error : ''))) || `HTTP ${res.status}`;
    } else {
      try { await res.text(); } catch {} // drain the tiny response
    }
    return { id, ok: res.ok, status: res.status, latencyMs, error };
  } catch (err) {
    return { id, ok: false, status: 0, latencyMs: Date.now() - t0, error: String(err?.message || err) };
  }
}

/** Ping a single model by id (used by the per-model test button and agent tool). */
async function pingModelById(ctx, id) {
  const { provider } = readProvider(ctx);
  const baseURL = provider?.baseURL;
  if (typeof baseURL !== 'string' || baseURL.length === 0) return { id: id || '', ok: false, status: 0, latencyMs: 0, error: '未配置 baseURL' };
  if (typeof id !== 'string' || id.trim().length === 0) return { id: id || '', ok: false, status: 0, latencyMs: 0, error: '缺少模型 id' };
  const key = await resolveApiKey(ctx);
  const endpoint = baseURL.replace(/\/+$/, '') + '/chat/completions';
  return await pingModel(endpoint, key, id.trim());
}

/** Test every configured model with a minimal completion, 5 at a time. */
async function testModels(ctx, idsOverride) {
  const { provider } = readProvider(ctx);
  const baseURL = provider?.baseURL;
  if (typeof baseURL !== 'string' || baseURL.length === 0) return { ok: false, error: '未配置 baseURL' };
  const key = await resolveApiKey(ctx);
  let ids = Array.isArray(provider?.models)
    ? provider.models.map((m) => m && m.id).filter((v) => typeof v === 'string' && v.length > 0)
    : [];
  if (Array.isArray(idsOverride) && idsOverride.length > 0) ids = idsOverride.map((v) => String(v));
  if (ids.length === 0) return { ok: false, error: '没有可测试的模型' };
  const endpoint = baseURL.replace(/\/+$/, '') + '/chat/completions';

  const results = new Array(ids.length);
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const i = cursor++;
      if (i >= ids.length) return;
      results[i] = await pingModel(endpoint, key, ids[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, ids.length) }, () => worker()));

  const okCount = results.filter((r) => r && r.ok).length;
  return { ok: true, total: ids.length, okCount, failCount: ids.length - okCount, results };
}

function summarizeModels(provider) {
  const models = Array.isArray(provider?.models) ? provider.models : [];
  return models.map((m) => ({
    id: m?.id ?? '',
    name: m?.name ?? '',
    contextWindow: m?.contextWindow,
    maxTokens: m?.maxTokens,
    input: Array.isArray(m?.input) ? m.input : [],
    reasoningEfforts: (m?.reasoningEfforts === false) ? false : (m?.reasoningEfforts || null),
  }));
}

async function buildStatus(ctx) {
  const providerRead = readProvider(ctx);
  const provider = providerRead.provider || null;
  const apiKey = await readApiKeyStatus(ctx);
  const defaultModel = await readDefaultModel(ctx);
  return {
    ok: true,
    showInSidebar: readShowInSidebar(ctx),
    provider: {
      displayName: provider?.displayName ?? '',
      api: provider?.api ?? '',
      baseURL: provider?.baseURL ?? '',
      apiKeyEnv: provider?.apiKeyEnv ?? '',
      defaultContextWindow: provider?.defaultContextWindow,
      defaultMaxTokens: provider?.defaultMaxTokens,
    },
    apiKey,
    defaultModel: defaultModel.selection || null,
    defaultModelError: defaultModel.ok ? '' : (defaultModel.error || ''),
    models: summarizeModels(provider),
    modelCount: summarizeModels(provider).length,
  };
}

// ---------------------------------------------------------------------------
// HTTP API (driven by the client settings page)
// ---------------------------------------------------------------------------

function sendJson(res, code, obj) {
  try { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); } catch { /* headers already sent */ }
  try { res.end(JSON.stringify(obj)); } catch { /* stream already closed */ }
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    let done = false;
    const finish = (obj) => { if (!done) { done = true; resolve(obj); } };
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) { chunks.length = 0; finish({}); try { req.destroy(); } catch {} }
      else chunks.push(chunk);
    });
    req.on('end', () => {
      if (done) return;
      let text = '';
      try { text = Buffer.concat(chunks).toString('utf8'); } catch { text = ''; }
      try { finish(JSON.parse(text || '{}')); } catch { finish({}); }
    });
    req.on('error', () => finish({}));
  });
}

function authorityOf(value) {
  if (!value) return null;
  try { return new URL(String(value)).host.toLowerCase(); } catch { return null; }
}

/** Only accept same-machine requests so a random site cannot drive local config. */
function sameOriginOk(req) {
  const headers = req.headers || {};
  const host = String(headers.host || '');
  if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(host)) return false;
  for (const a of [authorityOf(headers.origin), authorityOf(headers.referer)]) {
    if (a && a !== host.toLowerCase()) return false;
  }
  return true;
}

function fenceReject(ctx, req, res) {
  let conn;
  try { conn = ctx.get('connection'); } catch { conn = undefined; }
  if (!conn) { try { conn = Reflect.get(ctx, 'connection'); } catch { conn = undefined; } }
  if (!conn) { try { conn = ctx.root && ctx.root.connection; } catch { conn = undefined; } }
  if (conn && typeof conn.requestRejection === 'function') {
    try {
      const r = conn.requestRejection({ headers: req.headers });
      if (r !== undefined) {
        res.statusCode = typeof r === 'number' ? r : 403;
        try { res.end(); } catch {}
        return true;
      }
    } catch {}
  }
  return false;
}

function handleRoute(ctx) {
  return async (req, res) => {
    if (fenceReject(ctx, req, res)) return;
    if (!sameOriginOk(req)) { sendJson(res, 403, { ok: false, error: '只接受本机同源请求' }); return; }

    let url;
    try { url = new URL(req.url || '/', 'http://127.0.0.1'); } catch { sendJson(res, 400, { ok: false, error: 'bad url' }); return; }
    const pathname = url.pathname || '/';

    if (req.method === 'GET' && pathname === '/api/oneapi/status') {
      try { sendJson(res, 200, await buildStatus(ctx)); }
      catch (err) { sendJson(res, 500, { ok: false, error: String(err?.message || err) }); }
      return;
    }

    if (req.method === 'POST' && pathname === '/api/oneapi/test') {
      const body = await readBody(req);
      try { sendJson(res, 200, await testConnection(ctx, body?.baseURL)); }
      catch (err) { sendJson(res, 500, { ok: false, error: String(err?.message || err) }); }
      return;
    }

    if (req.method === 'POST' && pathname === '/api/oneapi/save') {
      const body = await readBody(req);
      const results = [];
      const patch = {};
      if (typeof body?.displayName === 'string' && body.displayName.trim().length > 0) patch.displayName = body.displayName.trim();
      if (typeof body?.baseURL === 'string' && body.baseURL.trim().length > 0) patch.baseURL = body.baseURL.trim();

      if (Object.keys(patch).length > 0) {
        const r = await editProvider(ctx, patch);
        results.push({ field: 'provider', ...r });
      }

      if (typeof body?.showInSidebar === 'boolean') {
        results.push({ field: 'showInSidebar', ...(await saveShowInSidebar(ctx, body.showInSidebar)) });
      }

      if (body?.apiKey !== undefined && body.apiKey !== null && body.apiKey !== '') {
        const key = String(body.apiKey);
        const credentials = getCredentials(ctx);
        if (!credentials || typeof credentials.set !== 'function') {
          results.push({ field: 'apiKey', ok: false, error: 'credentials 服务不可用' });
        } else {
          try {
            await credentials.set(apiKeyRef(ctx), key);
            results.push({ field: 'apiKey', ok: true });
          } catch (err) {
            results.push({ field: 'apiKey', ok: false, error: String(err?.message || err) });
          }
        }
      }

      if (typeof body?.defaultModel === 'string' && body.defaultModel.trim().length > 0) {
        const r = await saveDefaultModel(ctx, body.defaultModel.trim());
        results.push({ field: 'defaultModel', ...r });
      }

      const allOk = results.length > 0 && results.every((r) => r.ok);
      sendJson(res, 200, { ok: allOk, results });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/oneapi/sync') {
      try { sendJson(res, 200, await syncModels(ctx)); }
      catch (err) { sendJson(res, 500, { ok: false, error: String(err?.message || err) }); }
      return;
    }

    if (req.method === 'POST' && pathname === '/api/oneapi/test-models') {
      try { sendJson(res, 200, await testModels(ctx)); }
      catch (err) { sendJson(res, 500, { ok: false, error: String(err?.message || err) }); }
      return;
    }

    if (req.method === 'POST' && pathname === '/api/oneapi/test-model') {
      const body = await readBody(req);
      try { sendJson(res, 200, await pingModelById(ctx, body?.id)); }
      catch (err) { sendJson(res, 500, { ok: false, error: String(err?.message || err) }); }
      return;
    }

    sendJson(res, 404, { ok: false, error: 'not found' });
  };
}

// ---------------------------------------------------------------------------
// Agent tools
// ---------------------------------------------------------------------------

const textOutput = {
  schema: { type: 'object', properties: {}, additionalProperties: true },
  render: (_a, v) => [{ type: 'text', text: typeof v === 'string' ? v : JSON.stringify(v, null, 2) }],
};

function safe(v) {
  if (v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  try { return JSON.parse(JSON.stringify(v)); } catch { return String(v); }
}

function tool(ctx, spec) {
  return ctx.tools.register({
    ...spec,
    output: spec.output || textOutput,
    async execute(args, exec) {
      return safe(await spec.execute(args, exec));
    },
  });
}

export function apply(ctx, config) {
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: '/api/oneapi', handler: handleRoute(ctx) }), 'oneapi.routes');

  tool(ctx, {
    name: 'oneapi_status',
    description: '查看 OneAPI 网关的当前配置：provider 路由（displayName/baseURL/api/默认上下文窗口）、API key 是否已配置、默认模型、以及已注册的模型清单（id/name/contextWindow/input）。',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      return await buildStatus(ctx);
    },
  });

  tool(ctx, {
    name: 'oneapi_test',
    description: '测试 OneAPI 网关连通性：请求 {baseURL}/models 并返回 HTTP 状态、耗时与网关返回的模型 id 列表（可与本地配置的模型清单对照）。',
    parameters: {
      type: 'object',
      properties: {
        baseURL: { type: 'string', description: '可选，覆盖当前配置的 baseURL 进行测试' },
      },
      additionalProperties: false,
    },
    async execute(args) {
      return await testConnection(ctx, args?.baseURL);
    },
  });

  tool(ctx, {
    name: 'oneapi_configure',
    description: '修改 OneAPI 网关配置：更新 provider 的 displayName/baseURL、写入 API key（存入 credentials，不落明文配置）、切换默认模型（provider 固定为 oneapi）、或开关「在左侧边栏显示」。只更新传入的字段。',
    parameters: {
      type: 'object',
      properties: {
        displayName: { type: 'string', description: '可选，provider 显示名' },
        baseURL: { type: 'string', description: '可选，网关地址，如 https://oneapi-comate.baidu-int.com/v1' },
        apiKey: { type: 'string', description: '可选，新的 API key（写入 credentials，空字符串不会写入）' },
        defaultModel: { type: 'string', description: '可选，默认模型 id，如 DeepSeek-V4-Pro' },
        showInSidebar: { type: 'boolean', description: '可选，是否在 DSH 左侧边栏显示 OneAPI 面板（true/false）' },
      },
      additionalProperties: false,
    },
    async execute(args) {
      const results = [];
      const patch = {};
      if (typeof args?.displayName === 'string' && args.displayName.trim().length > 0) patch.displayName = args.displayName.trim();
      if (typeof args?.baseURL === 'string' && args.baseURL.trim().length > 0) patch.baseURL = args.baseURL.trim();
      if (Object.keys(patch).length > 0) results.push({ field: 'provider', ...(await editProvider(ctx, patch)) });

      if (typeof args?.showInSidebar === 'boolean') {
        results.push({ field: 'showInSidebar', ...(await saveShowInSidebar(ctx, args.showInSidebar)) });
      }

      if (typeof args?.apiKey === 'string' && args.apiKey.length > 0) {
        const credentials = getCredentials(ctx);
        if (!credentials || typeof credentials.set !== 'function') {
          results.push({ field: 'apiKey', ok: false, error: 'credentials 服务不可用' });
        } else {
          try { await credentials.set(apiKeyRef(ctx), args.apiKey); results.push({ field: 'apiKey', ok: true }); }
          catch (err) { results.push({ field: 'apiKey', ok: false, error: String(err?.message || err) }); }
        }
      }

      if (typeof args?.defaultModel === 'string' && args.defaultModel.trim().length > 0) {
        results.push({ field: 'defaultModel', ...(await saveDefaultModel(ctx, args.defaultModel.trim())) });
      }

      if (results.length === 0) return { ok: false, error: '没有传入任何可更新的字段' };
      return { ok: results.every((r) => r.ok), results };
    },
  });

  tool(ctx, {
    name: 'oneapi_sync_models',
    description: '从 OneAPI 网关拉取真实模型列表并写回 provider 配置。已知模型（按 id 匹配）保留其上下文窗口/推理等级等元数据，新模型以 {id,name:id} 加入。返回 synced/added/removed 与模型 id 列表。',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      return await syncModels(ctx);
    },
  });

  tool(ctx, {
    name: 'oneapi_test_models',
    description: '对已配置的每个模型各发一次最小 chat-completion 探活（max_tokens:1），并发 5，返回每个模型的 ok/status/latencyMs/error，用于实时了解哪些模型可用。',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      return await testModels(ctx);
    },
  });

  tool(ctx, {
    name: 'oneapi_test_model',
    description: '对单个已配置模型发一次最小 chat-completion 探活（max_tokens:1），返回该模型的 ok/status/latencyMs/error。',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: '要测试的模型 id，如 DeepSeek-V4-Pro' } },
      required: ['id'],
      additionalProperties: false,
    },
    async execute(args) {
      return await pingModelById(ctx, args?.id);
    },
  });
}
