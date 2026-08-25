# Repository State Inspector

`repo-state-inspector` creates a compact, deterministic, read-only report for the first pass through a repository.

It reports:

- top-level entries;
- likely instruction and state files;
- compact signals from recognized state-file headings;
- package manager markers and root `package.json` scripts;
- likely verification scripts;
- Git branch and working-tree status, including inaccessible worktrees;
- GitHub Actions workflow files.

It does not run project commands, edit files, infer project intent, or judge correctness.

## Usage

```powershell
node capabilities/repo-state-inspector/inspect.mjs <repository-path>
node capabilities/repo-state-inspector/inspect.mjs <repository-path> --format json
```

Markdown is the default output. JSON is intended for later mechanical consumers if real use justifies them.
