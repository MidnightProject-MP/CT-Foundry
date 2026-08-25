import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { inspect, renderMarkdown } from '../capabilities/repo-state-inspector/inspect.mjs';

function fixtureDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ct-foundry-inspector-'));
}

test('reports repository conventions without reading generated directories', () => {
  const root = fixtureDirectory();
  fs.mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src', 'nested'), { recursive: true });
  fs.mkdirSync(path.join(root, 'node_modules', 'ignored'), { recursive: true });
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# instructions\n');
  fs.writeFileSync(path.join(root, 'src', 'nested', 'STATE.md'), '# state\n\n## Objective\nInspect once.\n\n## Next action\nUse the report.\n');
  fs.writeFileSync(path.join(root, 'node_modules', 'ignored', 'AGENTS.md'), '# ignored\n');
  fs.writeFileSync(path.join(root, '.github', 'workflows', 'verify.yml'), 'name: Verify\n');
  fs.writeFileSync(path.join(root, 'package-lock.json'), '{}\n');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
    name: 'fixture',
    private: true,
    scripts: {
      test: 'node --test',
      'verify:static': 'npm test',
      start: 'node server.mjs'
    }
  }));

  const report = inspect(root);

  assert.deepEqual(report.packageManagers, ['npm']);
  assert.deepEqual(report.instructionFiles, ['AGENTS.md']);
  assert.deepEqual(report.stateFiles, ['src/nested/STATE.md']);
  assert.deepEqual(report.stateSignals, [{
    file: 'src/nested/STATE.md',
    signals: [
      { kind: 'objective', heading: 'Objective', line: 3, text: 'Inspect once.' },
      { kind: 'next action', heading: 'Next action', line: 6, text: 'Use the report.' }
    ]
  }]);
  assert.deepEqual(report.ciWorkflowFiles, ['.github/workflows/verify.yml']);
  assert.deepEqual(report.verificationCommands.map((entry) => entry.name), ['test', 'verify:static']);
  assert.equal(report.package.name, 'fixture');
  assert.equal(report.git.isRepository, false);
  assert.equal(report.git.status, 'not-repository');
  assert.equal(report.topLevel.some((entry) => entry.name === 'node_modules'), true);
  assert.match(renderMarkdown(report), /not a Git repository/);
});

test('reports bounded nested project markers and package scripts', () => {
  const root = fixtureDirectory();
  fs.mkdirSync(path.join(root, 'app'), { recursive: true });
  fs.mkdirSync(path.join(root, 'terraform'), { recursive: true });
  fs.mkdirSync(path.join(root, 'Radius-source'), { recursive: true });
  fs.mkdirSync(path.join(root, 'Scheduling-Microservice'), { recursive: true });
  fs.mkdirSync(path.join(root, 'vendor', 'hidden-project'), { recursive: true });
  fs.mkdirSync(path.join(root, 'build', 'hidden-project'), { recursive: true });
  fs.mkdirSync(path.join(root, '.venv', 'Lib', 'site-packages', 'hidden-project'), { recursive: true });
  fs.writeFileSync(path.join(root, 'app', 'package.json'), JSON.stringify({
    scripts: { test: 'node test.mjs', lint: 'eslint .' }
  }));
  fs.writeFileSync(path.join(root, 'terraform', 'main.tf'), 'resource "x" "y" {}\n');
  fs.writeFileSync(path.join(root, 'terraform', 'notes.txt'), 'not a marker\n');
  fs.writeFileSync(path.join(root, 'Radius-source', 'Radius.sln'), 'solution\n');
  fs.writeFileSync(path.join(root, 'Radius-source', 'Radius.csproj'), 'project\n');
  fs.writeFileSync(path.join(root, 'Scheduling-Microservice', 'package.json'), '{}');
  fs.writeFileSync(path.join(root, 'vendor', 'hidden-project', 'package.json'), '{}');
  fs.writeFileSync(path.join(root, 'build', 'hidden-project', 'package.json'), '{}');
  fs.writeFileSync(path.join(root, '.venv', 'Lib', 'site-packages', 'hidden-project', 'pyproject.toml'), '[project]\n');

  const report = inspect(root);

  assert.deepEqual(report.nestedProjects, [
    { path: 'app', markers: { node: ['package.json'] }, packageScripts: { test: 'node test.mjs', lint: 'eslint .' } },
    { path: 'Radius-source', markers: { dotnet: ['Radius.csproj', 'Radius.sln'] } },
    { path: 'Scheduling-Microservice', markers: { node: ['package.json'] }, packageScripts: {} },
    { path: 'terraform', markers: { terraform: ['main.tf'] } }
  ]);
  assert.match(renderMarkdown(report), /## Nested Projects/);
  assert.match(renderMarkdown(report), /`app`/);
});

test('reports a missing target as an actionable error', () => {
  assert.throws(
    () => inspect(path.join(os.tmpdir(), 'ct-foundry-inspector-does-not-exist')),
    /Target does not exist/
  );
});

test('reports available Git status without changing the worktree', (context) => {
  const root = fixtureDirectory();
  try {
    execFileSync('git', ['init', '--quiet'], { cwd: root, stdio: 'ignore' });
  } catch {
    context.skip('Git is unavailable in the test environment');
    return;
  }
  fs.writeFileSync(path.join(root, 'README.md'), '# fixture\n');

  const report = inspect(root);

  assert.equal(report.git.isRepository, true);
  assert.equal(report.git.status, 'available');
  assert.equal(report.git.dirty, true);
  assert.equal(report.git.untrackedFiles, 1);
  assert.deepEqual(report.git.paths, ['README.md']);
});
