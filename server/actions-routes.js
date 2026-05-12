import { readBody, sendJson } from './http-utils.js';

function sendActionsError(res, error, fallback = 'Actions operation failed') {
  const statusCode = error.statusCode || 500;
  sendJson(res, statusCode, { error: error.message || fallback });
}

export function createActionsRouteHandler({ actionsService }) {
  if (!actionsService) {
    throw new Error('createActionsRouteHandler requires actionsService');
  }

  return async function handleActionsApi(req, res, url) {
    const method = req.method || 'GET';
    const pathname = url.pathname;

    if (pathname !== '/api/actions' && pathname !== '/api/actions/run' && !pathname.startsWith('/api/actions/')) {
      return false;
    }

    if (method === 'GET' && pathname === '/api/actions') {
      const projectId = url.searchParams.get('projectId');
      try {
        sendJson(res, 200, {
          success: true,
          ...(await actionsService.getEnvironment(projectId))
        });
      } catch (error) {
        console.warn(`[actions] list failed project=${projectId || ''}: ${error.message}`);
        sendActionsError(res, error, 'Failed to read actions');
      }
      return true;
    }

    if (method === 'POST' && pathname === '/api/actions/run') {
      const body = await readBody(req);
      try {
        sendJson(res, 200, {
          success: true,
          run: await actionsService.runAction(body.projectId, body.actionKey)
        });
      } catch (error) {
        console.warn(`[actions] run failed project=${body.projectId || ''}: ${error.message}`);
        sendActionsError(res, error, 'Failed to run action');
      }
      return true;
    }

    if (method === 'POST' && pathname === '/api/actions') {
      const body = await readBody(req);
      try {
        sendJson(res, 200, {
          success: true,
          ...(await actionsService.createAction(body.projectId, body.revision, body.action))
        });
      } catch (error) {
        console.warn(`[actions] create failed project=${body.projectId || ''}: ${error.message}`);
        sendActionsError(res, error, 'Failed to create action');
      }
      return true;
    }

    if (method === 'PATCH' && pathname === '/api/actions') {
      const body = await readBody(req);
      try {
        sendJson(res, 200, {
          success: true,
          ...(await actionsService.updateAction(body.projectId, body.revision, body.actionKey, body.action))
        });
      } catch (error) {
        console.warn(`[actions] update failed project=${body.projectId || ''}: ${error.message}`);
        sendActionsError(res, error, 'Failed to update action');
      }
      return true;
    }

    if (method === 'DELETE' && pathname === '/api/actions') {
      const body = await readBody(req);
      try {
        sendJson(res, 200, {
          success: true,
          ...(await actionsService.deleteAction(body.projectId, body.revision, body.actionKey))
        });
      } catch (error) {
        console.warn(`[actions] delete failed project=${body.projectId || ''}: ${error.message}`);
        sendActionsError(res, error, 'Failed to delete action');
      }
      return true;
    }

    sendJson(res, 404, { error: 'Actions API route not found' });
    return true;
  };
}
