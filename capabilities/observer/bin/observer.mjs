#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ObserverStore, digestAndAppend, consolidate, appendChronicle } from '../observer.mjs';

const args = process.argv.slice(2);
const command = args[0];
const option = (name, fallback) => { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; };
const store = new ObserverStore(option('--store', 'observer/runtime'));

if (!command || !['digest', 'semantic-task', 'semantic', 'consolidate', 'chronicle'].includes(command)) {
  console.error('Usage: observer.mjs digest --input evidence.json [--semantic semantic.json] [--store path] | semantic-task --execution ID | semantic --execution ID --input semantic.json | consolidate | chronicle --start YYYY-MM-DD --end YYYY-MM-DD');
  process.exit(2);
}
if (command === 'digest') {
  const input = JSON.parse(await readFile(option('--input'), 'utf8'));
  const semanticPath = option('--semantic');
  const semantic = semanticPath ? JSON.parse(await readFile(semanticPath, 'utf8')) : undefined;
  const result = await digestAndAppend(store, { execution: input.execution, evidence: input.evidence, semantic });
  console.log(JSON.stringify(result));
} else if (command === 'semantic-task') {
  console.log(JSON.stringify(await store.semanticTask(option('--execution'))));
} else if (command === 'semantic') {
  const executionId = option('--execution');
  try {
    const result = await store.appendSemantic(executionId, JSON.parse(await readFile(option('--input'), 'utf8')));
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify(await store.appendSemanticFailure(executionId, { errorClass: error.name, reason: 'semantic-observation-rejected' }, Number(option('--attempt', '1')))));
    process.exitCode = 1;
  }
} else if (command === 'consolidate') {
  await mkdir(store.root, { recursive: true });
  const result = await consolidate(store);
  await writeFile(path.join(store.root, `consolidation-${result.consolidatedAt.slice(0, 10)}.json`), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(result));
} else {
  const start = option('--start'); const end = option('--end');
  if (!start || !end) throw new Error('chronicle requires --start and --end');
  const output = option('--output', path.join(store.root, 'chronicle', `${start}.json`));
  console.log(JSON.stringify(await appendChronicle(store, { start, end }, output)));
}
