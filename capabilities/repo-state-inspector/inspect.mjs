import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SKIPPED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'coverage',
  'dist',
  'build',
  'out',
  '.next',
  'target',
  '.venv',
  'venv',
  'env',
  '.tox',
  '.pytest_cache',
  '.mypy_cache'
]);

const NESTED_PROJECT_SKIPPED_DIRECTORIES = new Set([
  ...SKIPPED_DIRECTORIES,
  '.cache',
  'cache',
  'temp',
  'tmp',
  'vendor',
  'generated',
  'output',
  'outputs',
  '.output',
  '.generated',
  'bin',
  'obj',
  '.terraform',
  '.venv',
  'venv',
  'env',
  '.tox',
  '.pytest_cache',
  '.mypy_cache'
]);

const NESTED_PROJECT_MARKERS = [
  ['node', (name) => name === 'package.json'],
  ['python', (name) => name === 'pyproject.toml' || /^requirements.*\.txt$/i.test(name)],
  ['rust', (name) => name === 'Cargo.toml'],
  ['go', (name) => name === 'go.mod'],
  ['make', (name) => name === 'Makefile'],
  ['dotnet', (name) => /\.(sln|csproj)$/i.test(name)],
  ['terraform', (name) => /\.tf$/i.test(name)]
];

const INSTRUCTION_NAMES = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  'INSTRUCTIONS.md',
  '.cursorrules'
]);

const STATE_NAMES = new Set([
  'STATE.md',
  'STATUS.md',
  'ROADMAP.md'
]);

const STATE_SIGNAL_HEADINGS = new Map([
  ['objective', 'objective'],
  ['current milestone', 'current milestone'],
  ['current status', 'current status'],
  ['status', 'current status'],
  ['next action', 'next action'],
  ['next immediate action', 'next action'],
  ['next story', 'next action'],
  ['open questions', 'open questions'],
  ['evidence gaps', 'evidence gaps']
]);

