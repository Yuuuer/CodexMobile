import {
  AlertTriangle,
  Bug,
  Check,
  ChevronLeft,
  Hammer,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Sparkles,
  Terminal,
  Trash2,
  Wrench,
  X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api.js';
import { actionsRequestConfig } from '../actions-panel-actions.js';
import {
  actionCommandPreview,
  actionIconOptions,
  actionPlatformHint,
  actionPlatformLabel,
  actionResultSummary,
  actionRunBlockedReason,
  ACTION_PLATFORM_OPTIONS,
  createActionDraft,
  normalizeActionResult,
  normalizeActionsResponse,
  validateActionDraft
} from '../actions-panel-state.js';

const ACTION_ICONS = {
  run: Play,
  terminal: Terminal,
  hammer: Hammer,
  wrench: Wrench,
  rocket: Rocket,
  bug: Bug,
  sparkles: Sparkles
};

function actionErrorMessage(error, fallback) {
  if (!error) {
    return fallback;
  }
  if (error.status === 404 && !error.message?.trim()) {
    return '当前后端尚未提供 Actions 接口';
  }
  if (error.status === 404 && /request failed/i.test(error.message || '')) {
    return '当前后端尚未提供 Actions 接口';
  }
  if (error.status === 409 || error.code === 'conflict') {
    return error.message || '环境配置已被其他端改动，请刷新后重试';
  }
  return error.message || fallback;
}

function actionMutationLabel(intent) {
  const labels = {
    create: '新增 Action',
    update: '更新 Action',
    delete: '删除 Action',
    run: '执行 Action'
  };
  return labels[intent] || 'Action';
}

function actionMutationToast(intent, actionName) {
  const labels = {
    create: `已新增 ${actionName}`,
    update: `已更新 ${actionName}`,
    delete: `已删除 ${actionName}`,
    run: `${actionName} 已执行`
  };
  return labels[intent] || `${actionName} 已更新`;
}

function actionIcon(name) {
  return ACTION_ICONS[name] || Terminal;
}

export function ActionsPanel({ open, project, onClose, onToast }) {
  const projectId = project?.id || '';
  const [busy, setBusy] = useState(false);
  const [busyIntent, setBusyIntent] = useState('');
  const [busyActionKey, setBusyActionKey] = useState('');
  const [error, setError] = useState('');
  const [state, setState] = useState(() => normalizeActionsResponse({
    exists: false,
    path: '.codex/environments/environment.toml',
    environment: { name: 'Actions', actions: [] }
  }));
  const [editorMode, setEditorMode] = useState('');
  const [editingActionKey, setEditingActionKey] = useState('');
  const [draft, setDraft] = useState(() => createActionDraft());
  const [pendingRunKey, setPendingRunKey] = useState('');
  const [pendingDeleteKey, setPendingDeleteKey] = useState('');
  const [result, setResult] = useState(null);

  const environment = state.environment;
  const actions = environment.actions;
  const runningAction = useMemo(
    () => actions.find((action) => action.actionKey === pendingRunKey) || null,
    [actions, pendingRunKey]
  );
  const deletingAction = useMemo(
    () => actions.find((action) => action.actionKey === pendingDeleteKey) || null,
    [actions, pendingDeleteKey]
  );
  const editorTitle = editorMode === 'edit' ? '编辑 Action' : '新增 Action';

  const loadActions = useCallback(async ({ silent = false } = {}) => {
    if (!open || !projectId) {
      return null;
    }
    const request = actionsRequestConfig('load', { projectId });
    if (!request) {
      return null;
    }
    if (!silent) {
      setBusy(true);
      setBusyIntent('load');
      setBusyActionKey('');
    }
    setError('');
    try {
      const data = await apiFetch(request.path);
      const nextState = normalizeActionsResponse(data);
      setState(nextState);
      return nextState;
    } catch (loadError) {
      const message = actionErrorMessage(loadError, '读取 Actions 失败');
      setError(message);
      throw loadError;
    } finally {
      if (!silent) {
        setBusy(false);
        setBusyIntent('');
      }
    }
  }, [open, projectId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError('');
    setEditorMode('');
    setEditingActionKey('');
    setDraft(createActionDraft());
    setPendingRunKey('');
    setPendingDeleteKey('');
    setResult(null);
    loadActions().catch(() => null);
  }, [open, projectId, loadActions]);

  function resetTransientState() {
    setEditorMode('');
    setEditingActionKey('');
    setDraft(createActionDraft());
    setPendingRunKey('');
    setPendingDeleteKey('');
  }

  function startCreate() {
    setError('');
    setEditorMode('create');
    setEditingActionKey('');
    setDraft(createActionDraft());
    setPendingRunKey('');
    setPendingDeleteKey('');
  }

  function startEdit(action) {
    setError('');
    setEditorMode('edit');
    setEditingActionKey(action.actionKey);
    setDraft(createActionDraft(action));
    setPendingRunKey('');
    setPendingDeleteKey('');
  }

  function startRun(action) {
    setError('');
    setPendingRunKey(action.actionKey);
    setPendingDeleteKey('');
    setEditorMode('');
  }

  function startDelete(action) {
    setError('');
    setPendingDeleteKey(action.actionKey);
    setPendingRunKey('');
    setEditorMode('');
  }

  async function runMutation(intent, { actionKey = '', actionName = '', action: actionDraft = null } = {}) {
    const request = actionsRequestConfig(intent, {
      projectId,
      revision: state.revision,
      actionKey,
      action: actionDraft
    });
    if (!request) {
      return null;
    }
    setBusy(true);
    setBusyIntent(intent);
    setBusyActionKey(actionKey);
    setError('');
    try {
      const data = await apiFetch(request.path, request.options);
      if (intent === 'run') {
        const nextResult = normalizeActionResult(data);
        setResult({
          ...nextResult,
          actionKey,
          actionName: nextResult.actionName || actionName
        });
      }
      onToast?.({
        level: 'success',
        title: actionMutationLabel(intent),
        body: actionMutationToast(intent, actionName || 'Action')
      });
      resetTransientState();
      await loadActions({ silent: true }).catch((refreshError) => {
        setError(actionErrorMessage(refreshError, '刷新 Actions 失败'));
      });
      return data;
    } catch (mutationError) {
      const message = actionErrorMessage(mutationError, `${actionMutationLabel(intent)}失败`);
      setError(message);
      onToast?.({
        level: 'error',
        title: actionMutationLabel(intent),
        body: message
      });
      throw mutationError;
    } finally {
      setBusy(false);
      setBusyIntent('');
      setBusyActionKey('');
    }
  }

  async function handleSubmitAction() {
    const validation = validateActionDraft(draft);
    if (validation) {
      setError(validation);
      return;
    }
    const intent = editorMode === 'edit' ? 'update' : 'create';
    const actionName = draft.name.trim() || 'Action';
    await runMutation(intent, {
      actionKey: editingActionKey,
      actionName,
      action: draft
    }).catch(() => null);
  }

  async function handleConfirmRun() {
    if (!runningAction) {
      return;
    }
    const blockReason = actionRunBlockedReason(runningAction);
    if (blockReason) {
      setError(blockReason);
      return;
    }
    await runMutation('run', {
      actionKey: runningAction.actionKey,
      actionName: runningAction.name
    }).catch(() => null);
  }

  async function handleConfirmDelete() {
    if (!deletingAction) {
      return;
    }
    await runMutation('delete', {
      actionKey: deletingAction.actionKey,
      actionName: deletingAction.name
    }).catch(() => null);
  }

  if (!open) {
    return null;
  }

  return (
    <section className="docs-panel git-panel actions-panel" role="dialog" aria-modal="true" aria-label="Actions">
      <header className="docs-panel-header">
        <button className="icon-button" type="button" onClick={onClose} aria-label="关闭 Actions">
          <ChevronLeft size={22} />
        </button>
        <div className="docs-panel-title">
          <strong>Actions</strong>
          <span>{environment.name || project?.name || '当前项目'}</span>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="关闭 Actions">
          <X size={20} />
        </button>
      </header>

      <div className="docs-panel-body git-panel-body actions-panel-body">
        <ActionsSummary
          environment={environment}
          state={state}
          project={project}
          busy={busy}
          onRefresh={() => loadActions().catch(() => null)}
        />

        <div className="git-action-grid actions-panel-actions">
          <button type="button" onClick={startCreate} disabled={busy || !projectId}>
            <Plus size={15} />
            新增 Action
          </button>
          <button type="button" onClick={() => loadActions().catch(() => null)} disabled={busy || !projectId}>
            {busyIntent === 'load' ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />}
            刷新
          </button>
        </div>

        <ActionsList
          actions={actions}
          busy={busy}
          busyIntent={busyIntent}
          busyActionKey={busyActionKey}
          onRun={startRun}
          onEdit={startEdit}
          onDelete={startDelete}
          exists={state.exists}
        />

        {editorMode ? (
          <ActionEditor
            title={editorTitle}
            draft={draft}
            setDraft={setDraft}
            busy={busy}
            busyIntent={busyIntent}
            iconOptions={actionIconOptions(draft.icon)}
            onCancel={resetTransientState}
            onSubmit={handleSubmitAction}
          />
        ) : null}

        {runningAction ? (
          <ActionRunConfirm
            action={runningAction}
            project={project}
            busy={busy}
            busyIntent={busyIntent}
            onCancel={resetTransientState}
            onConfirm={handleConfirmRun}
          />
        ) : null}

        {deletingAction ? (
          <ActionDeleteConfirm
            action={deletingAction}
            busy={busy}
            busyIntent={busyIntent}
            onCancel={resetTransientState}
            onConfirm={handleConfirmDelete}
          />
        ) : null}

        {error ? <div className="docs-panel-error">{error}</div> : null}
        <ActionResultCard result={result} />
      </div>
    </section>
  );
}

function ActionsSummary({ environment, state, project, busy, onRefresh }) {
  return (
    <section className="git-status-card actions-summary-card">
      <div className="git-status-head">
        <div>
          <strong>{state.exists ? '环境动作已加载' : '环境文件尚未创建'}</strong>
          <span>{state.path}</span>
        </div>
        <button type="button" className="icon-button" onClick={onRefresh} disabled={busy} aria-label="刷新 Actions">
          <RefreshCw size={18} />
        </button>
      </div>
      <div className="git-status-metrics">
        <span>{environment.actions.length} 个 Action</span>
        <span>{environment.setupScriptPresent ? '含 setup' : '无 setup'}</span>
        <span>{project?.path || project?.name || '未选择项目'}</span>
      </div>
      {!state.exists ? <p className="git-help-text">首次新增 Action 后，后端应创建 `.codex/environments/environment.toml`。</p> : null}
      {environment.setupScriptPresent ? <pre className="git-output actions-setup-preview">{environment.setupScript}</pre> : null}
    </section>
  );
}

function ActionsList({ actions, busy, busyIntent, busyActionKey, onRun, onEdit, onDelete, exists }) {
  if (!actions.length) {
    return (
      <section className="git-action-card">
        <div className="git-section-head">
          <strong>Action 列表</strong>
          <span>{exists ? '当前环境暂无 Action' : '等待首次创建'}</span>
        </div>
        <p className="git-help-text">{exists ? '当前项目还没有可执行的 Action。' : '环境文件不存在时，列表会保持为空，直到首次保存。'}</p>
      </section>
    );
  }

  return (
    <section className="git-action-card">
      <div className="git-section-head">
        <strong>Action 列表</strong>
        <span>{actions.length} 条</span>
      </div>
      <div className="actions-list">
        {actions.map((action) => (
          <ActionRow
            key={action.actionKey}
            action={action}
            busy={busy}
            busyIntent={busyIntent}
            busyActionKey={busyActionKey}
            onRun={onRun}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

function ActionRow({ action, busy, busyIntent, busyActionKey, onRun, onEdit, onDelete }) {
  const Icon = actionIcon(action.icon);
  const runBlockedReason = actionRunBlockedReason(action);
  const running = busy && busyIntent === 'run' && busyActionKey === action.actionKey;
  const deleting = busy && busyIntent === 'delete' && busyActionKey === action.actionKey;
  const updating = busy && busyIntent === 'update' && busyActionKey === action.actionKey;

  return (
    <article className={`actions-row${runBlockedReason ? ' is-disabled' : ''}`}>
      <div className="actions-row-head">
        <div className="actions-row-icon">
          <Icon size={16} />
        </div>
        <div className="actions-row-title">
          <strong>{action.name}</strong>
          <span>{actionPlatformHint(action)}</span>
        </div>
        <div className="actions-row-tags">
          <span>{action.icon}</span>
          <span>{actionPlatformLabel(action.platform)}</span>
        </div>
      </div>
      <pre className="git-output actions-command-preview">{action.command}</pre>
      <p className="git-diff-note">{actionCommandPreview(action.command)}</p>
      {runBlockedReason ? <div className="actions-inline-warning"><AlertTriangle size={14} /> {runBlockedReason}</div> : null}
      <div className="git-action-grid">
        <button type="button" onClick={() => onRun(action)} disabled={busy || Boolean(runBlockedReason)}>
          {running ? <Loader2 className="spin" size={15} /> : <Play size={15} />}
          运行
        </button>
        <button type="button" onClick={() => onEdit(action)} disabled={busy}>
          {updating ? <Loader2 className="spin" size={15} /> : <Wrench size={15} />}
          编辑
        </button>
        <button type="button" className="is-danger" onClick={() => onDelete(action)} disabled={busy}>
          {deleting ? <Loader2 className="spin" size={15} /> : <Trash2 size={15} />}
          删除
        </button>
      </div>
    </article>
  );
}

function ActionEditor({ title, draft, setDraft, busy, busyIntent, iconOptions, onCancel, onSubmit }) {
  const saving = busy && (busyIntent === 'create' || busyIntent === 'update');

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="git-action-card">
      <div className="git-section-head">
        <strong>{title}</strong>
        <span>会写回到 `[[actions]]`</span>
      </div>
      <label className="git-field">
        <span>名称</span>
        <input value={draft.name} onChange={(event) => updateField('name', event.target.value)} placeholder="例如：构建" />
      </label>
      <div className="actions-form-grid">
        <label className="git-field">
          <span>图标</span>
          <select value={draft.icon} onChange={(event) => updateField('icon', event.target.value)}>
            {iconOptions.map((icon) => (
              <option key={icon} value={icon}>{icon}</option>
            ))}
          </select>
        </label>
        <label className="git-field">
          <span>平台</span>
          <select value={draft.platform} onChange={(event) => updateField('platform', event.target.value)}>
            {ACTION_PLATFORM_OPTIONS.map((platform) => (
              <option key={platform} value={platform}>{actionPlatformLabel(platform)}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="git-field">
        <span>命令</span>
        <textarea
          value={draft.command}
          onChange={(event) => updateField('command', event.target.value)}
          placeholder="输入要执行的命令"
          rows={6}
        />
      </label>
      <div className="git-action-grid">
        <button type="button" onClick={onSubmit} disabled={busy}>
          {saving ? <Loader2 className="spin" size={15} /> : <Check size={15} />}
          保存
        </button>
        <button type="button" className="is-secondary" onClick={onCancel} disabled={busy}>
          取消
        </button>
      </div>
    </section>
  );
}

function ActionRunConfirm({ action, project, busy, busyIntent, onCancel, onConfirm }) {
  return (
    <section className="git-action-card">
      <div className="git-section-head">
        <strong>运行确认</strong>
        <span>{busyIntent === 'run' && busy ? '正在执行...' : '确认后立即执行'}</span>
      </div>
      <div className="actions-confirm-grid">
        <div>
          <small>Action</small>
          <strong>{action.name}</strong>
        </div>
        <div>
          <small>平台</small>
          <strong>{actionPlatformLabel(action.platform)}</strong>
        </div>
        <div>
          <small>项目路径</small>
          <strong>{project?.path || project?.name || '未选择项目'}</strong>
        </div>
      </div>
      <pre className="git-output actions-command-preview">{action.command}</pre>
      <div className="git-action-grid">
        <button type="button" onClick={onConfirm} disabled={busy}>
          {busyIntent === 'run' && busy ? <Loader2 className="spin" size={15} /> : <Play size={15} />}
          确认运行
        </button>
        <button type="button" className="is-secondary" onClick={onCancel} disabled={busy}>
          取消
        </button>
      </div>
    </section>
  );
}

function ActionDeleteConfirm({ action, busy, busyIntent, onCancel, onConfirm }) {
  return (
    <section className="git-action-card actions-danger-card">
      <div className="git-section-head">
        <strong>删除确认</strong>
        <span>删除后会直接写回配置文件</span>
      </div>
      <p className="git-help-text">确定删除 `{action.name}` 吗？此操作不会自动恢复。</p>
      <div className="git-action-grid">
        <button type="button" className="is-danger" onClick={onConfirm} disabled={busy}>
          {busyIntent === 'delete' && busy ? <Loader2 className="spin" size={15} /> : <Trash2 size={15} />}
          确认删除
        </button>
        <button type="button" className="is-secondary" onClick={onCancel} disabled={busy}>
          取消
        </button>
      </div>
    </section>
  );
}

function ActionResultCard({ result }) {
  const message = actionResultSummary(result, result?.actionName || 'Action');
  if (!result || !message) {
    return null;
  }
  return (
    <section className="git-action-card">
      <div className="git-result">
        <Check size={17} />
        <span>{message}</span>
      </div>
      <div className="actions-result-grid">
        {result.stdout ? (
          <div>
            <strong>stdout</strong>
            <pre className="git-output">{result.stdout}</pre>
          </div>
        ) : null}
        {result.stderr ? (
          <div>
            <strong>stderr</strong>
            <pre className="git-output actions-output-error">{result.stderr}</pre>
          </div>
        ) : null}
      </div>
      {typeof result.exitCode === 'number' ? <small className="git-diff-note">退出码：{result.exitCode}</small> : null}
      {result.timedOut ? <small className="git-diff-note">服务端已标记本次执行超时。</small> : null}
    </section>
  );
}
