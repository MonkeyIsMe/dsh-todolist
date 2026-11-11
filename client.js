window.__ModuleLoader__.load({
	id: '@local/dsh-todo',
	factory(require) {
		const React = require('react');
		const h = React.createElement;

		/** Private Connection channel owned by the Host half. */
		const CHANNEL = '/dsh-todo';
		/** Dictionary namespace owned by this plugin. */
		const NS = 'dsh-todo';
		const CSS_ID = '@local/dsh-todo/panel.css';
		const STATUS_CYCLE = ['todo', 'doing', 'done'];
		const STATUS_RANK = { doing: 0, todo: 1, done: 2 };
		const DAY_MS = 86400000;
		const PRIORITY_TONES = { 1: 'error', 2: 'warn', 3: 'brand', 4: 'muted' };
		const PROJECT_COLORS = ['', '#e5484d', '#f76b15', '#d9a514', '#46a758', '#3b82f6', '#8b5cf6', '#64748b'];

		// Design system (flat, shell-token driven):
		//  - 8dp spacing rhythm, 150ms ease color/shadow transitions, 120ms transform pops
		//  - visible 2px focus ring on every interactive control (WCAG focus appearance)
		//  - modal entrance 180ms ease-out, backdrop fade 150ms, disabled under reduced motion
		//  - no gradients; elevation only via hairline shadows that read in light & dark
		const CSS = [
			'.dt-root{display:flex;flex-direction:column;gap:14px;height:100%;max-height:100%;min-height:0;padding:20px;box-sizing:border-box;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;color-scheme:light dark}',
			'.dt-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}',
			'.dt-head-main{display:flex;flex-direction:column;gap:6px;min-width:0}',
			'.dt-title{font-size:17px;line-height:24px;font-weight:600;letter-spacing:-.01em;margin:0}',
			'.dt-sub{display:flex;gap:6px;flex-wrap:wrap;align-items:center}',
			'.dt-actions{display:flex;gap:8px;flex-wrap:wrap}',
			'.dt-btn{border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);border-radius:8px;padding:5px 14px;font-size:13px;line-height:18px;cursor:pointer;font-family:inherit;transition:background-color .15s ease,border-color .15s ease,color .15s ease,filter .15s ease}',
			'.dt-btn:hover:not(:disabled){background:var(--dsw-alias-border-l1);border-color:var(--dsw-alias-border-l1)}',
			'.dt-btn:active:not(:disabled){filter:brightness(.96)}',
			'.dt-btn:disabled{opacity:.5;cursor:default}',
			'.dt-btn[data-primary="true"]{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff}',
			'.dt-btn[data-primary="true"]:hover:not(:disabled){background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);filter:brightness(1.07)}',
			'.dt-btn[data-danger="true"]{color:var(--dsw-alias-state-error-primary)}',
			'.dt-btn[data-danger="true"][data-armed="true"]{background:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);color:#fff}',
			'.dt-btn:focus-visible,.dt-ghost:focus-visible,.dt-add:focus-visible,.dt-swatch:focus-visible,.dt-status:focus-visible,.dt-subcheck:focus-visible,.dt-row:focus-visible,.dt-side-item:focus-visible,.dt-proj-btn:focus-visible,.dt-movemenu-item:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
			'.dt-chip{display:inline-flex;align-items:center;gap:4px;border:0;border-radius:999px;padding:2px 9px;font-size:12px;line-height:16px;white-space:nowrap;font-variant-numeric:tabular-nums}',
			'.dt-chip[data-tone="muted"]{background:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary)}',
			'.dt-chip[data-tone="brand"]{background:var(--dsw-alias-border-l1);color:var(--dsw-alias-brand-primary);font-weight:500}',
			'.dt-chip[data-tone="warn"]{background:var(--dsw-alias-border-l1);color:var(--dsw-alias-state-warn-primary);font-weight:500}',
			'.dt-chip[data-tone="error"]{background:var(--dsw-alias-border-l1);color:var(--dsw-alias-state-error-primary);font-weight:600}',
			'.dt-chip[data-tone="error-ring"]{background:var(--dsw-alias-border-l1);color:var(--dsw-alias-state-error-primary);font-weight:700;box-shadow:inset 0 0 0 1px var(--dsw-alias-state-error-primary)}',
			'.dt-chip[data-tone="success"]{background:var(--dsw-alias-border-l1);color:var(--dsw-alias-state-success-primary);font-weight:600}',
			'.dt-banner{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xl);padding:10px 12px;display:flex;flex-direction:column;gap:6px}',
			'.dt-banner[data-tone="bad"]{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}',
			'.dt-banner[data-tone="warn"]{border-color:var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-state-warn-primary)}',
			'.dt-log{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;line-height:16px;white-space:pre-wrap;word-break:break-all;max-height:160px;overflow:auto;margin:0}',
			'.dt-hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
			'.dt-body{display:flex;gap:16px;flex:1;min-height:0;align-items:stretch}',
			'.dt-side{flex:0 0 288px;display:flex;flex-direction:column;gap:2px;overflow:auto;padding-right:4px}',
			'.dt-side-head{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px;padding:10px 10px 4px;display:flex;justify-content:space-between;align-items:center;gap:6px;letter-spacing:.05em;text-transform:uppercase}',
			'.dt-side-item{display:flex;align-items:center;gap:8px;border:0;background:transparent;border-radius:8px;padding:6px 10px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;font-family:inherit;width:100%;min-width:0;box-sizing:border-box;transition:background-color .15s ease,box-shadow .15s ease}',
			'.dt-side-item:hover{background:var(--dsw-alias-border-l1)}',
			'.dt-side-item[data-active="true"]{background:var(--dsw-alias-border-l1);box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary);font-weight:600}',
			'.dt-side-name{flex:1;min-width:0;overflow:hidden;white-space:normal;word-break:break-word}',
			'.dt-side-count{color:var(--dsw-alias-label-tertiary);font-size:11px;font-variant-numeric:tabular-nums;background:var(--dsw-alias-border-l1);border-radius:999px;padding:0 7px;line-height:16px}',
			'.dt-main{flex:1;min-width:0;overflow:auto;display:flex;flex-direction:column;gap:16px;padding-right:4px}',
			'.dt-group{display:flex;flex-direction:column;gap:8px}',
			'.dt-group-head{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px;display:flex;gap:8px;align-items:center;letter-spacing:.05em;text-transform:uppercase;padding:2px 2px 0}',
			'.dt-count{font-variant-numeric:tabular-nums;background:var(--dsw-alias-border-l1);border-radius:999px;padding:0 7px;line-height:16px}',
			'.dt-card{border:.5px solid var(--dsw-alias-settings-card-stroke);border-radius:var(--dsw-radius-xl);background:var(--dsw-alias-settings-card-fill);min-width:0;box-shadow:0 1px 2px rgba(0,0,0,.05);overflow:hidden;transition:border-color .15s ease,box-shadow .15s ease,opacity .2s ease}',
			'.dt-card:hover{border-color:var(--dsw-alias-border-l2);box-shadow:0 2px 10px rgba(0,0,0,.08)}',
			'.dt-card[data-done="true"]{opacity:.6}',
			'.dt-card[data-priority="1"]{border-left:3px solid var(--dsw-alias-state-error-primary)}',
			'.dt-card[data-priority="2"]{border-left:3px solid var(--dsw-alias-state-warn-primary)}',
			'.dt-card[data-priority="3"]{border-left:3px solid var(--dsw-alias-brand-primary)}',
			'.dt-row{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;min-width:0;border-radius:var(--dsw-radius-xl);transition:background-color .15s ease;position:relative}',
			'.dt-row:hover{background:var(--dsw-alias-border-l1)}',
			'.dt-row-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}',
			'.dt-proj{display:inline-flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary);font-size:12px;max-width:150px;min-width:0}',
			'.dt-proj-btn{border:0;background:transparent;padding:2px 6px;font:inherit;color:inherit;border-radius:6px;cursor:pointer;transition:background-color .15s ease;max-width:150px;min-width:0}',
			'.dt-proj-btn:hover{background:var(--dsw-alias-border-l1)}',
			'.dt-movemenu{position:absolute;top:calc(100% + 4px);left:14px;z-index:40;min-width:180px;max-height:280px;overflow:auto;background:var(--dsw-alias-bg-settings-card-fill);border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:0 16px 40px rgba(0,0,0,.28);padding:4px;display:flex;flex-direction:column;gap:1px}',
			'.dt-movemenu-item{border:0;background:transparent;border-radius:6px;padding:5px 10px;font-size:12.5px;line-height:18px;cursor:pointer;text-align:left;font-family:inherit;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;width:100%}',
			'.dt-movemenu-item:hover:not(:disabled){background:var(--dsw-alias-border-l1)}',
			'.dt-movemenu-item[data-active="true"]{color:var(--dsw-alias-brand-primary);font-weight:600}',
			'.dt-movemenu-item:disabled{opacity:.5;cursor:default}',
			'.dt-proj-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.dt-dot{width:9px;height:9px;border-radius:50%;background:var(--dsw-alias-border-l2);display:inline-block;flex:0 0 auto}',
			'.dt-status{flex:0 0 auto;width:20px;height:20px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);background:transparent;cursor:pointer;padding:0;font-size:11px;line-height:15px;color:#fff;font-family:inherit;position:relative;display:inline-flex;align-items:center;justify-content:center;transition:transform .12s ease,border-color .15s ease,background-color .15s ease}',
			'.dt-status:hover:not(:disabled){transform:scale(1.12)}',
			'.dt-status:active:not(:disabled){transform:scale(.94)}',
			'.dt-status[data-status="doing"]{border-color:var(--dsw-alias-brand-primary)}',
			'.dt-status[data-status="doing"]::after{content:"";position:absolute;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-brand-primary)}',
			'.dt-status[data-status="done"]{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary)}',
			'.dt-subs{list-style:none;margin:0;padding:2px 14px 12px 44px;display:flex;flex-direction:column;gap:5px;position:relative}',
			'.dt-subs::before{content:"";position:absolute;left:51px;top:10px;bottom:14px;width:1.5px;background:var(--dsw-alias-border-l1);border-radius:1px}',
			'.dt-subli{display:flex;align-items:center;gap:8px;font-size:12.5px;line-height:18px;min-width:0;color:var(--dsw-alias-label-primary)}',
			'.dt-subcheck{flex:0 0 auto;width:15px;height:15px;border:1.5px solid var(--dsw-alias-border-l2);border-radius:4px;background:transparent;padding:0;cursor:pointer;color:#fff;font-size:9px;line-height:12px;font-family:inherit;position:relative;z-index:1;transition:transform .12s ease,border-color .15s ease,background-color .15s ease}',
			'.dt-subcheck:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary);transform:scale(1.1)}',
			'.dt-subcheck[data-done="true"]{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}',
			'.dt-subli-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .15s ease}',
			'.dt-subli-title[data-done="true"]{text-decoration:line-through;color:var(--dsw-alias-label-tertiary)}',
			'.dt-ghost{border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:14px;cursor:pointer;padding:0 6px;font-family:inherit;line-height:20px;opacity:.55;transition:opacity .15s ease,color .15s ease}',
			'.dt-side-item:hover .dt-ghost{opacity:1}',
			'.dt-ghost:hover{color:var(--dsw-alias-state-error-primary);opacity:1}',
			'.dt-add{border:0;background:transparent;color:var(--dsw-alias-brand-primary);font-size:12px;font-weight:500;cursor:pointer;padding:2px 0;text-align:left;font-family:inherit;white-space:nowrap;transition:opacity .15s ease}',
			'.dt-add:hover{opacity:.8}',
			'.dt-add:disabled{opacity:.5;cursor:default}',
			'.dt-swatch-row{display:flex;gap:8px;flex-wrap:wrap;padding:2px 0}',
			'.dt-swatch{width:20px;height:20px;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);cursor:pointer;padding:0;background:transparent;transition:transform .12s ease}',
			'.dt-swatch:hover{transform:scale(1.12)}',
			'.dt-swatch[data-selected="true"]{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
			'.dt-empty{border:.5px dashed var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xl);padding:40px 16px;text-align:center;color:var(--dsw-alias-label-tertiary);display:flex;flex-direction:column;gap:10px;align-items:center}',
			'.dt-remind{border:1px solid var(--dsw-alias-state-error-primary);border-radius:var(--dsw-radius-xl);background:var(--dsw-alias-bg-layer-1);padding:10px 12px;display:flex;flex-direction:column;gap:4px}',
			'.dt-remind-title{font-size:12px;font-weight:700;color:var(--dsw-alias-state-error-primary);letter-spacing:.02em;padding:0 6px}',
			'.dt-remind-item{display:flex;align-items:center;justify-content:space-between;gap:10px;border:0;background:transparent;padding:5px 6px;border-radius:8px;cursor:pointer;font:inherit;color:var(--dsw-alias-label-primary);text-align:left;min-width:0}',
			'.dt-remind-item:hover{background:var(--dsw-alias-border-l1)}',
			'.dt-remind-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}',
			'.dt-remind-due{flex:0 0 auto;font-size:12px;font-weight:600;color:var(--dsw-alias-state-error-primary);font-variant-numeric:tabular-nums}',
			'.dt-ghost-on{background:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);font-weight:600}',
			'.dt-cal{display:flex;flex-direction:column;gap:10px;min-width:0}',
			'.dt-cal-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
			'.dt-cal-title{font-size:14px;font-weight:700;min-width:120px;text-align:center}',
			'.dt-cal-week,.dt-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}',
			'.dt-cal-dow{font-size:11px;font-weight:600;color:var(--dsw-alias-label-tertiary);text-align:center;padding:2px 0}',
			'.dt-cal-cell{border:.5px solid var(--dsw-alias-border-l1);border-radius:10px;min-height:86px;padding:6px;display:flex;flex-direction:column;gap:3px;cursor:pointer;transition:background-color .15s ease;background:transparent;box-sizing:border-box;min-width:0}',
			'.dt-cal-cell:hover{background:var(--dsw-alias-bg-layer-1)}',
			'.dt-cal-cell[data-blank="true"]{border-style:dashed;opacity:.5}',
			'.dt-cal-day{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);align-self:flex-start;min-width:24px;height:20px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:0 5px}',
			'.dt-cal-cell[data-today="true"] .dt-cal-day{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}',
			'.dt-cal-task{display:block;width:100%;border:0;border-radius:5px;padding:2px 5px;font-size:11px;line-height:15px;text-align:left;cursor:pointer;font-family:inherit;background:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
			'.dt-cal-task:hover{background:var(--dsw-alias-border-l2)}',
			'.dt-cal-task[data-tone="error"]{color:var(--dsw-alias-state-error-primary);font-weight:600}',
			'.dt-cal-task[data-tone="error-ring"]{color:var(--dsw-alias-state-error-primary);font-weight:700;box-shadow:inset 0 0 0 1px var(--dsw-alias-state-error-primary)}',
			'.dt-cal-task[data-done="true"]{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}',
			'.dt-cal-time{opacity:.8;margin-right:4px;font-variant-numeric:tabular-nums}',
			'.dt-cal-undated{display:flex;flex-direction:column;gap:4px;border-top:.5px solid var(--dsw-alias-border-l1);padding-top:10px;min-width:0}',
			'.dt-cal-undated-head{font-size:12px;font-weight:600;color:var(--dsw-alias-label-tertiary);padding:0 8px}',
			'.dt-cal-undated-item{display:flex;align-items:center;justify-content:space-between;gap:10px;border:0;background:transparent;border-radius:8px;padding:5px 8px;font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;min-width:0;width:100%}',
			'.dt-cal-undated-item:hover{background:var(--dsw-alias-border-l1)}',
			'.dt-cal-undated-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}',
			'.dt-cal-undated-item[data-done="true"] .dt-cal-undated-title{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}',
			'.dt-cal-undated-proj{flex:0 0 auto;font-size:11px;color:var(--dsw-alias-label-tertiary);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.dt-cal-submark{opacity:.65;margin-right:4px;font-size:10px}',
			'.dt-empty-icon{opacity:.6}',
			'.dt-setup{border:.5px solid var(--dsw-alias-settings-card-stroke);border-radius:var(--dsw-radius-xl);background:var(--dsw-alias-settings-card-fill);padding:16px 18px;display:flex;flex-direction:column;gap:12px;max-width:640px;box-shadow:0 1px 2px rgba(0,0,0,.05)}',
			'.dt-field{display:flex;flex-direction:column;gap:5px}',
			'.dt-field-label{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;font-weight:500}',
			'.dt-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
			'.dt-text,.dt-select,.dt-date{border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:inherit;font-size:13px;padding:6px 10px;font-family:inherit;box-sizing:border-box;width:100%;transition:border-color .15s ease}',
			'.dt-date{width:auto}',
			'.dt-text:focus,.dt-select:focus,.dt-date:focus,.dt-textarea:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;border-color:var(--dsw-alias-brand-primary)}',
			// z-index:70 keeps this select (and its inline menu) above every static
			// form field in the modal's paint layer — required because this webview's
			// compositor can duplicate the modal layer with an offset ghost copy.
			'.dt-selectbox{position:relative;z-index:70;min-width:0;width:100%}',
			'.dt-selectbox-btn{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:inherit;font-size:13px;padding:6px 10px;font-family:inherit;cursor:pointer;box-sizing:border-box;transition:border-color .15s ease;text-align:left;min-width:0}',
			'.dt-selectbox-btn:hover{border-color:var(--dsw-alias-brand-primary)}',
			'.dt-selectbox-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;border-color:var(--dsw-alias-brand-primary)}',
			'.dt-selectbox-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.dt-selectbox-caret{flex:0 0 auto;color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:1}',
			// Opaque base + overlay tint: the overlay token is translucent in this theme,
			// and the menu must not let the form fields behind it show through.
			// In normal flow (accordion): an open menu pushes the fields below it
			// down instead of floating over them — no pixel overlap, so nothing the
			// renderer paints twice can garble the menu text.
			'.dt-selectbox-menu{position:static;margin-top:4px;background-color:var(--dsw-alias-bg-layer-1);background-image:linear-gradient(var(--dsw-alias-bg-overlay),var(--dsw-alias-bg-overlay));border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:0 16px 40px rgba(0,0,0,.28);padding:4px;display:flex;flex-direction:column;gap:1px}',
			'.dt-selectbox-group{font-size:11px;font-weight:600;color:var(--dsw-alias-label-tertiary);padding:6px 10px 2px;letter-spacing:.03em}',
			'.dt-selectbox-item{display:block;width:100%;border:0;background:transparent;border-radius:6px;padding:5px 10px;font-size:13px;line-height:18px;text-align:left;font-family:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
			'.dt-selectbox-item:hover:not(:disabled){background:var(--dsw-alias-border-l1)}',
			'.dt-selectbox-item:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',
			'.dt-selectbox-item[data-selected="true"]{color:var(--dsw-alias-brand-primary);font-weight:600}',
			'.dt-selectbox-item:disabled{opacity:.5;cursor:default}',
			'.dt-textarea{border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:inherit;font-size:12.5px;line-height:18px;padding:6px 10px;min-height:56px;resize:vertical;font-family:inherit;width:100%;box-sizing:border-box;transition:border-color .15s ease}',
			'.dt-msubs{display:flex;flex-direction:column;gap:6px}',
			'.dt-msub{display:flex;gap:8px;align-items:center}',
			'.dt-subinput{flex:1;min-width:0}',
			// No backdrop-filter and no opacity/transform animations here: in this
			// webview they promote the modal to its own GPU layer and leave offset
			// ghost copies painted over the menus (the "half-cut" text artifact).
			'.dt-overlay{position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:24px}',
			'.dt-modal{display:flex;flex-direction:column;gap:14px;width:680px;max-width:100%;max-height:calc(100vh - 48px);border:.5px solid var(--dsw-alias-settings-card-stroke);border-radius:var(--dsw-radius-xl);background:var(--dsw-alias-settings-card-fill);padding:20px 22px;box-sizing:border-box;box-shadow:0 24px 64px rgba(0,0,0,.35)}',
			'.dt-modal-title{font-size:16px;line-height:24px;font-weight:600;letter-spacing:-.01em;margin:0}',
			'.dt-modal-body{display:flex;flex-direction:column;gap:12px;overflow:auto;min-height:0}',
			'.dt-modal-foot{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;border-top:.5px solid var(--dsw-alias-border-l1);padding-top:14px;margin-top:2px}',
			'.dt-modal-foot-right{display:flex;gap:8px;margin-left:auto}',
			'.dt-modal-err{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}',
			'.dt-check-label{display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer}',
			'.dt-icon{display:block}',
			'.dt-icon[data-active="false"]{opacity:.65}',
			'@keyframes dt-fade-in{from{opacity:0}to{opacity:1}}',
			'@keyframes dt-pop-in{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}',
			'@media (prefers-reduced-motion:reduce){.dt-overlay,.dt-modal,.dt-btn,.dt-status,.dt-subcheck,.dt-swatch,.dt-row,.dt-card,.dt-side-item,.dt-ghost{animation:none !important;transition:none !important}}'
		].join('');
		if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(CSS_ID) + ']') === null) {
			const tag = document.createElement('style');
			tag.dataset.plugin = '@local/dsh-todo';
			tag.dataset.pluginCss = CSS_ID;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		const zh = {
			'panel.title': '待办清单',
			'action.new': '新建任务',
			'action.refresh': '刷新',
			'action.pull': '拉取',
			'action.push': '推送',
			'action.settings': '设置',
			'action.back': '返回',
			'action.newProject': '＋ 新建',
			'filter.all': '全部',
			'filter.unfiled': '未归类',
			'filter.projects': '项目',
			'filter.subprojects': '子项目',
			'filter.showDone': '显示已完成',
			'action.moveTo': '移动到项目…',
			'empty.subHint': '任务可能还在父项目「{parent}」里：点任务行上的项目名可以直接移过来。',
			'group.doing': '进行中',
			'group.todo': '待办',
			'group.done': '已完成',
			'priority.none': '无',
			'priority.1': '紧急',
			'priority.2': '高',
			'priority.3': '中',
			'priority.4': '低',
			'status.todo': '待办',
			'status.doing': '进行中',
			'status.done': '已完成',
			'field.title': '标题',
			'field.titlePlaceholder': '任务标题',
			'field.name': '名称',
			'field.namePlaceholder': '项目名称',
			'field.project': '项目',
			'field.priority': '优先级',
			'field.due': '截止时间（可不填）',
			'field.status': '状态',
			'field.notes': '备注',
			'field.notesPlaceholder': '备注（可选）',
			'field.subtasks': '子任务',
			'field.color': '颜色',
			'noProject': '未归类',
			'subtask.add': '＋ 添加子任务',
			'subtask.placeholder': '子任务标题',
			'field.subtaskDue': '子任务截止时间（可不填）',
			'subtask.progress': '{done}/{total} 子任务',
			'subtask.allDone': '✓ 子任务已完成',
			'modal.task.new': '新建任务',
			'modal.task.edit': '编辑任务',
			'modal.project.new': '新建项目',
			'modal.project.edit': '编辑项目',
			'modal.save': '保存',
			'modal.saving': '保存中…',
			'modal.cancel': '取消',
			'modal.delete': '删除',
			'modal.deleteConfirm': '再点一次确认删除',
			'modal.close': '关闭',
			'empty.tasks': '这个范围还没有任务',
			'empty.button': '新建第一个任务',
			'loading': '正在加载…',
			'due.overdue': '逾期 {days} 天',
			'due.today': '今天到期',
			'due.tomorrow': '明天到期',
			'due.inDays': '{days} 天后',
			'due.plain': '{date}',
			'due.overdueMin': '已逾期 {m} 分钟',
			'due.overdueH': '已逾期 {h} 小时',
			'due.overdueD': '已逾期 {d} 天',
			'due.inMin': '距截止还有 {m} 分钟',
			'due.todayAt': '今天 {time} 截止',
			'due.tomorrowAt': '明天 {time} 截止',
			'due.plainAt': '{date} {time} 截止',
			'remind.title': '截止提醒',
			'view.list': '列表',
			'view.calendar': '日历',
			'cal.today': '今天',
			'cal.month': '{y} 年 {m} 月',
			'cal.newOn': '在 {date} 新建任务',
			'cal.week.1': '周一',
			'cal.week.2': '周二',
			'cal.week.3': '周三',
			'cal.week.4': '周四',
			'cal.week.5': '周五',
			'cal.week.6': '周六',
			'cal.week.7': '周日',
			'cal.undated': '无截止日期的任务',
			'cal.subPrefix': '子任务',
			'setup.title': '先设置仓库位置',
			'setup.body': '待办数据按「一个任务一个 JSON 文件」写入下面的仓库，每次改动自动本地提交；拉取 / 推送按钮负责与远端 Git 仓库同步。',
			'setup.repoDir': '仓库路径（绝对路径）',
			'setup.remote': '远端地址（HTTPS，可选）',
			'setup.branch': '分支',
			'setup.autoCommit': '改动后自动本地提交',
			'setup.save': '保存并初始化',
			'setup.hint': '配置写在 {path}，之后修改路径不需要重装插件。',
			'git.title': 'Git 状态',
			'git.unconfigured': '还没有设置仓库路径',
			'git.notRepo': '该目录还不是 Git 仓库，保存设置后会自动初始化',
			'git.branch': '分支 {name}',
			'git.dirty': '{count} 个文件未提交',
			'git.clean': '工作区干净',
			'git.ahead': '领先 {count}',
			'git.behind': '落后 {count}',
			'git.last': '最近提交 {hash} {subject}',
			'notice.saved': '已保存',
			'notice.deleted': '已删除',
			'notice.projectDeleted': '项目及其子项目已删除，任务已转为未归类',
			'notice.repoCreated': '仓库已初始化',
			'notice.commitFailed': '自动提交失败',
			'notice.pushed': '推送完成',
			'notice.pushFailed': '推送失败',
			'notice.pulled': '拉取完成',
			'notice.pullFailed': '拉取失败',
			'confirm.projectDelete': '删除？子项目会一并删除，任务转为未归类',
			'project.newName': '新项目',
			'field.parent': '所属项目',
			'field.parentTop': '顶级（无父项目）',
			'action.newSubProject': '＋ 子项目',
			'env.title': '运行环境',
			'env.gitMissing': '未检测到',
			'error.title': '出错了',
			'error.retry': '重试',
			'problems.title': '以下任务文件无法解析，已跳过'
		};
		const en = {
			'panel.title': 'To-do list',
			'action.new': 'New task',
			'action.refresh': 'Refresh',
			'action.pull': 'Pull',
			'action.push': 'Push',
			'action.settings': 'Settings',
			'action.back': 'Back',
			'action.newProject': '＋ New',
			'filter.all': 'All',
			'filter.unfiled': 'Unfiled',
			'filter.projects': 'Projects',
			'filter.subprojects': 'Sub-projects',
			'filter.showDone': 'Show completed',
			'action.moveTo': 'Move to project…',
			'empty.subHint': 'Tasks may still sit in the parent project "{parent}": click a task\'s project label to move it here.',
			'group.doing': 'In progress',
			'group.todo': 'To-do',
			'group.done': 'Done',
			'priority.none': 'None',
			'priority.1': 'Urgent',
			'priority.2': 'High',
			'priority.3': 'Medium',
			'priority.4': 'Low',
			'status.todo': 'To-do',
			'status.doing': 'In progress',
			'status.done': 'Done',
			'field.title': 'Title',
			'field.titlePlaceholder': 'Task title',
			'field.name': 'Name',
			'field.namePlaceholder': 'Project name',
			'field.project': 'Project',
			'field.priority': 'Priority',
			'field.due': 'Due date (optional)',
			'field.status': 'Status',
			'field.notes': 'Notes',
			'field.notesPlaceholder': 'Notes (optional)',
			'field.subtasks': 'Subtasks',
			'field.color': 'Color',
			'noProject': 'Unfiled',
			'subtask.add': '＋ Add subtask',
			'subtask.placeholder': 'Subtask title',
			'field.subtaskDue': 'Subtask due (optional)',
			'subtask.progress': '{done}/{total} subtasks',
			'subtask.allDone': '✓ Subtasks done',
			'modal.task.new': 'New task',
			'modal.task.edit': 'Edit task',
			'modal.project.new': 'New project',
			'modal.project.edit': 'Edit project',
			'modal.save': 'Save',
			'modal.saving': 'Saving…',
			'modal.cancel': 'Cancel',
			'modal.delete': 'Delete',
			'modal.deleteConfirm': 'Click again to confirm',
			'modal.close': 'Close',
			'empty.tasks': 'No tasks in this scope yet',
			'empty.button': 'Create the first task',
			'loading': 'Loading…',
			'due.overdue': '{days}d overdue',
			'due.today': 'Due today',
			'due.tomorrow': 'Due tomorrow',
			'due.inDays': 'In {days}d',
			'due.plain': '{date}',
			'due.overdueMin': '{m}m overdue',
			'due.overdueH': '{h}h overdue',
			'due.overdueD': '{d}d overdue',
			'due.inMin': 'Due in {m}m',
			'due.todayAt': 'Today at {time}',
			'due.tomorrowAt': 'Tomorrow at {time}',
			'due.plainAt': '{date} at {time}',
			'remind.title': 'Deadline alerts',
			'view.list': 'List',
			'view.calendar': 'Calendar',
			'cal.today': 'Today',
			'cal.month': '{y}-{m}',
			'cal.newOn': 'New task on {date}',
			'cal.week.1': 'Mon',
			'cal.week.2': 'Tue',
			'cal.week.3': 'Wed',
			'cal.week.4': 'Thu',
			'cal.week.5': 'Fri',
			'cal.week.6': 'Sat',
			'cal.week.7': 'Sun',
			'cal.undated': 'Tasks without a due date',
			'cal.subPrefix': 'Subtask',
			'setup.title': 'Point the plugin at a repository first',
			'setup.body': 'Tasks are stored as one JSON file each inside this repository and committed locally on every change; Pull / Push keep the remote Git repository in sync.',
			'setup.repoDir': 'Repository path (absolute)',
			'setup.remote': 'Remote URL (HTTPS, optional)',
			'setup.branch': 'Branch',
			'setup.autoCommit': 'Auto-commit locally after changes',
			'setup.save': 'Save & initialize',
			'setup.hint': 'The config lives at {path}; changing the path later never needs a reinstall.',
			'git.title': 'Git status',
			'git.unconfigured': 'No repository path set yet',
			'git.notRepo': 'This directory is not a Git repository yet; saving the settings initializes it',
			'git.branch': 'Branch {name}',
			'git.dirty': '{count} file(s) uncommitted',
			'git.clean': 'Working tree clean',
			'git.ahead': '{count} ahead',
			'git.behind': '{count} behind',
			'git.last': 'Last commit {hash} {subject}',
			'notice.saved': 'Saved',
			'notice.deleted': 'Deleted',
			'notice.projectDeleted': 'Project (and sub-projects) deleted; tasks are now unfiled',
			'notice.repoCreated': 'Repository initialized',
			'notice.commitFailed': 'Auto-commit failed',
			'notice.pushed': 'Push complete',
			'notice.pushFailed': 'Push failed',
			'notice.pulled': 'Pull complete',
			'notice.pullFailed': 'Pull failed',
			'confirm.projectDelete': 'Delete? Sub-projects are removed too; tasks become unfiled',
			'project.newName': 'New project',
			'field.parent': 'Parent project',
			'field.parentTop': 'Top level (no parent)',
			'action.newSubProject': '＋ Sub-project',
			'env.title': 'Runtime',
			'env.gitMissing': 'not detected',
			'error.title': 'Something went wrong',
			'error.retry': 'Retry',
			'problems.title': 'These task files could not be parsed and were skipped'
		};

		function describe(error) {
			return error instanceof Error ? error.message : String(error);
		}

		function pad2(value) {
			return value < 10 ? '0' + value : String(value);
		}

		function todayKey(now) {
			const date = new Date(now === undefined ? Date.now() : now);
			return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
		}

		function dayDiff(from, to) {
			return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / DAY_MS);
		}

		function uid() {
			try {
				return globalThis.crypto.randomUUID();
			} catch {
				return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
			}
		}

		const HOUR_MS = 60 * 60 * 1000;

		// Due values are 'YYYY-MM-DD' (legacy, treated as end-of-day) or 'YYYY-MM-DDTHH:mm' (local time).
		function parseDue(due) {
			if (due === null || due === undefined || typeof due !== 'string') return null;
			const ms = due.length === 10 ? Date.parse(due + 'T23:59:59') : Date.parse(due);
			return Number.isNaN(ms) ? null : ms;
		}

		function fmtTime(ms) {
			const d = new Date(ms);
			return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
		}

		function dueLabel(due, now, t) {
			const ms = parseDue(due);
			if (ms === null) return '';
			if (due.length === 10) {
				const days = dayDiff(todayKey(now), due);
				if (days < 0) return t('due.overdue', { days: -days });
				if (days === 0) return t('due.today');
				if (days === 1) return t('due.tomorrow');
				if (days <= 30) return t('due.inDays', { days: days });
				return t('due.plain', { date: due.slice(5) });
			}
			const diffMin = Math.round((ms - now) / 60000);
			if (diffMin < 0) {
				const od = -diffMin;
				if (od < 60) return t('due.overdueMin', { m: od });
				if (od < 24 * 60) return t('due.overdueH', { h: Math.round(od / 60) });
				return t('due.overdueD', { d: Math.round(od / (24 * 60)) });
			}
			if (diffMin < 60) return t('due.inMin', { m: Math.max(1, diffMin) });
			const d = new Date(ms);
			const n = new Date(now);
			const sameDay = d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
			const tmr = new Date(now);
			tmr.setDate(tmr.getDate() + 1);
			const isTomorrow = d.getFullYear() === tmr.getFullYear() && d.getMonth() === tmr.getMonth() && d.getDate() === tmr.getDate();
			if (sameDay) return t('due.todayAt', { time: fmtTime(ms) });
			if (isTomorrow) return t('due.tomorrowAt', { time: fmtTime(ms) });
			return t('due.plainAt', { date: pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()), time: fmtTime(ms) });
		}

		function dueTone(due, now, done) {
			if (due === null || due === undefined) return null;
			if (done) return 'muted';
			const ms = parseDue(due);
			if (ms === null) return 'muted';
			if (ms < now) return 'error-ring';
			if (ms - now <= HOUR_MS) return 'error';
			return 'warn';
		}

		/** Short 880 Hz beep for deadline alerts; caller supplies the unlocked AudioContext. */
		function beepTone(ctx) {
			if (ctx === null) return;
			try {
				if (ctx.state === 'suspended') {
					ctx.resume().catch(() => {});
					return;
				}
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = 'sine';
				osc.frequency.value = 880;
				gain.gain.setValueAtTime(0.0001, ctx.currentTime);
				gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
				gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start();
				osc.stop(ctx.currentTime + 0.55);
			} catch {
				/* audio unavailable */
			}
		}

		/**
		 * Resolve the effective color scheme for native controls (select popups, date pickers).
		 * Prefers the scheme the shell projects onto <html>; otherwise derives it from the
		 * luminance of the base background token.
		 */
		function currentColorScheme() {
			try {
				const root = getComputedStyle(document.documentElement);
				const value = (root.colorScheme || '').toLowerCase().replace(/\s+/g, ' ').trim();
				if (value === 'dark' || value === 'light') return value;
				const raw = (root.getPropertyValue('--dsw-alias-bg-base') || '').trim();
				let r; let g; let b;
				const rgb = raw.match(/rgba?\(([^)]+)\)/);
				const hex = raw.match(/^#([0-9a-f]{3,8})$/i);
				if (rgb !== null) {
					const parts = rgb[1].split(/[\s,\/]+/).filter((p) => p !== '');
					r = Number.parseFloat(parts[0]); g = Number.parseFloat(parts[1]); b = Number.parseFloat(parts[2]);
				} else if (hex !== null) {
					let hx = hex[1];
					if (hx.length === 4 || hx.length === 8) hx = hx.slice(1).split('').map((c) => c + c).join('');
					r = Number.parseInt(hx.slice(0, 2), 16); g = Number.parseInt(hx.slice(2, 4), 16); b = Number.parseInt(hx.slice(4, 6), 16);
				}
				if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return '';
				const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
				return luminance < 0.5 ? 'dark' : 'light';
			} catch {
				return '';
			}
		}

		/**
		 * Page-wide single-popup protocol: opening any popup (modal, select menu,
		 * quick-move menu) claims the foreground. Every other open popup whose own
		 * subtree does not contain the claiming element closes itself — so at most
		 * one popup is visible at a time, even across duplicate panel instances.
		 */
		function claimPopup(sourceEl) {
			try {
				document.dispatchEvent(new CustomEvent('dsh-todo:claim', { detail: { source: sourceEl } }));
			} catch {
				/* claim is best-effort */
			}
		}

		function claimFromOutside(event, hostEl) {
			const source = event !== null && event !== undefined && event.detail !== null && event.detail !== undefined ? event.detail.source : null;
			return source instanceof Element && (hostEl === null || hostEl === undefined || !hostEl.contains(source));
		}

		function compareTasks(left, right) {
			const rank = STATUS_RANK[left.status] - STATUS_RANK[right.status];
			if (rank !== 0) return rank;
			const lp = left.priority === null ? 9 : left.priority;
			const rp = right.priority === null ? 9 : right.priority;
			if (lp !== rp) return lp - rp;
			const ld = left.due === null ? '9999-99-99' : left.due;
			const rd = right.due === null ? '9999-99-99' : right.due;
			if (ld !== rd) return ld < rd ? -1 : 1;
			return (left.order === null || left.order === undefined ? 0 : left.order) - (right.order === null || right.order === undefined ? 0 : right.order);
		}

		function chip(key, label, tone) {
			return h('span', { key: key, className: 'dt-chip', 'data-tone': tone === null ? 'muted' : tone }, label);
		}

		function field(key, label, control) {
			return h('label', { key: key, className: 'dt-field' }, [
				h('span', { key: 'label', className: 'dt-field-label' }, label),
				React.cloneElement(control, { key: 'control' })
			]);
		}

		/**
		 * Every Host action is an exact Fetch route under /api/dsh-todo/, so this plain
		 * same-origin POST rides the Host/Origin fence and browser authentication.
		 */
		async function directCall(action, payload, signal) {
			const response = await fetch('/api' + CHANNEL + '/' + action, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload === undefined || payload === null ? {} : payload),
				signal: signal
			});
			let envelope;
			try {
				envelope = await response.json();
			} catch {
				throw new Error('transport failure for ' + CHANNEL + '/' + action + ': HTTP ' + response.status);
			}
			if (envelope === null || typeof envelope !== 'object') {
				throw new Error('unexpected response for ' + CHANNEL + '/' + action);
			}
			if (envelope.ok !== true) {
				const detail = envelope.error !== null && typeof envelope.error === 'object' ? envelope.error.message : void 0;
				throw new Error(typeof detail === 'string' ? detail : 'transport failure for ' + CHANNEL + '/' + action + ': HTTP ' + response.status);
			}
			return envelope.value;
		}

		/** Sidebar entry icon: a checklist. */
		function TodoIcon(props) {
			const size = typeof props.size === 'number' && props.size > 0 ? props.size : 20;
			return h('svg', {
				className: 'dt-icon',
				width: size,
				height: size,
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				strokeWidth: 1.8,
				strokeLinecap: 'round',
				strokeLinejoin: 'round',
				'aria-hidden': 'true',
				'data-active': props.active === true ? 'true' : 'false'
			}, [
				h('path', { key: 'c1', d: 'M3.5 6.6l1.5 1.5 2.7-2.8' }),
				h('path', { key: 'c2', d: 'M3.5 12.6l1.5 1.5 2.7-2.8' }),
				h('path', { key: 'c3', d: 'M3.5 18.6l1.5 1.5 2.7-2.8' }),
				h('path', { key: 'l1', d: 'M11.5 6.5h8.5' }),
				h('path', { key: 'l2', d: 'M11.5 12.5h8.5' }),
				h('path', { key: 'l3', d: 'M11.5 18.5h8.5' })
			]);
		}

		/** Decorative inbox icon for the empty state. */
		function EmptyIcon() {
			return h('svg', {
				key: 'icon',
				className: 'dt-empty-icon',
				width: 40,
				height: 40,
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				strokeWidth: 1.4,
				strokeLinecap: 'round',
				strokeLinejoin: 'round',
				'aria-hidden': 'true'
			}, [
				h('path', { key: 'box', d: 'M4.5 13.5 7 6.5h10l2.5 7v4a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z' }),
				h('path', { key: 'slot', d: 'M4.5 13.5h4.2l1.4 2.6h3.8l1.4-2.6h4.2' })
			]);
		}

		/** Shared modal chrome: fixed overlay + card + Escape / backdrop close. */
		function ModalShell(props) {
			const title = props.title;
			const onClose = props.onClose;
			const shellRef = React.useRef(null);
			const closeRef = React.useRef(onClose);
			closeRef.current = onClose;
			React.useEffect(() => {
				const onKey = (event) => {
					if (event.key === 'Escape') closeRef.current();
				};
				document.addEventListener('keydown', onKey);
				return () => document.removeEventListener('keydown', onKey);
			}, []);
			// Own the foreground while mounted: claim on mount, step down when a popup
			// outside this modal's subtree claims it (one popup per page, always).
			React.useEffect(() => {
				claimPopup(shellRef.current);
				const onClaim = (event) => {
					if (claimFromOutside(event, shellRef.current)) closeRef.current();
				};
				document.addEventListener('dsh-todo:claim', onClaim);
				return () => document.removeEventListener('dsh-todo:claim', onClaim);
			}, []);
			return h('div', {
				className: 'dt-overlay',
				role: 'presentation',
				onClick: (event) => {
					if (event.target === event.currentTarget) onClose();
				}
			}, h('div', {
				className: 'dt-modal',
				role: 'dialog',
				'aria-modal': 'true',
				'aria-label': title,
				ref: shellRef
			}, [
				h('h2', { key: 'title', className: 'dt-modal-title' }, title),
				h('div', { key: 'body', className: 'dt-modal-body' }, props.children),
				props.footer === null || props.footer === undefined ? null : h('div', { key: 'foot', className: 'dt-modal-foot' }, props.footer)
			]));
		}

		/** Two-step delete button: first click arms it, second click deletes. */
		function DeleteButton(props) {
			const t = props.t;
			const [armed, setArmed] = React.useState(false);
			React.useEffect(() => {
				if (!armed) return undefined;
				const timer = setTimeout(() => setArmed(false), 3000);
				return () => clearTimeout(timer);
			}, [armed]);
			return h('button', {
				type: 'button',
				className: 'dt-btn',
				'data-danger': 'true',
				'data-armed': armed ? 'true' : 'false',
				disabled: props.busy === true,
				onClick: () => {
					if (armed) props.onDelete();
					else setArmed(true);
				}
			}, armed ? t('modal.deleteConfirm') : t('modal.delete'));
		}

		function ProjectModal(props) {
			const t = props.t;
			const project = props.project;
			const projects = Array.isArray(props.projects) ? props.projects : [];
			const [name, setName] = React.useState(project === null ? '' : project.name);
			const [color, setColor] = React.useState(project === null ? '' : (project.color || ''));
			const [parentId, setParentId] = React.useState(project !== null ? (project.parentId || '') : (props.parentId || ''));
			const [busy, setBusy] = React.useState(false);
			const [errorText, setErrorText] = React.useState(null);

			// Parent options: only top-level projects can be parents (nesting is
			// capped at two levels), never the project itself, and never one of
			// its own descendants (a cycle the Host would reject anyway).
			const parentOptions = (() => {
				const topLevel = projects.filter((item) => (item.parentId ?? null) === null);
				if (project === null) return topLevel;
				const excluded = new Set([project.id]);
				const stack = [project.id];
				while (stack.length > 0) {
					const current = stack.pop();
					for (const item of topLevel) {
						if (item.parentId === current && !excluded.has(item.id)) {
							excluded.add(item.id);
							stack.push(item.id);
						}
					}
				}
				return topLevel.filter((item) => !excluded.has(item.id));
			})();

			const save = async () => {
				if (busy || name.trim() === '') return;
				setBusy(true);
				setErrorText(null);
				const result = await props.onSave({
					id: project === null ? null : project.id,
					parentId: parentId === '' ? null : parentId,
					name: name,
					color: color,
					order: project === null ? Date.now() : project.order
				});
				if (result.ok !== true) {
					setErrorText(typeof result.error === 'string' && result.error !== '' ? result.error : null);
					setBusy(false);
				}
			};
			const remove = async () => {
				if (busy || project === null) return;
				setBusy(true);
				await props.onDelete(project.id);
			};

			const swatches = PROJECT_COLORS.map((value, index) => h('button', {
				key: index,
				type: 'button',
				className: 'dt-swatch',
				'data-selected': color === value ? 'true' : 'false',
				'aria-label': value === '' ? '—' : value,
				style: value === '' ? undefined : { background: value },
				onClick: () => setColor(value)
			}, ''));

			return h(ModalShell, {
				title: project === null ? t('modal.project.new') : t('modal.project.edit'),
				onClose: props.onClose,
				footer: h(React.Fragment, null, [
					project === null ? null : h(DeleteButton, { key: 'del', t: t, busy: busy, onDelete: remove }),
					h('span', { key: 'spacer' }),
					h('div', { key: 'right', className: 'dt-modal-foot-right' }, [
						h('button', { key: 'cancel', type: 'button', className: 'dt-btn', disabled: busy, onClick: props.onClose }, t('modal.cancel')),
						h('button', { key: 'save', type: 'button', className: 'dt-btn', 'data-primary': 'true', disabled: busy || name.trim() === '', onClick: () => { void save(); } }, busy ? t('modal.saving') : t('modal.save'))
					])
				])
			}, [
				field('name', t('field.name'), h('input', {
					key: 'name',
					className: 'dt-text',
					value: name,
					placeholder: t('field.namePlaceholder'),
					autoFocus: true,
					onChange: (event) => setName(event.target.value),
					onKeyDown: (event) => { if (event.key === 'Enter') { void save(); } }
				})),
				field('color', t('field.color'), h('div', { key: 'swatches', className: 'dt-swatch-row' }, swatches)),
				field('parent', t('field.parent'), h(SelectBox, {
					key: 'parent',
					value: parentId,
					onChange: (value) => setParentId(value),
					options: [
						{ value: '', label: t('field.parentTop') },
						...parentOptions.map((item) => ({ value: item.id, label: item.name }))
					]
				})),
				errorText === null ? null : h('div', { key: 'err', className: 'dt-modal-err' }, errorText)
			]);
		}

		/**
		 * Theme-aware dropdown replacing the native <select>: native option popups are
		 * painted by the browser in its own color scheme (white on dark themes here),
		 * so every menu in this panel uses this component instead.
		 *
		 * props: value (string); options: [{ value, label, group?, disabled? }] —
		 * an option carrying a `group` renders that group header above its run;
		 * onChange(value).
		 */
		// NOTE: the menu renders INLINE inside the selectbox (part of the modal's own
		// paint layer). This webview's compositor duplicates the modal layer with an
		// offset ghost; a menu living in a separate layer gets covered by that ghost,
		// but a menu inside the modal layer paints above the fields in EVERY copy of
		// the duplicated layer, making the artifact harmless. .dt-selectbox carries a
		// high z-index so it (and its menu) always beats the static form fields.
		function SelectBox(props) {
			const [open, setOpen] = React.useState(false);
			const boxRef = React.useRef(null);

			React.useEffect(() => {
				if (!open) return undefined;
				claimPopup(boxRef.current);
				const onClaim = (event) => {
					if (claimFromOutside(event, boxRef.current)) setOpen(false);
				};
				const onDown = (event) => {
					const node = event.target;
					if (node instanceof Element && node.closest('.dt-selectbox') !== null) return;
					setOpen(false);
				};
				// Capture phase + stopPropagation: Esc closes only this menu, not the modal behind it.
				const onKey = (event) => {
					if (event.key === 'Escape') {
						event.stopPropagation();
						setOpen(false);
					}
				};
				document.addEventListener('dsh-todo:claim', onClaim);
				document.addEventListener('mousedown', onDown);
				document.addEventListener('keydown', onKey, true);
				return () => {
					document.removeEventListener('dsh-todo:claim', onClaim);
					document.removeEventListener('mousedown', onDown);
					document.removeEventListener('keydown', onKey, true);
				};
			}, [open]);

			const current = props.options.find((item) => item.value === props.value);
			const label = current !== undefined ? current.label : '';

			const items = [];
			let lastGroup = null;
			for (const item of props.options) {
				if (item.group !== undefined && item.group !== lastGroup) {
					items.push(h('div', { key: 'group' + item.group, className: 'dt-selectbox-group', role: 'presentation' }, item.group));
					lastGroup = item.group;
				}
				items.push(h('button', {
					key: item.value === '' ? 'empty' : item.value,
					type: 'button',
					role: 'option',
					className: 'dt-selectbox-item',
					'data-selected': item.value === props.value ? 'true' : 'false',
					disabled: item.disabled === true,
					onClick: () => {
						setOpen(false);
						props.onChange(item.value);
					}
				}, item.label));
			}

			return h('div', { className: 'dt-selectbox', ref: boxRef }, [
				h('button', {
					key: 'btn',
					type: 'button',
					className: 'dt-selectbox-btn',
					'aria-haspopup': 'listbox',
					'aria-expanded': String(open),
					onClick: () => setOpen((v) => !v)
				}, [
					h('span', { key: 'label', className: 'dt-selectbox-label' }, label),
					h('span', { key: 'caret', className: 'dt-selectbox-caret', 'aria-hidden': 'true' }, '▾')
				]),
				open ? h('div', { key: 'menu', className: 'dt-selectbox-menu', role: 'listbox' }, items) : null
			]);
		}

		function TaskModal(props) {
			const t = props.t;
			const task = props.task;
			const [title, setTitle] = React.useState(task === null ? '' : task.title);
			const [projectId, setProjectId] = React.useState(task === null ? (props.defaultProjectId || '') : (task.projectId || ''));
			const [priority, setPriority] = React.useState(task === null ? '' : (task.priority === null ? '' : String(task.priority)));
			const [status, setStatus] = React.useState(task === null ? 'todo' : task.status);
			const [due, setDue] = React.useState(task === null ? (props.defaultDue || '') : (task.due === null ? '' : (task.due.length === 10 ? task.due + 'T23:00' : task.due)));
			const [notes, setNotes] = React.useState(task === null ? '' : task.notes);
			const [subtasks, setSubtasks] = React.useState(task === null ? [] : task.subtasks);
			const [busy, setBusy] = React.useState(false);
			const [errorText, setErrorText] = React.useState(null);

			const patchSubtask = (id, patch) => {
				setSubtasks((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
			};

			const save = async () => {
				if (busy) return;
				setBusy(true);
				setErrorText(null);
				const result = await props.onSave({
					id: task === null ? null : task.id,
					title: title,
					projectId: projectId === '' ? null : projectId,
					priority: priority === '' ? null : Number(priority),
					status: status,
					due: due === '' ? null : due,
					notes: notes,
					tags: task === null ? [] : task.tags,
					order: task === null ? Date.now() : task.order,
					subtasks: subtasks
				});
				if (result.ok !== true) {
					setErrorText(result.error);
					setBusy(false);
				}
			};
			const remove = async () => {
				if (busy || task === null) return;
				setBusy(true);
				await props.onDelete(task.id);
			};

			const subtaskRows = subtasks.map((subtask) => h('div', { key: subtask.id, className: 'dt-msub' }, [
				h('button', {
					key: 'check',
					type: 'button',
					className: 'dt-subcheck',
					role: 'checkbox',
					'aria-checked': subtask.done ? 'true' : 'false',
					'aria-label': subtask.title !== '' ? subtask.title : t('subtask.placeholder'),
					'data-done': subtask.done ? 'true' : 'false',
					onClick: () => patchSubtask(subtask.id, { done: !subtask.done })
				}, subtask.done ? '✓' : ''),
				h('input', {
					key: 'title',
					className: 'dt-text dt-subinput',
					value: subtask.title,
					placeholder: t('subtask.placeholder'),
					onChange: (event) => patchSubtask(subtask.id, { title: event.target.value })
				}),
				h('input', {
					key: 'due',
					type: 'date',
					className: 'dt-date',
					'aria-label': t('field.subtaskDue'),
					value: subtask.due === null || subtask.due === undefined ? '' : subtask.due,
					onChange: (event) => patchSubtask(subtask.id, { due: event.target.value === '' ? null : event.target.value })
				}),
				h('button', { key: 'del', type: 'button', className: 'dt-ghost', 'aria-label': t('modal.delete'), onClick: () => setSubtasks((current) => current.filter((item) => item.id !== subtask.id)) }, '×')
			]));

			return h(ModalShell, {
				title: task === null ? t('modal.task.new') : t('modal.task.edit'),
				onClose: props.onClose,
				footer: h(React.Fragment, null, [
					task === null ? null : h(DeleteButton, { key: 'del', t: t, busy: busy, onDelete: remove }),
					h('span', { key: 'spacer' }),
					h('div', { key: 'right', className: 'dt-modal-foot-right' }, [
						h('button', { key: 'cancel', type: 'button', className: 'dt-btn', disabled: busy, onClick: props.onClose }, t('modal.cancel')),
						h('button', { key: 'save', type: 'button', className: 'dt-btn', 'data-primary': 'true', disabled: busy, onClick: () => { void save(); } }, busy ? t('modal.saving') : t('modal.save'))
					])
				])
			}, [
				field('title', t('field.title'), h('input', {
					key: 'title',
					className: 'dt-text',
					value: title,
					placeholder: t('field.titlePlaceholder'),
					autoFocus: true,
					onChange: (event) => setTitle(event.target.value),
					onKeyDown: (event) => { if (event.key === 'Enter') { void save(); } }
				})),
				h('div', { key: 'row1', className: 'dt-field-row' }, [
					field('project', t('field.project'), h(SelectBox, {
						key: 'project',
						value: projectId,
						onChange: (value) => setProjectId(value),
						options: [
							{ value: '', label: t('noProject') },
							...props.projects.filter((item) => (item.parentId ?? null) === null).map((item) => ({ value: item.id, label: item.name, group: t('filter.projects') })),
							...props.projects.filter((item) => (item.parentId ?? null) !== null).map((item) => ({ value: item.id, label: item.name, group: t('filter.subprojects') }))
						]
					})),
					field('priority', t('field.priority'), h(SelectBox, {
						key: 'priority',
						value: priority,
						onChange: (value) => setPriority(value),
						options: [
							{ value: '', label: t('priority.none') },
							{ value: '1', label: t('priority.1') },
							{ value: '2', label: t('priority.2') },
							{ value: '3', label: t('priority.3') },
							{ value: '4', label: t('priority.4') }
						]
					}))
				]),
				h('div', { key: 'row2', className: 'dt-field-row' }, [
					field('status', t('field.status'), h(SelectBox, {
						key: 'status',
						value: status,
						onChange: (value) => setStatus(value),
						options: [
							{ value: 'todo', label: t('status.todo') },
							{ value: 'doing', label: t('status.doing') },
							{ value: 'done', label: t('status.done') }
						]
					})),
					field('due', t('field.due'), h('input', {
						key: 'due',
						type: 'datetime-local',
						step: 3600,
						className: 'dt-date',
						value: due,
						onChange: (event) => setDue(event.target.value)
					}))
				]),
				field('subtasks', t('field.subtasks'), h('div', {
					key: 'subs',
					className: 'dt-msubs'
				}, [
					...subtaskRows,
					h('button', {
						key: 'add',
						type: 'button',
						className: 'dt-add',
						onClick: () => setSubtasks((current) => current.concat([{ id: uid(), title: '', done: false, due: null, priority: null, order: current.length }]))
					}, t('subtask.add'))
				])),
				field('notes', t('field.notes'), h('textarea', {
					key: 'notes',
					className: 'dt-textarea',
					value: notes,
					placeholder: t('field.notesPlaceholder'),
					onChange: (event) => setNotes(event.target.value)
				})),
				errorText === null ? null : h('div', { key: 'err', className: 'dt-modal-err' }, errorText)
			]);
		}

		/** Month grid: every task that carries a due date, placed on its day. */
		function CalendarView(props) {
			const t = props.t;
			const todayStr = todayKey();
			const [cursor, setCursor] = React.useState(() => {
				const d = new Date();
				return { y: d.getFullYear(), m: d.getMonth() };
			});
			const shiftMonth = (delta) => {
				setCursor((c) => {
					const d = new Date(c.y, c.m + delta, 1);
					return { y: d.getFullYear(), m: d.getMonth() };
				});
			};
			const goToday = () => {
				const d = new Date();
				setCursor({ y: d.getFullYear(), m: d.getMonth() });
			};

			// Calendar items: tasks and subtasks that carry a due date, keyed by day.
			const byDate = React.useMemo(() => {
				const map = new Map();
				const add = (key, item) => {
					const list = map.get(key);
					if (list === undefined) map.set(key, [item]);
					else list.push(item);
				};
				for (const task of props.tasks) {
					if (typeof task.due === 'string' && task.due.length >= 10) add(task.due.slice(0, 10), { kind: 'task', task: task });
					for (const sub of task.subtasks || []) {
						if (typeof sub.due === 'string' && sub.due.length >= 10) add(sub.due.slice(0, 10), { kind: 'subtask', task: task, sub: sub });
					}
				}
				for (const list of map.values()) {
					list.sort((a, b) => {
						const da = a.kind === 'task' ? a.task.due : a.sub.due;
						const db = b.kind === 'task' ? b.task.due : b.sub.due;
						if (da !== db) return da < db ? -1 : 1;
						if (a.kind !== b.kind) return a.kind === 'task' ? -1 : 1;
						const ta = a.kind === 'task' ? a.task.title : a.sub.title;
						const tb = b.kind === 'task' ? b.task.title : b.sub.title;
						return ta.localeCompare(tb);
					});
				}
				return map;
			}, [props.tasks]);

			// Open tasks without a due date, listed below the grid (done ones hidden).
			const undated = React.useMemo(() => {
				const list = props.tasks.filter((task) => (task.due === null || task.due === undefined) && task.status !== 'done');
				list.sort((a, b) => compareTasks(a, b));
				return list;
			}, [props.tasks]);

			const projectById = React.useMemo(() => {
				const map = new Map();
				for (const p of props.projects) map.set(p.id, p);
				return map;
			}, [props.projects]);

			const projectName = (task) => {
				const p = task.projectId === null ? undefined : projectById.get(task.projectId);
				return p === undefined ? null : h('span', { key: 'proj', className: 'dt-cal-undated-proj' }, p.name);
			};

			const first = new Date(cursor.y, cursor.m, 1);
			const offset = (first.getDay() + 6) % 7; // Monday-first weeks
			const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();

			const cells = [];
			for (let i = 0; i < offset; i++) cells.push(null);
			for (let d = 1; d <= daysInMonth; d++) cells.push(d);

			const renderCell = (day, index) => {
				if (day === null) {
					return h('div', { key: 'pad' + index, className: 'dt-cal-cell', 'data-blank': 'true', 'aria-hidden': 'true' });
				}
				const dateKey = cursor.y + '-' + pad2(cursor.m + 1) + '-' + pad2(day);
				const dayTasks = byDate.get(dateKey) || [];
				return h('div', {
					key: dateKey,
					className: 'dt-cal-cell',
					'data-today': dateKey === todayStr ? 'true' : 'false',
					role: 'button',
					tabIndex: 0,
					title: t('cal.newOn', { date: dateKey }),
					onClick: () => props.onNewTask(dateKey),
					onKeyDown: (event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							props.onNewTask(dateKey);
						}
					}
				}, [
					h('span', { key: 'day', className: 'dt-cal-day' }, day),
					...dayTasks.map((item) => {
						const dueStr = item.kind === 'task' ? item.task.due : item.sub.due;
						const titleText = item.kind === 'task' ? item.task.title : item.sub.title;
						const done = item.kind === 'task' ? item.task.status === 'done' : item.sub.done === true;
						return h('button', {
							key: item.kind + (item.kind === 'task' ? item.task.id : item.sub.id),
							type: 'button',
							className: 'dt-cal-task',
							'data-tone': dueTone(dueStr, props.now, done),
							'data-done': done ? 'true' : 'false',
							title: (item.kind === 'subtask' ? t('cal.subPrefix') + '：' : '') + titleText + (dueStr.length === 16 ? ' ' + dueStr.slice(11, 16) : ''),
							onClick: (event) => {
								event.stopPropagation();
								props.onOpenTask(item.task);
							}
						}, [
							dueStr.length === 16 ? h('span', { key: 'time', className: 'dt-cal-time' }, dueStr.slice(11, 16)) : null,
							item.kind === 'subtask' ? h('span', { key: 'mark', className: 'dt-cal-submark' }, '↳') : null,
							titleText
						]);
					})
				]);
			};

			return h('div', { className: 'dt-cal' }, [
				h('div', { key: 'head', className: 'dt-cal-head' }, [
					h('button', { key: 'prev', type: 'button', className: 'dt-ghost', 'aria-label': '←', onClick: () => shiftMonth(-1) }, '‹'),
					h('button', { key: 'today', type: 'button', className: 'dt-ghost', onClick: goToday }, t('cal.today')),
					h('button', { key: 'next', type: 'button', className: 'dt-ghost', 'aria-label': '→', onClick: () => shiftMonth(1) }, '›'),
					h('div', { key: 'title', className: 'dt-cal-title' }, t('cal.month', { y: cursor.y, m: pad2(cursor.m + 1) })),
					h('div', { key: 'spacer', style: { flex: 1 } })
				]),
				h('div', { key: 'week', className: 'dt-cal-week', 'aria-hidden': 'true' }, [
					...Array.from({ length: 7 }, (_, i) => h('div', { key: 'dow' + (i + 1), className: 'dt-cal-dow' }, t('cal.week.' + (i + 1))))
				]),
				h('div', { key: 'grid', className: 'dt-cal-grid' }, cells.map((day, index) => renderCell(day, index))),
				undated.length === 0 ? null : h('div', { key: 'undated', className: 'dt-cal-undated' }, [
					h('div', { key: 'head', className: 'dt-cal-undated-head' }, t('cal.undated') + '（' + undated.length + '）'),
					...undated.map((task) => h('button', {
						key: task.id,
						type: 'button',
						className: 'dt-cal-undated-item',
						'data-done': task.status === 'done' ? 'true' : 'false',
						onClick: () => props.onOpenTask(task)
					}, [
						h('span', { key: 'title', className: 'dt-cal-undated-title' }, task.title),
						projectName(task)
					]))
				])
			]);
		}

		function TodoPanel(props) {
			const t = props.t;
			const request = props.request;
			const readLocaleRevision = props.readLocaleRevision;
			const onLocaleChange = props.onLocaleChange;

			const [localeRevision, setLocaleRevision] = React.useState(() => readLocaleRevision());
			const [status, setStatus] = React.useState('loading');
			const [data, setData] = React.useState(null);
			const [error, setError] = React.useState(null);
			const [notice, setNotice] = React.useState(null);
			const [view, setView] = React.useState('calendar');
			const [mainView, setMainView] = React.useState('calendar');
			const [filter, setFilter] = React.useState({ kind: 'all', id: null });
			const [showDone, setShowDone] = React.useState(true);
			const [busy, setBusy] = React.useState(null);
			const [modal, setModal] = React.useState(null);
			const [pendingProject, setPendingProject] = React.useState(null);
			const [moveFor, setMoveFor] = React.useState(null);
			const [nowTick, setNowTick] = React.useState(() => Date.now());
			const [scheme, setScheme] = React.useState('');
			const firedRef = React.useRef(null);
			const audioRef = React.useRef(null);
			const [form, setForm] = React.useState(null);
			const [env, setEnv] = React.useState(null);

			const alive = React.useRef(true);

			React.useEffect(() => {
				alive.current = true;
				return () => { alive.current = false; };
			}, []);

			React.useEffect(() => onLocaleChange(() => setLocaleRevision(readLocaleRevision())), []);

			const load = React.useCallback(async () => {
				try {
					const value = await request('state', {});
					if (!alive.current) return;
					setData(value);
					setError(null);
					setStatus(value.config.repoDir === '' ? 'setup' : 'ready');
					setForm((current) => current === null ? {
						repoDir: value.config.repoDir,
						remote: value.config.remote,
						branch: value.config.branch,
						autoCommit: value.config.autoCommit
					} : current);
				} catch (cause) {
					if (!alive.current) return;
					setError(describe(cause));
					setStatus('error');
				}
			}, [request]);

			React.useEffect(() => { void load(); }, [load]);

			React.useEffect(() => {
				let cancelled = false;
				(async () => {
					try {
						const value = await request('env', {});
						if (!cancelled && alive.current) setEnv(value);
					} catch {
						// Diagnostics only; the panel works without them.
					}
				})();
				return () => { cancelled = true; };
			}, [request]);

			const tasks = React.useMemo(() => (data === null ? [] : data.tasks), [data]);
			const projects = React.useMemo(() => (data === null ? [] : data.projects), [data]);
			// Top-level projects first, then their sub-projects (keeps pickers readable).
			const orderedProjects = React.useMemo(() => {
				const top = projects.filter((item) => (item.parentId ?? null) === null);
				const sub = projects.filter((item) => (item.parentId ?? null) !== null);
				return [...top, ...sub];
			}, [projects]);

			// Deadline alerts: open tasks with a time-precise due date, within one hour of (or past) it.
			const reminders = React.useMemo(() => {
				const list = [];
				for (const task of tasks) {
					if (task.status === 'done' || typeof task.due !== 'string' || task.due.length !== 16) continue;
					const ms = parseDue(task.due);
					if (ms === null) continue;
					if (nowTick >= ms - HOUR_MS) list.push({ task, ms });
				}
				return list.sort((a, b) => a.ms - b.ms);
			}, [tasks, nowTick]);

			// Beep once per task when it enters the alert window after the initial render.
			React.useEffect(() => {
				if (firedRef.current === null) {
					firedRef.current = new Set(reminders.map((item) => item.task.id));
					return;
				}
				let fired = false;
				for (const item of reminders) {
					if (!firedRef.current.has(item.task.id)) {
						firedRef.current.add(item.task.id);
						fired = true;
					}
				}
				for (const id of [...firedRef.current]) {
					if (!reminders.some((item) => item.task.id === id)) firedRef.current.delete(id);
				}
				if (fired) beepTone(audioRef.current);
			}, [reminders]);

			// A project filter covers the whole subtree: the project itself plus
			// every (transitive) sub-project.
			const projectScope = React.useMemo(() => {
				if (filter.kind !== 'project') return null;
				const scope = new Set([filter.id]);
				const stack = [filter.id];
				while (stack.length > 0) {
					const current = stack.pop();
					for (const item of projects) {
						if (item.parentId === current && !scope.has(item.id)) {
							scope.add(item.id);
							stack.push(item.id);
						}
					}
				}
				return scope;
			}, [filter, projects]);

			const visible = React.useMemo(() => {
				return tasks.filter((task) => {
					if (filter.kind === 'project' && !(task.projectId !== null && projectScope.has(task.projectId))) return false;
					if (filter.kind === 'unfiled' && task.projectId !== null) return false;
					if (!showDone && task.status === 'done') return false;
					return true;
				}).sort(compareTasks);
			}, [tasks, filter, showDone, projectScope]);

			const groups = React.useMemo(() => [
				{ id: 'doing', items: visible.filter((task) => task.status === 'doing') },
				{ id: 'todo', items: visible.filter((task) => task.status === 'todo') },
				{ id: 'done', items: visible.filter((task) => task.status === 'done') }
			], [visible]);

			const counts = React.useMemo(() => {
				const map = new Map();
				let unfiled = 0;
				for (const task of tasks) {
					if (task.projectId === null) unfiled += 1;
					else map.set(task.projectId, (map.get(task.projectId) ?? 0) + 1);
				}
				return { map: map, unfiled: unfiled, all: tasks.length };
			}, [tasks]);


			const canSync = data !== null && data.git !== null && data.git.configured === true && data.git.initialized === true;

			/**
			 * The list is read-only except this status circle: optimistic update,
			 * one request, roll back on failure. No drafts, no debounce.
			 */
			const toggleStatus = async (task) => {
				if (busy !== null) return;
				const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(task.status) + 1) % STATUS_CYCLE.length];
				const optimistic = { ...task, status: next, doneAt: next === 'done' ? (task.doneAt || new Date().toISOString()) : null };
				setData((current) => current === null ? current : { ...current, tasks: current.tasks.map((item) => item.id === task.id ? optimistic : item) });
				try {
					const value = await request('task/save', optimistic);
					if (!alive.current) return;
					setData((current) => current === null ? current : { ...current, tasks: current.tasks.map((item) => item.id === task.id ? value.task : item) });
					const note = value.commitNote;
					if (typeof note === 'string' && note !== 'clean' && note !== 'auto-commit-off') {
						setNotice({ tone: 'warn', text: t('notice.commitFailed') + '：' + note });
					}
				} catch (cause) {
					if (!alive.current) return;
					setData((current) => current === null ? current : { ...current, tasks: current.tasks.map((item) => item.id === task.id ? task : item) });
					setNotice({ tone: 'bad', text: describe(cause) });
				}
			};

			/** Subtask checkbox on the read-only list: optimistic toggle, one request, roll back. */
			const toggleSubtask = async (task, subtask) => {
				if (busy !== null) return;
				const optimistic = { ...task, subtasks: task.subtasks.map((item) => item.id === subtask.id ? { ...item, done: !item.done } : item) };
				setData((current) => current === null ? current : { ...current, tasks: current.tasks.map((item) => item.id === task.id ? optimistic : item) });
				try {
					const value = await request('task/subtask', { taskId: task.id, subtaskId: subtask.id, done: !subtask.done });
					if (!alive.current) return;
					setData((current) => current === null ? current : { ...current, tasks: current.tasks.map((item) => item.id === task.id ? value.task : item) });
					const note = value.commitNote;
					if (typeof note === 'string' && note !== 'clean' && note !== 'auto-commit-off') {
						setNotice({ tone: 'warn', text: t('notice.commitFailed') + '：' + note });
					}
				} catch (cause) {
					if (!alive.current) return;
					setData((current) => current === null ? current : { ...current, tasks: current.tasks.map((item) => item.id === task.id ? task : item) });
					setNotice({ tone: 'bad', text: describe(cause) });
				}
			};

			/** Quick move from the list: change a task's project without opening the modal. */
			const moveTaskTo = async (task, projectId) => {
				if (busy !== null) return;
				const optimistic = { ...task, projectId: projectId === null ? null : projectId };
				setData((current) => current === null ? current : { ...current, tasks: current.tasks.map((item) => item.id === task.id ? optimistic : item) });
				try {
					const value = await request('task/save', optimistic);
					if (!alive.current) return;
					setData((current) => current === null ? current : { ...current, tasks: current.tasks.map((item) => item.id === task.id ? value.task : item) });
					const note = value.commitNote;
					if (typeof note === 'string' && note !== 'clean' && note !== 'auto-commit-off') {
						setNotice({ tone: 'warn', text: t('notice.commitFailed') + '：' + note });
					}
				} catch (cause) {
					if (!alive.current) return;
					setData((current) => current === null ? current : { ...current, tasks: current.tasks.map((item) => item.id === task.id ? task : item) });
					setNotice({ tone: 'bad', text: describe(cause) });
				}
			};

			// Close the quick-move menu on outside click, Escape, or a popup claim from elsewhere.
			const moveMenuRef = React.useRef(null);
			React.useEffect(() => {
				if (moveFor === null) return undefined;
				claimPopup(moveMenuRef.current);
				const onClaim = (event) => {
					if (claimFromOutside(event, moveMenuRef.current)) setMoveFor(null);
				};
				const onDown = (event) => {
					const node = event.target;
					if (node instanceof Element && (node.closest('.dt-movemenu') !== null || node.closest('.dt-proj-btn') !== null)) return;
					setMoveFor(null);
				};
				const onKey = (event) => { if (event.key === 'Escape') setMoveFor(null); };
				document.addEventListener('dsh-todo:claim', onClaim);
				document.addEventListener('mousedown', onDown);
				document.addEventListener('keydown', onKey);
				return () => {
					document.removeEventListener('dsh-todo:claim', onClaim);
					document.removeEventListener('mousedown', onDown);
					document.removeEventListener('keydown', onKey);
				};
			}, [moveFor]);

			// Re-render chips and the alert banner every 30 s so relative due labels stay fresh.
			React.useEffect(() => {
				const timer = setInterval(() => setNowTick(Date.now()), 30000);
				return () => clearInterval(timer);
			}, []);

			// Unlock the AudioContext on the first user gesture (autoplay policy).
			React.useEffect(() => {
				const unlock = () => {
					try {
						const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
						if (Ctx === undefined) return;
						if (audioRef.current === null) audioRef.current = new Ctx();
						if (audioRef.current.state === 'suspended') audioRef.current.resume().catch(() => {});
					} catch {
						/* audio unavailable */
					}
				};
				document.addEventListener('pointerdown', unlock);
				return () => document.removeEventListener('pointerdown', unlock);
			}, []);

			// Follow the shell theme on native controls: select and date-picker popups are
			// painted by the browser per the inherited color-scheme.
			React.useEffect(() => {
				let timer = null;
				const update = () => {
					const next = currentColorScheme();
					setScheme((current) => (current === next ? current : next));
				};
				const schedule = () => {
					if (timer !== null) window.clearTimeout(timer);
					timer = window.setTimeout(update, 100);
				};
				update();
				const observer = new MutationObserver(schedule);
				observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true, characterData: true });
				const mq = window.matchMedia !== undefined ? window.matchMedia('(prefers-color-scheme: dark)') : null;
				if (mq !== null && typeof mq.addEventListener === 'function') mq.addEventListener('change', schedule);
				return () => {
					if (timer !== null) window.clearTimeout(timer);
					observer.disconnect();
					if (mq !== null && typeof mq.removeEventListener === 'function') mq.removeEventListener('change', schedule);
				};
			}, []);

			/** Structural mutation used by modals and git buttons: resolves {ok, error}. */
			const mutate = async (action, payload, successText) => {
				setBusy(action);
				setNotice(null);
				try {
					await request(action, payload);
					if (!alive.current) return { ok: true };
					await load();
					if (!alive.current) return { ok: true };
					if (typeof successText === 'string' && successText !== '') setNotice({ tone: 'ok', text: successText });
					return { ok: true };
				} catch (cause) {
					if (alive.current) setNotice({ tone: 'bad', text: describe(cause) });
					return { ok: false, error: describe(cause) };
				} finally {
					if (alive.current) setBusy(null);
				}
			};

			const saveTask = async (payload) => {
				const result = await mutate('task/save', payload, t('notice.saved'));
				if (result.ok && alive.current) setModal(null);
				return result;
			};

			const deleteTask = async (id) => {
				const result = await mutate('task/delete', { id: id }, t('notice.deleted'));
				if (result.ok && alive.current) setModal(null);
				return result;
			};

			const saveProject = async (payload) => {
				const result = await mutate('project/save', payload, t('notice.saved'));
				if (result.ok && alive.current) setModal(null);
				return result;
			};

			const deleteProject = async (id) => {
				setPendingProject(null);
				const result = await mutate('project/delete', { id: id }, t('notice.projectDeleted'));
				if (result.ok && alive.current) {
					setModal(null);
					if (filter.kind === 'project' && filter.id === id) setFilter({ kind: 'all', id: null });
				}
				return result;
			};

			const push = async () => {
				setBusy('git/push');
				setNotice(null);
				try {
					const value = await request('git/push', {});
					if (!alive.current) return;
					await load();
					if (!alive.current) return;
					setNotice({
						tone: value.ok ? 'ok' : 'bad',
						text: (value.ok ? t('notice.pushed') : t('notice.pushFailed')) + (value.output === '' ? '' : '：' + value.output),
						hint: value.hint
					});
				} catch (cause) {
					if (alive.current) setNotice({ tone: 'bad', text: describe(cause) });
				} finally {
					if (alive.current) setBusy(null);
				}
			};

			const pull = async () => {
				setBusy('git/pull');
				setNotice(null);
				try {
					const value = await request('git/pull', {});
					if (!alive.current) return;
					await load();
					if (!alive.current) return;
					setNotice({
						tone: value.ok ? 'ok' : 'bad',
						text: (value.ok ? t('notice.pulled') : t('notice.pullFailed')) + (value.output === '' ? '' : '：' + value.output),
						hint: value.hint
					});
				} catch (cause) {
					if (alive.current) setNotice({ tone: 'bad', text: describe(cause) });
				} finally {
					if (alive.current) setBusy(null);
				}
			};

			const saveSettings = async () => {
				if (form === null) return;
				setBusy('config/save');
				setNotice(null);
				try {
					const value = await request('config/save', form);
					if (!alive.current) return;
					await load();
					if (!alive.current) return;
					setForm({
						repoDir: value.config.repoDir,
						remote: value.config.remote,
						branch: value.config.branch,
						autoCommit: value.config.autoCommit
					});
					const warnings = Array.isArray(value.warnings) ? value.warnings : [];
					if (value.created === true) {
						setNotice({ tone: 'warn', text: t('notice.repoCreated') + (warnings.length > 0 ? '：' + warnings.join('\n') : '') });
					} else if (warnings.length > 0) {
						setNotice({ tone: 'bad', text: warnings.join('\n') });
					} else {
						setNotice({ tone: 'ok', text: t('notice.saved') });
					}
				} catch (cause) {
					if (alive.current) setNotice({ tone: 'bad', text: describe(cause) });
				} finally {
					if (alive.current) setBusy(null);
				}
			};

			const gitChips = () => {
				const git = data === null ? null : data.git;
				if (git === null) return [];
				if (!git.configured) return [chip('none', t('git.unconfigured'), 'muted')];
				const chips = [];
				if (git.error !== null) chips.push(chip('error', git.error, 'error'));
				if (!git.initialized) {
					chips.push(chip('init', t('git.notRepo'), 'warn'));
				} else {
					chips.push(chip('branch', t('git.branch', { name: git.branch }), 'brand'));
					if (git.dirty > 0) chips.push(chip('dirty', t('git.dirty', { count: git.dirty }), 'warn'));
					else chips.push(chip('clean', t('git.clean'), 'muted'));
					if (git.ahead > 0) chips.push(chip('ahead', t('git.ahead', { count: git.ahead }), 'brand'));
					if (git.behind > 0) chips.push(chip('behind', t('git.behind', { count: git.behind }), 'warn'));
				}
				if (git.last !== null) chips.push(chip('last', t('git.last', { hash: git.last.hash, subject: git.last.subject }), 'muted'));
				return chips;
			};

			const btn = (key, label, onClick, options) => h('button', {
				key: key,
				type: 'button',
				className: 'dt-btn',
				'data-primary': options !== null && options !== undefined && options.primary ? 'true' : 'false',
				disabled: options !== null && options !== undefined ? options.disabled : void 0,
				onClick: () => { void onClick(); }
			}, label);

			const renderNotice = () => h('div', { key: 'notice', className: 'dt-banner', 'data-tone': notice.tone }, [
				notice.text.indexOf('\n') >= 0 ? h('pre', { key: 'text', className: 'dt-log' }, notice.text) : h('div', { key: 'text' }, notice.text),
				notice.hint !== null && notice.hint !== undefined && notice.hint !== '' ? h('div', { key: 'hint', className: 'dt-hint' }, notice.hint) : null
			]);

			const renderForm = (key, withHeading) => {
				const blocks = [];
				if (withHeading) {
					blocks.push(h('div', { key: 'heading', className: 'dt-title' }, t('setup.title')));
					blocks.push(h('div', { key: 'body', className: 'dt-hint' }, t('setup.body')));
				}
				blocks.push(field('repoDir', t('setup.repoDir'), h('input', {
					key: 'repoDir',
					className: 'dt-text',
					value: form.repoDir,
					spellCheck: false,
					placeholder: 'E:\\notes\\todo-repo',
					onChange: (event) => setForm({ ...form, repoDir: event.target.value })
				})));
				blocks.push(field('remote', t('setup.remote'), h('input', {
					key: 'remote',
					className: 'dt-text',
					value: form.remote,
					spellCheck: false,
					placeholder: 'https://github.com/<user>/<repo>.git',
					onChange: (event) => setForm({ ...form, remote: event.target.value })
				})));
				blocks.push(field('branch', t('setup.branch'), h('input', {
					key: 'branch',
					className: 'dt-text',
					value: form.branch,
					spellCheck: false,
					onChange: (event) => setForm({ ...form, branch: event.target.value })
				})));
				blocks.push(h('label', { key: 'auto', className: 'dt-check-label' }, [
					h('input', {
						key: 'cb',
						type: 'checkbox',
						checked: form.autoCommit,
						onChange: (event) => setForm({ ...form, autoCommit: event.target.checked })
					}),
					h('span', { key: 'label' }, t('setup.autoCommit'))
				]));
				blocks.push(h('div', { key: 'actions', className: 'dt-actions' }, [
					btn('save', t('setup.save'), saveSettings, { primary: true, disabled: busy !== null })
				]));
				blocks.push(h('div', { key: 'path', className: 'dt-hint' }, t('setup.hint', { path: data === null ? '' : data.configPath })));
				return h('div', { key: key, className: 'dt-setup' }, blocks);
			};

			const renderSidebar = () => {
				const renderProjectRow = (project, depth) => {
					const indent = { paddingLeft: 10 + depth * 14 };
					if (pendingProject === project.id) {
						return [h('div', { key: project.id, className: 'dt-side-item', style: indent }, [
							h('span', { key: 'q', className: 'dt-side-name' }, t('confirm.projectDelete')),
							h('button', { key: 'yes', type: 'button', className: 'dt-btn', 'data-danger': 'true', disabled: busy !== null, onClick: () => { void deleteProject(project.id); } }, '✓'),
							h('button', { key: 'no', type: 'button', className: 'dt-btn', onClick: () => setPendingProject(null) }, '×')
						])];
					}
					return [h('div', {
						key: project.id,
						className: 'dt-side-item',
						style: indent,
						'data-active': filter.kind === 'project' && filter.id === project.id ? 'true' : 'false',
						onClick: () => setFilter({ kind: 'project', id: project.id })
					}, [
						h('i', { key: 'dot', className: 'dt-dot', style: project.color === '' || project.color === undefined ? undefined : { background: project.color } }),
						h('span', { key: 'name', className: 'dt-side-name' }, project.name),
						h('span', { key: 'count', className: 'dt-side-count' }, String(counts.map.get(project.id) ?? 0)),
						// Sub-projects cannot nest further (two-level cap).
						depth === 0 ? h('button', {
							key: 'sub',
							type: 'button',
							className: 'dt-ghost',
							'aria-label': t('action.newSubProject'),
							onClick: (event) => { event.stopPropagation(); setModal({ kind: 'project', project: null, parentId: project.id }); }
						}, '＋') : null,
						h('button', {
							key: 'edit',
							type: 'button',
							className: 'dt-ghost',
							'aria-label': t('modal.project.edit'),
							onClick: (event) => { event.stopPropagation(); setModal({ kind: 'project', project: project }); }
						}, '✎'),
						h('button', {
							key: 'del',
							type: 'button',
							className: 'dt-ghost',
							'aria-label': t('modal.delete'),
							onClick: (event) => { event.stopPropagation(); setPendingProject(project.id); }
						}, '×')
					])];
				};
				// Tree layout: top-level projects first, each followed by its
				// sub-projects (recursively, indented).
				const projectRows = [];
				const appendTree = (parentId, depth) => {
					for (const project of projects) {
						if ((project.parentId ?? null) !== parentId) continue;
						projectRows.push(...renderProjectRow(project, depth));
						appendTree(project.id, depth + 1);
					}
				};
				appendTree(null, 0);
				return h('aside', { className: 'dt-side' }, [
					h('div', { key: 'scope-head', className: 'dt-side-head' }, [
						h('span', { key: 'label' }, t('filter.projects')),
						h('button', { key: 'new', type: 'button', className: 'dt-add', disabled: busy !== null, onClick: () => setModal({ kind: 'project', project: null }) }, t('action.newProject'))
					]),
					...projectRows,
					h('div', { key: 'scope-head2', className: 'dt-side-head' }, [h('span', { key: 'label' }, t('filter.all'))]),
					h('div', { key: 'all', className: 'dt-side-item', 'data-active': filter.kind === 'all' ? 'true' : 'false', onClick: () => setFilter({ kind: 'all', id: null }) }, [
						h('span', { key: 'name', className: 'dt-side-name' }, t('filter.all')),
						h('span', { key: 'count', className: 'dt-side-count' }, String(counts.all))
					]),
					h('div', { key: 'unfiled', className: 'dt-side-item', 'data-active': filter.kind === 'unfiled' ? 'true' : 'false', onClick: () => setFilter({ kind: 'unfiled', id: null }) }, [
						h('span', { key: 'name', className: 'dt-side-name' }, t('filter.unfiled')),
						h('span', { key: 'count', className: 'dt-side-count' }, String(counts.unfiled))
					]),
					h('label', { key: 'showdone', className: 'dt-check-label', style: { padding: '8px 10px' } }, [
						h('input', { key: 'cb', type: 'checkbox', checked: showDone, onChange: (event) => setShowDone(event.target.checked) }),
						h('span', { key: 'label' }, t('filter.showDone'))
					])
				]);
			};

			const renderRow = (task) => {
				const project = task.projectId === null ? null : projects.find((item) => item.id === task.projectId);
				const doneCount = task.subtasks.filter((item) => item.done).length;
				const total = task.subtasks.length;
				const openModal = () => setModal({ kind: 'task', task: task, defaultProjectId: task.projectId });
				const subtaskItems = total > 0
					? h('ul', { key: 'subs', className: 'dt-subs' }, task.subtasks.map((subtask) => h('li', { key: subtask.id, className: 'dt-subli' }, [
						h('button', {
							key: 'check',
							type: 'button',
							className: 'dt-subcheck',
							role: 'checkbox',
							'aria-checked': subtask.done ? 'true' : 'false',
							'aria-label': subtask.title !== '' ? subtask.title : t('subtask.placeholder'),
							'data-done': subtask.done ? 'true' : 'false',
							disabled: busy !== null,
							onClick: () => { void toggleSubtask(task, subtask); }
						}, subtask.done ? '✓' : ''),
						h('span', {
							key: 'title',
							className: 'dt-subli-title',
							'data-done': subtask.done ? 'true' : 'false'
						}, subtask.title === '' ? t('subtask.placeholder') : subtask.title),
						subtask.due === null || subtask.due === undefined ? null : h('span', { key: 'due', className: 'dt-chip', 'data-tone': dueTone(subtask.due, nowTick, subtask.done) }, dueLabel(subtask.due, nowTick, t))
					])))
					: null;
				return h('div', {
					key: task.id,
					className: 'dt-card',
					'data-done': task.status === 'done' ? 'true' : 'false',
					'data-priority': task.priority === null ? '0' : String(task.priority)
				}, [
					h('div', {
						key: 'row',
						className: 'dt-row',
						role: 'button',
						tabIndex: 0,
						onClick: openModal,
						onKeyDown: (event) => {
							if (event.key === 'Enter') openModal();
						}
					}, [
						h('button', {
							key: 'status',
							type: 'button',
							className: 'dt-status',
							role: 'checkbox',
							'aria-checked': task.status === 'done' ? 'true' : 'false',
							'aria-label': task.title !== '' ? task.title : t('field.title'),
							'title': t('status.' + task.status),
							'data-status': task.status,
							disabled: busy !== null,
							onClick: (event) => { event.stopPropagation(); void toggleStatus(task); }
						}, task.status === 'done' ? '✓' : ''),
						h('span', { key: 'title', className: 'dt-row-title' }, task.title === '' ? t('field.titlePlaceholder') : task.title),
						project === null ? null : h('button', {
							key: 'proj',
							type: 'button',
							className: 'dt-proj dt-proj-btn',
							title: t('action.moveTo'),
							'aria-label': t('action.moveTo'),
							onClick: (event) => { event.stopPropagation(); setMoveFor(moveFor === task.id ? null : task.id); }
						}, [
							h('i', { key: 'dot', className: 'dt-dot', style: project.color === '' || project.color === undefined ? undefined : { background: project.color } }),
							h('span', { key: 'name', className: 'dt-proj-name' }, project.name)
						]),
						task.priority === null ? null : chip('p', t('priority.' + task.priority), PRIORITY_TONES[task.priority] || 'muted'),
						task.due === null ? null : chip('due', dueLabel(task.due, nowTick, t), dueTone(task.due, nowTick, task.status === 'done')),
						total > 0 ? chip('subs', doneCount === total ? t('subtask.allDone') : t('subtask.progress', { done: doneCount, total: total }), doneCount === total ? 'success' : 'brand') : null,
						moveFor === task.id ? h('div', { key: 'movemenu', className: 'dt-movemenu', ref: moveMenuRef, onClick: (event) => event.stopPropagation() }, [
							h('button', {
								key: 'none',
								type: 'button',
								className: 'dt-movemenu-item',
								'data-active': task.projectId === null ? 'true' : 'false',
								disabled: busy !== null,
								onClick: () => { setMoveFor(null); void moveTaskTo(task, null); }
							}, t('noProject')),
							...orderedProjects.map((item) => h('button', {
								key: item.id,
								type: 'button',
								className: 'dt-movemenu-item',
								'data-active': item.id === task.projectId ? 'true' : 'false',
								style: item.parentId ? { paddingLeft: 26 } : undefined,
								disabled: busy !== null,
								onClick: () => { setMoveFor(null); void moveTaskTo(task, item.id); }
							}, item.name))
						]) : null
					]),
					subtaskItems
				]);
			};

			const renderList = () => {
				if (visible.length === 0) {
					const scopeProject = filter.kind === 'project' ? projects.find((p) => p.id === filter.id) : undefined;
					const parent = scopeProject !== undefined && (scopeProject.parentId ?? null) !== null ? projects.find((p) => p.id === scopeProject.parentId) : undefined;
					return h('div', { key: 'empty', className: 'dt-empty' }, [
						EmptyIcon(),
						h('div', { key: 'text' }, t('empty.tasks')),
						parent !== undefined ? h('div', { key: 'hint', className: 'dt-hint' }, t('empty.subHint', { parent: parent.name })) : null,
						h('button', { key: 'new', type: 'button', className: 'dt-add', onClick: () => setModal({ kind: 'task', task: null, defaultProjectId: filter.kind === 'project' ? filter.id : null }) }, t('empty.button'))
					]);
				}
				const blocks = groups.filter((group) => group.items.length > 0).map((group) => h('section', { key: group.id, className: 'dt-group' }, [
					h('div', { key: 'head', className: 'dt-group-head' }, [
						h('span', { key: 'label' }, t('group.' + group.id)),
						h('span', { key: 'count', className: 'dt-count' }, String(group.items.length))
					]),
					...group.items.map(renderRow)
				]));
				return h(React.Fragment, null, blocks);
			};

			const renderSettings = () => h('section', { className: 'dt-main', key: 'main' }, [
				form === null ? null : renderForm('form', false),
				data === null ? null : h('div', { key: 'git', className: 'dt-setup' }, [
					h('div', { key: 'title', className: 'dt-title' }, t('git.title')),
					h('div', { key: 'chips', className: 'dt-sub' }, gitChips()),
					data.git.changes === null || data.git.changes.length === 0
						? null
						: h('pre', { key: 'changes', className: 'dt-log' }, data.git.changes.map((change) => change.state + ' ' + change.path).join('\n')),
					h('div', { key: 'actions', className: 'dt-actions' }, [
						btn('pull', t('action.pull'), pull, { disabled: busy !== null }),
						btn('push', t('action.push'), push, { disabled: busy !== null })
					])
				]),
				env === null ? null : h('div', { key: 'env', className: 'dt-setup' }, [
					h('div', { key: 'title', className: 'dt-title' }, t('env.title')),
					h('pre', { key: 'log', className: 'dt-log' }, 'node ' + env.node + '\n' + env.platform + '\ngit driver: ' + (env.gitDriver === null ? t('env.gitMissing') : env.gitDriver) + '\n' + env.configPath)
				])
			]);

			let body;
			if (status === 'error') {
				body = h('div', { key: 'error', className: 'dt-banner', 'data-tone': 'bad' }, [
					h('div', { key: 'title' }, t('error.title')),
					h('pre', { key: 'message', className: 'dt-log' }, error),
					h('div', { key: 'actions', className: 'dt-actions' }, [btn('retry', t('error.retry'), load, { primary: true })])
				]);
			} else if (view === 'settings') {
				body = renderSettings();
			} else if (status === 'setup' || form === null) {
				body = h('section', { className: 'dt-main', key: 'main' }, [form === null ? null : renderForm('setup', true)]);
			} else if (view === 'calendar') {
				body = h('div', { className: 'dt-body', key: 'body' }, [
					renderSidebar(),
					h('section', { className: 'dt-main', key: 'main' }, h(CalendarView, {
						key: 'cal',
						tasks: tasks,
						projects: projects,
						now: nowTick,
						t: t,
						onOpenTask: (task) => setModal({ kind: 'task', task: task, defaultProjectId: task.projectId }),
						onNewTask: (dateKey) => setModal({ kind: 'task', task: null, defaultProjectId: filter.kind === 'project' ? filter.id : null, defaultDue: dateKey + 'T23:00' })
					}))
				]);
			} else {
				const renderReminders = reminders.length === 0 ? null : h('div', { key: 'remind', className: 'dt-remind', role: 'alert' }, [
					h('div', { key: 'title' }, '⏰ ' + t('remind.title')),
					...reminders.map((item) => h('button', {
						key: item.task.id,
						type: 'button',
						className: 'dt-remind-item',
						onClick: () => setModal({ kind: 'task', task: item.task, defaultProjectId: item.task.projectId })
					}, [
						h('span', { key: 'name', className: 'dt-remind-name' }, item.task.title),
						h('span', { key: 'due', className: 'dt-remind-due' }, dueLabel(item.task.due, nowTick, t))
					]))
				]);
				body = h('div', { className: 'dt-body', key: 'body' }, [renderSidebar(), h('section', { className: 'dt-main', key: 'main' }, [renderReminders, renderList()])]);
			}

			return h('div', { className: 'dt-root', role: 'region', 'aria-label': t('panel.title'), 'data-locale': String(localeRevision), style: scheme === '' ? undefined : { colorScheme: scheme } }, [
				h('header', { className: 'dt-head', key: 'head' }, [
					h('div', { key: 'main', className: 'dt-head-main' }, [
						h('h1', { key: 'title', className: 'dt-title' }, t('panel.title')),
						data === null ? null : h('div', { key: 'chips', className: 'dt-sub' }, gitChips())
					]),
					h('div', { key: 'actions', className: 'dt-actions' }, [
						btn('new', t('action.new'), () => setModal({ kind: 'task', task: null, defaultProjectId: filter.kind === 'project' ? filter.id : null }), { primary: true, disabled: status === 'setup' }),
						btn('refresh', t('action.refresh'), load, { disabled: busy !== null }),
						btn('pull', t('action.pull'), pull, { disabled: busy !== null || !canSync }),
						btn('push', t('action.push'), push, { disabled: busy !== null || !canSync }),
						h('button', { key: 'viewList', type: 'button', className: 'dt-ghost' + (view === 'calendar' ? '' : ' dt-ghost-on'), onClick: () => { setMainView('list'); setView('list'); } }, t('view.list')),
						h('button', { key: 'viewCal', type: 'button', className: 'dt-ghost' + (view === 'calendar' ? ' dt-ghost-on' : ''), onClick: () => { setMainView('calendar'); setView('calendar'); } }, t('view.calendar')),
						btn('settings', view === 'settings' ? t('action.back') : t('action.settings'), () => setView(view === 'settings' ? mainView : 'settings'), {})
					])
				]),
				notice !== null ? renderNotice() : null,
				data !== null && data.problems !== null && data.problems.length > 0 ? h('div', { key: 'problems', className: 'dt-banner', 'data-tone': 'warn' }, [
					h('div', { key: 'title' }, t('problems.title')),
					h('pre', { key: 'log', className: 'dt-log' }, data.problems.join('\n'))
				]) : null,
				body,
				modal !== null ? (modal.kind === 'project'
					? h(ProjectModal, {
						key: 'modal',
						t: t,
						project: modal.project,
						parentId: modal.parentId ?? null,
						projects: projects,
						onClose: () => setModal(null),
						onSave: saveProject,
						onDelete: deleteProject
					})
					: h(TaskModal, {
						key: 'modal',
						t: t,
						task: modal.task,
						projects: projects,
						defaultProjectId: modal.defaultProjectId,
						defaultDue: modal.defaultDue,
						onClose: () => setModal(null),
						onSave: saveTask,
						onDelete: deleteTask
					})) : null
			]);
		}

		const inject = ['slots', 'locale'];

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-todo: dictionaries');
			const t = ctx.locale.bind(NS);
			const injected = () => ({
				request: (action, payload, signal) => directCall(action, payload, signal),
				readLocaleRevision: () => ctx.locale.getSnapshot().revision,
				onLocaleChange: (listener) => ctx.locale.subscribe(listener)
			});
			// First-class sidebar entry (like the shipped Plugins / Schedules panels):
			// the panellist id addresses the matching main panel by the same id.
			ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
				name: 'sidebar.panellist',
				id: 'todo',
				order: 40,
				label: () => t('panel.title'),
				locale: NS,
				inject: injected
			}, TodoIcon));
			ctx.slots.inject('main', () => ctx.slots.register({
				name: 'main',
				key: 'todo',
				locale: NS,
				inject: injected
			}, TodoPanel));
		}

		return { inject, apply };
	}
});