const PACKAGE_MARKERS = [
  ['package-lock.json', 'npm'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['Cargo.toml', 'cargo'],
  ['pyproject.toml', 'python'],
  ['requirements.txt', 'python'],
  ['go.mod', 'go']
];

const VERIFICATION_SCRIPT_PATTERN = /^(build|check|ci|lint|test|typecheck|verify)(:|$)/i;

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function runGit(args, cwd, preserveWhitespace = false) {
  try {
    const output = execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return {
      ok: true,
      value: preserveWhitespace ? output.replace(/\r?\n$/, '') : output.trim()
    };
  } catch (error) {
    return {
      ok: false,
      value: '',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function relativePath(root, filePath) {
  const value = path.relative(root, filePath);
  return value ? value.split(path.sep).join('/') : '.';
}

function findNamedFiles(root, names, maxDepth = 5) {
  const matches = [];

  function visit(directory, depth) {
    if (depth > maxDepth) {
      return;
    }

    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) {
          visit(entryPath, depth + 1);
        }
        continue;
      }

      if (names.has(entry.name)) {
        matches.push(relativePath(root, entryPath));
      }
    }
  }

  visit(root, 0);
  return matches.sort();
}

function findWorkflows(root) {
  const workflowDirectory = path.join(root, '.github', 'workflows');
  if (!fs.existsSync(workflowDirectory)) {
    return [];
  }

  let entries;
  try {
    entries = fs.readdirSync(workflowDirectory, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && /\.(yaml|yml)$/i.test(entry.name))
    .map((entry) => relativePath(root, path.join(workflowDirectory, entry.name)))
    .sort();
}

function extractStateSignals(root, stateFiles) {
  const documents = [];

  for (const file of stateFiles) {
    const filePath = path.join(root, file);
    let lines;
    try {
      lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    } catch {
      continue;
    }

    const headings = [];
    lines.forEach((line, index) => {
      const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
      if (match) {
        headings.push({
          title: match[2].replace(/\s+#+$/, '').trim(),
          line: index + 1,
          index
        });
      }
    });

    const signals = headings
      .map((heading, index) => {
        const kind = STATE_SIGNAL_HEADINGS.get(heading.title.toLowerCase());
        if (!kind) {
          return null;
        }
        const nextHeading = headings[index + 1];
        const text = lines
          .slice(heading.index + 1, nextHeading ? nextHeading.index : lines.length)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        return {
          kind,
          heading: heading.title,
          line: heading.line,
          text: text.length > 800 ? `${text.slice(0, 797)}...` : text
        };
      })
      .filter(Boolean);

    const labeledSignals = new Map();
    for (const [index, line] of lines.entries()) {
      const match = /^\s*[-*]\s+(?:\*\*)?([^:*]+?)(?:\*\*)?:\s*(.+?)\s*$/.exec(line);
      if (!match) {
        continue;
      }
      const kind = STATE_SIGNAL_HEADINGS.get(match[1].trim().toLowerCase());
      if (kind) {
        labeledSignals.set(kind, {
          kind,
          heading: match[1].trim(),
          line: index + 1,
          text: match[2].trim().length > 800 ? `${match[2].trim().slice(0, 797)}...` : match[2].trim()
        });
      }
    }

    signals.push(...labeledSignals.values());
    signals.sort((left, right) => left.line - right.line);

    if (signals.length) {
      documents.push({ file, signals });
    }
  }

  return documents;
}

function hasGitMetadata(root) {
  let current = root;
  while (true) {
    if (fs.existsSync(path.join(current, '.git'))) {
      return true;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return false;
    }
    current = parent;
  }
}

function inspectGit(root) {
  const repositoryRootResult = runGit(['rev-parse', '--show-toplevel'], root);
  if (!repositoryRootResult.ok) {
    const inaccessible = hasGitMetadata(root);
    return {
      isRepository: inaccessible ? null : false,
      status: inaccessible ? 'inaccessible' : 'not-repository',
      reason: inaccessible ? 'repository metadata was found, but Git could not inspect the worktree' : null,
      repositoryRoot: null,
      branch: null,
      dirty: null,
      changedFiles: 0,
      untrackedFiles: 0,
      paths: []
    };
  }

  const repositoryRoot = path.resolve(repositoryRootResult.value);
  const branchResult = runGit(['symbolic-ref', '--quiet', '--short', 'HEAD'], root);
  const commitResult = runGit(['rev-parse', '--short', 'HEAD'], root);
  const statusResult = runGit(['status', '--short', '--untracked-files=all'], root, true);
  const statusLines = statusResult.ok && statusResult.value ? statusResult.value.split(/\r?\n/) : [];
  const entries = statusLines.filter(Boolean).map((line) => ({
    code: line.slice(0, 2),
    path: line.slice(3)
  }));

  return {
    isRepository: true,
    status: 'available',
    reason: statusResult.ok ? null : 'Git identified the repository, but could not read worktree status',
    repositoryRoot,
    branch: branchResult.ok ? branchResult.value : commitResult.ok ? `(detached at ${commitResult.value})` : '(unborn)',
    dirty: statusResult.ok ? entries.length > 0 : null,
    changedFiles: statusResult.ok ? entries.filter((entry) => entry.code !== '??').length : null,
    untrackedFiles: statusResult.ok ? entries.filter((entry) => entry.code === '??').length : null,
    paths: entries.map((entry) => entry.path).sort()
  };
}

function inspectPackage(root) {
  const packagePath = path.join(root, 'package.json');
  if (!isFile(packagePath)) {
    return {
      manifest: null,
      name: null,
      private: null,
      packageManager: null,
      scripts: {},
      parseError: null
    };
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const scripts = manifest.scripts && typeof manifest.scripts === 'object' ? manifest.scripts : {};
    return {
      manifest: 'package.json',
      name: typeof manifest.name === 'string' ? manifest.name : null,
      private: manifest.private === true,
      packageManager: typeof manifest.packageManager === 'string' ? manifest.packageManager : null,
      scripts,
      parseError: null
    };
  } catch (error) {
    return {
      manifest: 'package.json',
      name: null,
      private: null,
      packageManager: null,
      scripts: {},
      parseError: error instanceof Error ? error.message : String(error)
    };
  }
}

function inspectNestedProjects(root, maxDepth = 6) {
  const projects = [];

  function visit(directory, depth) {
    if (depth > maxDepth) {
      return;
    }

    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));
    const markers = {};
    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      const marker = NESTED_PROJECT_MARKERS.find(([, matches]) => matches(entry.name));
      if (marker) {
        const [category] = marker;
        if (!markers[category]) {
          markers[category] = [];
        }
        markers[category].push(entry.name);
      }
    }

    if (directory !== root && Object.keys(markers).length) {
      const project = {
        path: relativePath(root, directory),
        markers
      };
      if (markers.node?.includes('package.json')) {
        project.packageScripts = inspectPackage(directory).scripts;
      }
      projects.push(project);
    }

    for (const entry of entries) {
      if (entry.isDirectory() && !NESTED_PROJECT_SKIPPED_DIRECTORIES.has(entry.name)) {
        visit(path.join(directory, entry.name), depth + 1);
      }
    }
  }

  visit(root, 0);
  return projects.sort((left, right) => left.path.localeCompare(right.path));
}

