import assert from 'node:assert/strict';
import test from 'node:test';
import { actionsRequestConfig } from './actions-panel-actions.js';

test('actionsRequestConfig maps frontend intents to backend routes', () => {
  const base = {
    projectId: 'project-1',
    revision: 'rev-1',
    actionKey: 'build#1',
    action: {
      name: '构建',
      icon: 'run',
      command: 'npm run build',
      platform: 'all'
    }
  };

  assert.equal(actionsRequestConfig('load', base).path, '/api/actions?projectId=project-1');
  assert.equal(actionsRequestConfig('run', base).path, '/api/actions/run');
  assert.equal(actionsRequestConfig('create', base).path, '/api/actions');
  assert.equal(actionsRequestConfig('update', base).options.method, 'PATCH');
  assert.equal(actionsRequestConfig('delete', base).options.method, 'DELETE');
});

test('actionsRequestConfig serializes create and update payloads with sanitized action body', () => {
  assert.deepEqual(
    actionsRequestConfig('create', {
      projectId: 'project-1',
      revision: 'rev-1',
      action: {
        name: '  运行  ',
        icon: 'run',
        command: '\n npm start \n',
        platform: 'all'
      }
    }),
    {
      path: '/api/actions',
      options: {
        method: 'POST',
        body: {
          projectId: 'project-1',
          revision: 'rev-1',
          action: {
            name: '运行',
            icon: 'run',
            command: 'npm start'
          }
        }
      }
    }
  );
});
