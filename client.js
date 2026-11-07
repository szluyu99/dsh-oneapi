window.__ModuleLoader__.load({
  id: 'dsh-oneapi',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useRef, useState, useCallback } = React;

    const SLOT = 'settings.section';
    const ID = 'oneapi';
    const ORDER = 35;
    const LABEL = 'OneAPI';
    const SIDEBAR_ORDER = 25;

    // ---- Module-level "show in sidebar" state ----
    // Shared between the Panel (the toggle) and apply() (slot registration), so
    // flipping the switch re-registers/unregisters the sidebar slots LIVE, with
    // no page reload.
    let sidebarShown = true;
    const sidebarSubs = new Set();
    const getSidebarShown = () => sidebarShown;
    function setSidebarShown(next) {
      if (sidebarShown === next) return;
      sidebarShown = next;
      for (const fn of Array.from(sidebarSubs)) { try { fn(next); } catch {} }
    }
    function subscribeSidebarShown(fn) {
      sidebarSubs.add(fn);
      fn(sidebarShown); // immediate initial delivery
      return () => { sidebarSubs.delete(fn); };
    }

    // Theme-token CSS with fallbacks (only tokens known to exist are used).
    const CSS = `
      .oapi-wrap { padding: 20px 22px; max-width: 1080px; font-size: 14px; line-height: 1.55;
        color: var(--dsw-alias-label-primary, #1f2328); }
      .oapi-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
      .oapi-title { font-size: 18px; font-weight: 650; margin: 0; }
      .oapi-sub { color: var(--dsw-alias-label-secondary, #6b7280); font-size: 13px; margin-top: 2px; }
      .oapi-actions { display: flex; gap: 8px; }
      .oapi-card { border: 1px solid var(--dsw-alias-border, rgba(127,127,127,.18)); border-radius: 10px;
        padding: 16px 18px; margin-bottom: 16px; background: var(--dsw-alias-bg-base, #fff); }
      .oapi-card h3 { margin: 0 0 12px; font-size: 13px; font-weight: 650; text-transform: uppercase; letter-spacing: .04em;
        color: var(--dsw-alias-label-tertiary, #8a919c); }
      .oapi-grid { display: grid; grid-template-columns: 140px 1fr; row-gap: 8px; column-gap: 12px; align-items: baseline; }
      .oapi-grid .k { color: var(--dsw-alias-label-secondary, #6b7280); font-size: 13px; }
      .oapi-grid .v { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; word-break: break-all; }
      .oapi-form { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; }
      .oapi-field { display: flex; flex-direction: column; gap: 5px; }
      .oapi-field.full { grid-column: 1 / -1; }
      .oapi-field label { font-size: 12.5px; color: var(--dsw-alias-label-secondary, #6b7280); font-weight: 550; }
      .oapi-hint-link { margin-left: 6px; font-size: 12px; font-weight: 500; cursor: pointer;
        color: var(--dsw-alias-brand-primary, #4c8bf5); text-decoration: none; }
      .oapi-hint-link:hover { text-decoration: underline; }
      .oapi-field input, .oapi-field select { box-sizing: border-box; width: 100%; padding: 8px 10px; font-size: 13.5px;
        border: 1px solid var(--dsw-alias-border, rgba(127,127,127,.25)); border-radius: 8px;
        background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,.04)); color: inherit; }
      .oapi-field input:focus, .oapi-field select:focus { outline: 2px solid var(--dsw-alias-brand-primary, #4c8bf5); outline-offset: -1px; }
      .oapi-btn { padding: 8px 14px; font-size: 13px; font-weight: 600; border-radius: 8px; cursor: pointer;
        border: 1px solid var(--dsw-alias-border, rgba(127,127,127,.25)); background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,.06)); color: inherit; }
      .oapi-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)); }
      .oapi-btn.primary { background: var(--dsw-alias-brand-primary, #4c8bf5); border-color: transparent; color: #fff; }
      .oapi-btn.primary:hover { filter: brightness(1.05); }
      .oapi-btn:disabled { opacity: .55; cursor: default; }
      .oapi-msg { margin-top: 12px; font-size: 13px; padding: 8px 12px; border-radius: 8px; }
      .oapi-msg.ok { background: rgba(46,160,67,.14); color: #2ea043; }
      .oapi-msg.err { background: rgba(248,81,73,.14); color: #f85149; }
      .oapi-badge { display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px; border-radius: 999px;
        font-size: 12px; font-weight: 600; }
      .oapi-badge.good { background: rgba(46,160,67,.16); color: #2ea043; }
      .oapi-badge.bad { background: rgba(248,81,73,.16); color: #f85149; }
      .oapi-badge.warn { background: rgba(210,153,34,.18); color: #d29922; }
      .oapi-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
      .oapi-table { width: 100%; border-collapse: collapse; font-size: 12.5px; table-layout: fixed; }
      .oapi-table th, .oapi-table td { text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--dsw-alias-border, rgba(127,127,127,.14));
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .oapi-table th { color: var(--dsw-alias-label-tertiary, #8a919c); font-weight: 600; font-size: 12px; }
      .oapi-table td.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .oapi-table tr:hover td { background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,.04)); }
      .oapi-table .col-id { width: 27%; }
      .oapi-table .col-name { width: 17%; }
      .oapi-table .col-ctx { width: 10%; }
      .oapi-table .col-input { width: 12%; }
      .oapi-table .col-reason { width: 15%; }
      .oapi-table .oapi-conn { width: 112px; text-align: center; }
      .oapi-list-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
      .oapi-list-head h3 { margin: 0; }
      .oapi-ico-btn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px;
        border: none; border-radius: 6px; background: transparent; cursor: pointer; padding: 0;
        color: var(--dsw-alias-label-secondary, #6b7280); vertical-align: middle; }
      .oapi-ico-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)); color: var(--dsw-alias-brand-primary, #4c8bf5); }
      .oapi-ico-btn:disabled { opacity: .4; cursor: default; }
      .oapi-ico-btn:disabled:hover { background: transparent; color: var(--dsw-alias-label-secondary, #6b7280); }
      .oapi-spin { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--dsw-alias-border, rgba(127,127,127,.3));
        border-top-color: var(--dsw-alias-brand-primary, #4c8bf5); border-radius: 50%; animation: oapi-rot .7s linear infinite; vertical-align: middle; }
      @keyframes oapi-rot { to { transform: rotate(360deg); } }
      .oapi-cell { display: inline-flex; align-items: center; gap: 5px; }
      .oapi-empty { color: var(--dsw-alias-label-secondary, #6b7280); font-size: 13px; padding: 8px 0; }
      .oapi-toggle { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; font-size: 13px;
        color: var(--dsw-alias-label-primary, #1f2328); }
      .oapi-toggle input { width: 15px; height: 15px; accent-color: var(--dsw-alias-brand-primary, #4c8bf5); cursor: pointer; }
      /* The main (sidebar) panel region is a raw box: the panel must be its own scroll container. */
      .oapi-scroll { height: 100%; min-height: 0; box-sizing: border-box; overflow-y: auto;
        overscroll-behavior: contain; }
    `;

    const fmtNum = (n) => {
      if (n === undefined || n === null || Number.isNaN(Number(n))) return '—';
      const x = Number(n);
      if (x >= 1e6) return (x / 1e6).toFixed(x % 1e6 === 0 ? 0 : 1) + 'M';
      if (x >= 1e3) return (x / 1e3).toFixed(x % 1e3 === 0 ? 0 : 1) + 'K';
      return String(x);
    };

    const fmtReasoning = (r) => {
      if (r === false) return '无';
      if (r === null || r === undefined) return '—';
      if (typeof r === 'object') return Object.keys(r).join(', ');
      return String(r);
    };

    const fmtInput = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return '—';
      const tags = { text: '文本', image: '图像' };
      return arr.map((v) => tags[v] || v).join(' / ');
    };

    // Inline SVG icons for the connectivity column (test / retest / failure).
    function IconPlay() {
      return h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' },
        h('path', { d: 'M8 5.14v13.72c0 .8.87 1.3 1.56.9l11-6.86a1.05 1.05 0 0 0 0-1.8l-11-6.86c-.69-.4-1.56.1-1.56.9Z' }));
    }
    function IconRefresh() {
      return h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M21 12a9 9 0 1 1-2.64-6.36', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }),
        h('polyline', { points: '21 3 21 9 15 9', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }));
    }
    function IconCross() {
      return h('svg', { width: 11, height: 11, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M18 6 6 18M6 6l12 12', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round' }));
    }

    // Small rail icon shown in the collapsed sidebar.
    function RailIcon() {
      return h('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('circle', { cx: 12, cy: 12, r: 3, fill: 'currentColor', opacity: 0.9 }),
        h('path', {
          d: 'M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8',
          stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round',
        }));
    }

    // The central (main) panel renders in a raw box with no scroll of its own,
    // so wrap the same Panel in a scroll container when shown in the sidebar.
    function SidebarPanel() {
      return h('div', { className: 'oapi-scroll' }, h(Panel));
    }

    function Panel() {
      const [status, setStatus] = useState(null);
      const [draft, setDraft] = useState({ displayName: '', baseURL: '', apiKey: '', defaultModel: '' });
      const [loaded, setLoaded] = useState(false);
      const [busy, setBusy] = useState(false);
      const [msg, setMsg] = useState(null); // {kind:'ok'|'err', text}
      const [test, setTest] = useState(null);
      const [modelTest, setModelTest] = useState({ running: false, results: {} });
      const [sidebarOn, setSidebarOnLocal] = useState(getSidebarShown);
      const alive = useRef(true);
      const sidebarBusy = useRef(false);

      // Track the module-level sidebar state so the checkbox stays in sync.
      useEffect(() => subscribeSidebarShown(setSidebarOnLocal), []);

      const refresh = useCallback(async () => {
        try {
          const res = await fetch('/api/oneapi/status', { credentials: 'same-origin' });
          const data = await res.json();
          if (!alive.current) return;
          if (data && data.ok) setStatus(data);
        } catch { /* keep last known */ }
      }, []);

      useEffect(() => {
        alive.current = true;
        refresh();
        const t = setInterval(refresh, 15000);
        return () => { alive.current = false; clearInterval(t); };
      }, [refresh]);

      // Initialize draft from first successful load.
      useEffect(() => {
        if (!loaded && status && status.provider) {
          setDraft({
            displayName: status.provider.displayName || '',
            baseURL: status.provider.baseURL || '',
            apiKey: '',
            defaultModel: status.defaultModel && status.defaultModel.model ? status.defaultModel.model : '',
          });
          setLoaded(true);
        }
      }, [status, loaded]);

      const setField = (key) => (ev) => {
        setDraft((d) => ({ ...d, [key]: ev.target.value }));
      };

      const save = async () => {
        setBusy(true); setMsg(null);
        try {
          const res = await fetch('/api/oneapi/save', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(draft),
          });
          const data = await res.json();
          if (!alive.current) return;
          if (data && data.ok) { setMsg({ kind: 'ok', text: '已保存' }); setDraft((d) => ({ ...d, apiKey: '' })); await refresh(); }
          else setMsg({ kind: 'err', text: '保存失败：' + ((data && data.results && data.results.map((r) => r.error).filter(Boolean).join('; ')) || (data && data.error) || '未知错误') });
        } catch (err) {
          if (alive.current) setMsg({ kind: 'err', text: '保存失败：' + String(err?.message || err) });
        } finally { setBusy(false); }
      };

      const runTest = async () => {
        setBusy(true); setTest(null);
        try {
          const res = await fetch('/api/oneapi/test', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ baseURL: draft.baseURL }),
          });
          const data = await res.json();
          if (alive.current) setTest(data);
        } catch (err) {
          if (alive.current) setTest({ ok: false, error: String(err?.message || err) });
        } finally { setBusy(false); }
      };

      const syncModels = async () => {
        setBusy(true); setMsg(null);
        try {
          const res = await fetch('/api/oneapi/sync', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: '{}',
          });
          const data = await res.json();
          if (!alive.current) return;
          if (data && data.ok) {
            setMsg({ kind: 'ok', text: '已同步 ' + data.synced + ' 个模型（新增 ' + data.added + '，移除 ' + data.removed + '）' });
            await refresh();
          } else {
            setMsg({ kind: 'err', text: '同步失败：' + ((data && data.error) || '未知错误') });
          }
        } catch (err) {
          if (alive.current) setMsg({ kind: 'err', text: '同步失败：' + String(err?.message || err) });
        } finally { setBusy(false); }
      };

      const postTestOne = async (id) => {
        const res = await fetch('/api/oneapi/test-model', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        return await res.json();
      };

      const patchResult = (id, r) => {
        if (!alive.current) return;
        setModelTest((t) => ({ ...t, results: { ...t.results, [id]: r || { id, ok: false, error: '无响应' } } }));
      };

      // Streamed "test all": probe models with a small concurrency pool and update
      // each cell the moment that model's probe returns (first-done shows first).
      const runModelTest = async () => {
        if (modelTest.running || busy) return;
        const ids = (Array.isArray(status?.models) ? status.models : []).map((m) => m && m.id).filter(Boolean);
        if (!ids.length) return;
        setModelTest({ running: true, results: {} });
        let cursor = 0;
        const work = async () => {
          while (cursor < ids.length) {
            const id = ids[cursor++];
            let r;
            try { r = await postTestOne(id); }
            catch (err) { r = { id, ok: false, error: String(err?.message || err) }; }
            patchResult(id, r);
          }
        };
        await Promise.all(Array.from({ length: Math.min(4, ids.length) }, work));
        if (alive.current) setModelTest((t) => ({ ...t, running: false }));
      };

      // Single-model test (per-row 测试 / 重测 button).
      const testOneModel = async (id) => {
        if (modelTest.running || busy) return;
        patchResult(id, { id, pending: true });
        let r;
        try { r = await postTestOne(id); }
        catch (err) { r = { id, ok: false, error: String(err?.message || err) }; }
        patchResult(id, r);
      };

      // Immediate-apply toggle: optimistic UI + live slot re-registration, no reload.
      const toggleSidebar = async (next) => {
        if (sidebarBusy.current) return;
        sidebarBusy.current = true;
        setSidebarOnLocal(next);
        setSidebarShown(next); // live register/unregister via apply()'s subscription
        setMsg(null);
        try {
          const res = await fetch('/api/oneapi/save', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ showInSidebar: next }),
          });
          const data = await res.json();
          if (alive.current) {
            if (data && data.ok) {
              setMsg({ kind: 'ok', text: next ? '已开启侧边栏显示' : '已关闭侧边栏显示' });
            } else {
              setSidebarOnLocal(!next); setSidebarShown(!next); // rollback
              setMsg({ kind: 'err', text: '切换失败：' + ((data && data.results && data.results.map((r) => r.error).filter(Boolean).join('; ')) || (data && data.error) || '未知错误') });
            }
          }
        } catch (err) {
          if (alive.current) {
            setSidebarOnLocal(!next); setSidebarShown(!next); // rollback
            setMsg({ kind: 'err', text: '切换失败：' + String(err?.message || err) });
          }
        } finally { sidebarBusy.current = false; }
      };

      const provider = status && status.provider ? status.provider : null;
      const apiKey = status && status.apiKey ? status.apiKey : null;
      const models = (status && Array.isArray(status.models)) ? status.models : [];

      const modelOptions = (() => {
        const set = new Set(models.map((m) => m.id).filter(Boolean));
        if (draft.defaultModel && !set.has(draft.defaultModel)) set.add(draft.defaultModel);
        return [...set];
      })();

      const apiKeyBadge = !apiKey
        ? null
        : apiKey.error
          ? h('span', { className: 'oapi-badge warn' }, h('span', { className: 'oapi-dot' }), '未知')
          : apiKey.configured
            ? h('span', { className: 'oapi-badge good' }, h('span', { className: 'oapi-dot' }), '已配置')
            : h('span', { className: 'oapi-badge bad' }, h('span', { className: 'oapi-dot' }), '未配置');

      const testBadge = !test
        ? null
        : test.ok
          ? h('span', { className: 'oapi-badge good' }, h('span', { className: 'oapi-dot' }), '连通 · ' + test.latencyMs + 'ms · ' + test.modelCount + ' 个模型')
          : h('span', { className: 'oapi-badge bad' }, h('span', { className: 'oapi-dot' }), '失败' + (test.error ? '：' + test.error : ''));

      const modelTestCell = (id) => {
        const r = modelTest.results[id];
        if (!r) return h('button', { className: 'oapi-ico-btn', onClick: () => testOneModel(id), disabled: modelTest.running || busy, title: '测试' }, h(IconPlay));
        if (r.pending) return h('span', { className: 'oapi-spin', title: '测试中…' });
        const badge = r.ok
          ? h('span', { className: 'oapi-badge good' }, h('span', { className: 'oapi-dot' }), r.latencyMs + 'ms')
          : h('span', { className: 'oapi-badge bad', title: r.error || '不可用' }, h(IconCross));
        return h('span', { className: 'oapi-cell' },
          badge,
          h('button', { className: 'oapi-ico-btn', onClick: () => testOneModel(id), disabled: modelTest.running || busy, title: '重测' }, h(IconRefresh)));
      };

      return h('div', { className: 'oapi-wrap' },
        h('style', null, CSS),

        h('div', { className: 'oapi-head' },
          h('div', null,
            h('h2', { className: 'oapi-title' }, 'OneAPI 网关'),
            h('div', { className: 'oapi-sub' }, '配置 @deepseek-ai/dsh-llm-pi-ai 的 oneapi provider，并查看连接状态与模型清单')),
          h('div', { className: 'oapi-actions' },
            h('button', { className: 'oapi-btn', onClick: runTest, disabled: busy }, '测试连接'),
            h('button', { className: 'oapi-btn', onClick: syncModels, disabled: busy }, '同步模型'),
            h('button', { className: 'oapi-btn primary', onClick: save, disabled: busy }, busy ? '处理中…' : '保存'))),

        h('div', { className: 'oapi-card' },
          h('h3', null, '当前状态'),
          provider
            ? h('div', { className: 'oapi-grid' },
              h('span', { className: 'k' }, '显示名'), h('span', { className: 'v' }, provider.displayName || '—'),
              h('span', { className: 'k' }, '协议'), h('span', { className: 'v' }, provider.api || '—'),
              h('span', { className: 'k' }, 'Base URL'), h('span', { className: 'v' }, provider.baseURL || '—'),
              h('span', { className: 'k' }, 'API Key'), h('span', null, apiKeyBadge || h('span', { className: 'v' }, '—')),
              h('span', { className: 'k' }, '默认上下文'), h('span', { className: 'v' }, fmtNum(provider.defaultContextWindow)),
              h('span', { className: 'k' }, '默认模型'), h('span', { className: 'v' }, (status.defaultModel && status.defaultModel.model) || '—'),
              h('span', { className: 'k' }, '连接测试'), h('span', null, testBadge || h('span', { className: 'v' }, '尚未测试')),
              h('span', { className: 'k' }, '侧边栏'),
              h('span', null,
                h('label', { className: 'oapi-toggle' },
                  h('input', { type: 'checkbox', checked: sidebarOn, onChange: (ev) => toggleSidebar(ev.target.checked) }),
                  h('span', null, sidebarOn ? '已在左侧边栏显示' : '未在左侧边栏显示'))))
            : h('div', { className: 'oapi-empty' }, status ? '未找到 oneapi provider 配置' : '加载中…')),

        h('div', { className: 'oapi-card' },
          h('h3', null, '编辑配置'),
          h('div', { className: 'oapi-form' },
            h('div', { className: 'oapi-field' },
              h('label', null, '显示名 (displayName)'),
              h('input', { value: draft.displayName, onChange: setField('displayName'), placeholder: 'OneAPI' })),
            h('div', { className: 'oapi-field' },
              h('label', null, 'Base URL'),
              h('input', { value: draft.baseURL, onChange: setField('baseURL'), placeholder: 'https://oneapi-comate.baidu-int.com/v1' })),
            h('div', { className: 'oapi-field' },
              h('label', null,
                'API Key ',
                h('a', { className: 'oapi-hint-link', href: 'https://oneapi-comate.baidu-int.com/token', target: '_blank', rel: 'noreferrer noopener' }, '获取 Token ↗')),
              h('input', { type: 'password', value: draft.apiKey, onChange: setField('apiKey'),
                placeholder: (apiKey && apiKey.configured) ? '已配置（留空则不修改）' : '输入新的 API Key' })),
            h('div', { className: 'oapi-field' },
              h('label', null, '默认模型 (provider 固定为 oneapi)'),
              modelOptions.length > 0
                ? h('select', { value: draft.defaultModel, onChange: setField('defaultModel') },
                  h('option', { value: '' }, '不修改'),
                  modelOptions.map((id) => h('option', { key: id, value: id }, id)))
                : h('input', { value: draft.defaultModel, onChange: setField('defaultModel'), placeholder: 'DeepSeek-V4-Pro' }))),
          msg && h('div', { className: 'oapi-msg ' + msg.kind }, msg.text)),

        h('div', { className: 'oapi-card' },
          h('div', { className: 'oapi-list-head' },
            h('h3', null, '模型清单 (' + models.length + ')'),
            h('button', { className: 'oapi-btn', onClick: runModelTest, disabled: modelTest.running || busy }, modelTest.running ? '测试中…' : '全部测试')),
          models.length > 0
            ? h('table', { className: 'oapi-table' },
              h('thead', null, h('tr', null,
                h('th', { className: 'col-id' }, 'ID'),
                h('th', { className: 'col-name' }, '名称'),
                h('th', { className: 'col-ctx' }, '上下文'),
                h('th', { className: 'col-input' }, '输入'),
                h('th', { className: 'col-reason' }, '推理等级'),
                h('th', { className: 'oapi-conn' }, '连通'))),
              h('tbody', null, models.map((m) => h('tr', { key: m.id },
                h('td', { className: 'mono col-id' }, m.id),
                h('td', { className: 'col-name' }, m.name || '—'),
                h('td', { className: 'col-ctx' }, fmtNum(m.contextWindow)),
                h('td', { className: 'col-input' }, fmtInput(m.input)),
                h('td', { className: 'col-reason' }, fmtReasoning(m.reasoningEfforts)),
                h('td', { className: 'oapi-conn' }, modelTestCell(m.id))))))
            : h('div', { className: 'oapi-empty' }, status ? '尚未配置任何模型' : '加载中…')));
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        // The settings page is always registered, so the toggle stays reachable.
        ctx.effect(() => ctx.slots.inject(SLOT, () => ctx.slots.register({ name: SLOT, id: ID, order: ORDER, label: LABEL }, Panel)), 'oneapi.settings');

        // Live sidebar registration: subscribe to the shared flag and (un)register
        // the rail icon + central panel immediately when it flips.
        let disposeSidebar = null;
        const syncSidebar = (show) => {
          if (show) {
            if (!disposeSidebar) {
              const d1 = ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: ID }, SidebarPanel), 'oneapi.main');
              const d2 = ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: ID, order: SIDEBAR_ORDER, label: () => LABEL }, RailIcon), 'oneapi.panellist');
              disposeSidebar = () => { try { d1(); } catch {} try { d2(); } catch {} };
            }
          } else if (disposeSidebar) {
            disposeSidebar(); disposeSidebar = null;
          }
        };

        ctx.effect(() => {
          const unsub = subscribeSidebarShown(syncSidebar);
          return () => {
            unsub();
            if (disposeSidebar) { try { disposeSidebar(); } catch {} disposeSidebar = null; }
          };
        }, 'oneapi.sidebar-sync');

        // Initial: read the persisted option (defaults to shown).
        (async () => {
          try {
            const res = await fetch('/api/oneapi/status', { credentials: 'same-origin' });
            const data = await res.json();
            if (data && typeof data.showInSidebar === 'boolean') setSidebarShown(data.showInSidebar);
          } catch { /* keep default */ }
        })();
      },
    };
  },
});