function inspect(rootPath) {
  const root = path.resolve(rootPath);
  if (!fs.existsSync(root)) {
    throw new Error(`Target does not exist: ${root}`);
  }
  if (!fs.statSync(root).isDirectory()) {
    throw new Error(`Target is not a directory: ${root}`);
  }

  const topLevel = fs.readdirSync(root, { withFileTypes: true })
    .map((entry) => ({
      name: entry.name,
      kind: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other'
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const topLevelNames = new Set(topLevel.map((entry) => entry.name));
  const packageInfo = inspectPackage(root);
  const instructionFiles = findNamedFiles(root, INSTRUCTION_NAMES);
  const stateFiles = findNamedFiles(root, STATE_NAMES);
  const packageManagers = PACKAGE_MARKERS
    .filter(([marker]) => topLevelNames.has(marker))
    .map(([, manager]) => manager);
  if (packageInfo.manifest && packageInfo.packageManager) {
    packageManagers.unshift(packageInfo.packageManager.split('@')[0]);
  }

  const verificationCommands = Object.entries(packageInfo.scripts)
    .filter(([name]) => VERIFICATION_SCRIPT_PATTERN.test(name))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, script]) => ({
      name,
      script,
      command: `${packageManagers[0] || 'npm'} run ${name}`
    }));

  return {
    schemaVersion: 2,
    target: root,
    topLevel,
    instructionFiles,
    stateFiles,
    stateSignals: extractStateSignals(root, stateFiles),
    packageManagers: [...new Set(packageManagers)],
    package: packageInfo,
    verificationCommands,
    nestedProjects: inspectNestedProjects(root),
    ciWorkflowFiles: findWorkflows(root),
    git: inspectGit(root)
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Repository State',
    '',
    `- Target: \`${report.target}\``,
    `- Package managers: ${report.packageManagers.length ? report.packageManagers.map((manager) => `\`${manager}\``).join(', ') : 'none detected'}`,
    `- Git: ${report.git.status === 'available'
      ? `${report.git.branch}, ${report.git.dirty === null ? 'status unavailable' : report.git.dirty ? 'dirty' : 'clean'}`
      : report.git.status === 'inaccessible'
        ? `inaccessible (${report.git.reason})`
        : 'not a repository'}`,
    '',
    '## Top Level',
    ''
  ];

  if (report.topLevel.length) {
    lines.push(...report.topLevel.map((entry) => `- ${entry.kind}: \`${entry.name}\``));
  } else {
    lines.push('- empty');
  }

  lines.push('', '## Instructions', '');
  lines.push(...(report.instructionFiles.length ? report.instructionFiles.map((file) => `- \`${file}\``) : ['- none detected']));
  lines.push('', '## State Files', '');
  lines.push(...(report.stateFiles.length ? report.stateFiles.map((file) => `- \`${file}\``) : ['- none detected']));
  lines.push('', '## State Signals', '');
  if (report.stateSignals.length) {
    for (const document of report.stateSignals) {
      lines.push(`- \`${document.file}\``);
      lines.push(...document.signals.map((signal) => `  - ${signal.kind} (line ${signal.line}): ${signal.text || '(empty)'}`));
    }
  } else {
    lines.push('- no recognized state headings detected');
  }
  lines.push('', '## Verification', '');
  lines.push(...(report.verificationCommands.length
    ? report.verificationCommands.map((entry) => `- \`${entry.command}\` - ${entry.script}`)
    : ['- no conventional package scripts detected']));
  lines.push('', '## Nested Projects', '');
  if (report.nestedProjects.length) {
    for (const project of report.nestedProjects) {
      lines.push(`- \`${project.path}\``);
      for (const [category, files] of Object.entries(project.markers)) {
        lines.push(`  - ${category}: ${files.map((file) => `\`${file}\``).join(', ')}`);
      }
      if (project.packageScripts) {
        const scripts = Object.entries(project.packageScripts);
        lines.push(`  - package scripts: ${scripts.length
          ? scripts.map(([name, script]) => `\`${name}\`: ${script}`).join('; ')
          : 'none'}`);
      }
    }
  } else {
    lines.push('- none detected');
  }
  lines.push('', '## CI Workflows', '');
  lines.push(...(report.ciWorkflowFiles.length ? report.ciWorkflowFiles.map((file) => `- \`${file}\``) : ['- none detected']));
  lines.push('', '## Git', '');
  if (report.git.status === 'not-repository') {
    lines.push('- not a Git repository');
  } else if (report.git.status === 'inaccessible') {
    lines.push(`- inaccessible: ${report.git.reason}`);
  } else {
    lines.push(`- Repository root: \`${report.git.repositoryRoot}\``);
    if (report.git.dirty === null) {
      lines.push(`- ${report.git.reason}`);
    } else {
      lines.push(`- Changed files: ${report.git.changedFiles}`);
      lines.push(`- Untracked files: ${report.git.untrackedFiles}`);
    }
    if (report.git.paths.length) {
      lines.push('- Paths:');
      lines.push(...report.git.paths.map((file) => `  - \`${file}\``));
    }
  }

  return `${lines.join('\n')}\n`;
}

function parseArguments(args) {
  let target = '.';
  let format = 'markdown';
  let targetProvided = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') {
      return { help: true };
    }
    if (argument === '--json') {
      format = 'json';
      continue;
    }
    if (argument === '--format') {
      format = args[index + 1];
      index += 1;
      continue;
    }
    if (argument.startsWith('--')) {
      throw new Error(`Unknown option: ${argument}`);
    }
    if (targetProvided) {
      throw new Error('Only one repository path may be supplied');
    }
    target = argument;
    targetProvided = true;
  }

  if (format !== 'json' && format !== 'markdown') {
    throw new Error(`Unsupported format: ${format}`);
  }

  return { target, format, help: false };
}

function printHelp() {
  process.stdout.write([
    'Usage: node inspect.mjs [repository-path] [--format markdown|json]',
    '',
    'The default output is Markdown. The inspection is read-only and does not run project commands.'
  ].join('\n') + '\n');
}

export { inspect, renderMarkdown };

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      printHelp();
    } else {
      const report = inspect(options.target);
      process.stdout.write(options.format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report));
    }
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
