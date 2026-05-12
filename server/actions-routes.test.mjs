import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { createActionsRouteHandler } from './actions-routes.js';

function createResponse() {
  return {
    statusCode: null,
    headers: null,
    body: '',
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body) {
      this.body = String(body || '');
    }
  };
}

function createRequest(method = 'GET') {
  const req = new EventEmitter();
  req.method = method;
  req.destroy = () => {};
  return req;
}

test('actions route handler ignores non-actions API routes', async () => {
  const handler = createActionsRouteHandler({ actionsService: {} });
  const req = createRequest('GET');
  const res = createResponse();
  const handled = await handler(req, res, new URL('http://localhost/api/projects'));

  assert.equal(handled, false);
  assert.equal(res.statusCode, null);
});

test('actions route handler serves GET /api/actions with the existing response shape', async () => {
  const handler = createActionsRouteHandler({
    actionsService: {
      async getEnvironment(projectId) {
        assert.equal(projectId, 'project-1');
        return {
          exists: true,
          path: '/repo/.codex/environments/environment.toml',
          revision: 'rev-1',
          environment: {
            version: 1,
            name: 'CodexMobile',
            setupScript: '',
            setupScriptPresent: false,
            actions: []
          }
        };
      }
    }
  });
  const req = createRequest('GET');
  const res = createResponse();
  const handled = await handler(req, res, new URL('http://localhost/api/actions?projectId=project-1'));

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), {
    success: true,
    exists: true,
    path: '/repo/.codex/environments/environment.toml',
    revision: 'rev-1',
    environment: {
      version: 1,
      name: 'CodexMobile',
      setupScript: '',
      setupScriptPresent: false,
      actions: []
    }
  });
});

test('actions route handler reads run bodies and returns the run payload', async () => {
  const handler = createActionsRouteHandler({
    actionsService: {
      async runAction(projectId, actionKey) {
        assert.equal(projectId, 'project-1');
        assert.equal(actionKey, '0:abc');
        return { actionKey, exitCode: 0, stdout: 'done' };
      }
    }
  });
  const req = createRequest('POST');
  const res = createResponse();
  const promise = handler(req, res, new URL('http://localhost/api/actions/run'));
  req.emit('data', JSON.stringify({ projectId: 'project-1', actionKey: '0:abc' }));
  req.emit('end');
  const handled = await promise;

  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), {
    success: true,
    run: {
      actionKey: '0:abc',
      exitCode: 0,
      stdout: 'done'
    }
  });
});

test('actions route handler routes create, update, and delete bodies through the service', async () => {
  const calls = [];
  const payload = {
    exists: true,
    path: '/repo/.codex/environments/environment.toml',
    revision: 'rev-next',
    environment: {
      version: 1,
      name: 'CodexMobile',
      setupScript: '',
      setupScriptPresent: false,
      actions: [{ actionKey: '0:abc', index: 0, name: '构建', icon: 'run', command: 'npm run build', platform: null, platformMatched: true }]
    }
  };
  const handler = createActionsRouteHandler({
    actionsService: {
      async createAction(projectId, revision, action) {
        calls.push(['create', projectId, revision, action.name]);
        return payload;
      },
      async updateAction(projectId, revision, actionKey, action) {
        calls.push(['update', projectId, revision, actionKey, action.name]);
        return payload;
      },
      async deleteAction(projectId, revision, actionKey) {
        calls.push(['delete', projectId, revision, actionKey]);
        return payload;
      }
    }
  });

  for (const [method, route, body] of [
    ['POST', '/api/actions', { projectId: 'project-1', revision: 'rev-1', action: { name: '构建', icon: 'run', command: 'npm run build' } }],
    ['PATCH', '/api/actions', { projectId: 'project-1', revision: 'rev-2', actionKey: '0:abc', action: { name: '构建2', icon: 'run', command: 'npm run build' } }],
    ['DELETE', '/api/actions', { projectId: 'project-1', revision: 'rev-3', actionKey: '0:abc' }]
  ]) {
    const req = createRequest(method);
    const res = createResponse();
    const promise = handler(req, res, new URL(`http://localhost${route}`));
    req.emit('data', JSON.stringify(body));
    req.emit('end');
    const handled = await promise;

    assert.equal(handled, true);
    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(res.body).success, true);
  }

  assert.deepEqual(calls, [
    ['create', 'project-1', 'rev-1', '构建'],
    ['update', 'project-1', 'rev-2', '0:abc', '构建2'],
    ['delete', 'project-1', 'rev-3', '0:abc']
  ]);
});
