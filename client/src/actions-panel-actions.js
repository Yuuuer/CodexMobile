import { sanitizeActionDraft } from './actions-panel-state.js';

export function actionsRequestConfig(kind, {
  projectId,
  revision = '',
  actionKey = '',
  action = null
} = {}) {
  if (!projectId) {
    return null;
  }

  switch (kind) {
    case 'load':
      return { path: `/api/actions?projectId=${encodeURIComponent(projectId)}` };
    case 'run':
      return {
        path: '/api/actions/run',
        options: {
          method: 'POST',
          body: {
            projectId,
            actionKey,
            ...(revision !== '' ? { revision } : {})
          }
        }
      };
    case 'create':
      return {
        path: '/api/actions',
        options: {
          method: 'POST',
          body: {
            projectId,
            revision,
            action: sanitizeActionDraft(action)
          }
        }
      };
    case 'update':
      return {
        path: '/api/actions',
        options: {
          method: 'PATCH',
          body: {
            projectId,
            revision,
            actionKey,
            action: sanitizeActionDraft(action)
          }
        }
      };
    case 'delete':
      return {
        path: '/api/actions',
        options: {
          method: 'DELETE',
          body: {
            projectId,
            revision,
            actionKey
          }
        }
      };
    default:
      return null;
  }
}
