// Host half of the to-do list plugin.
//
// Responsibility split: this file owns the task store (one JSON file per task under
// `<repoDir>/todo/`) and every Git operation. The client half owns presentation only
// and reaches all of this through exact Fetch routes under `/api/dsh-todo/<action>`.
//
// Why the config lives in its own file instead of the bundle Config: the repository
// path is a per-machine fact the user sets once from the panel, and re-seeding a
// Loader Config row would mean editing the profile. `~/.dsh-todo/config.json` keeps
// it outside every DSH directory, so changing the path never needs a reinstall.
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const inject = ['connection'];

/** Private Connection channel; the client half posts to the same paths. */
const CHANNEL = '/dsh-todo';
const CONFIG_FILE = path.join(os.homedir(), '.dsh-todo', 'config.json');
const DEFAULT_CONFIG = { repoDir: '', remote: '', branch: 'main', autoCommit: true, remoteName: 'origin' };
const DATA_DIR = 'todo';
const PROJECTS_DIR = 'projects';
const TASKS_DIR = 'tasks';
const STATUSES = ['todo', 'doing', 'done'];
const PRIORITIES = [1, 2, 3, 4];
const FIELD_LIMIT = 4000;
const NOTES_LIMIT = 20000;
const GIT_TIMEOUT_MS = 120000;
const MAX_CHANGES_REPORTED = 40;

function describe(error) {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asText(value, limit = FIELD_LIMIT) {
  return typeof value === 'string' ? value.slice(0, limit) : '';
}

function asId(value) {
  const text = asText(value, 64);
  return /^[A-Za-z0-9_-]{1,64}$/.test(text) ? text : null;
}

function asDate(value) {
  // Accepts 'YYYY-MM-DD' (legacy all-day) and 'YYYY-MM-DDTHH:mm' (time-precise, local).
  const text = asText(value, 16);
  return /^\d{4}-\d{2}-\d{2}([T]\d{2}:\d{2})?$/.test(text) ? text : null;
}

function asPriority(value) {
  const number = Number(value);
  return PRIORITIES.includes(number) ? number : null;
}

function asOrder(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asTags(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((tag) => asText(tag, 40).trim())
    .filter((tag) => tag !== '')
    .slice(0, 12);
}

function timestamp() {
  return new Date().toISOString();
}

// --- filesystem primitives -------------------------------------------------

async function exists(target) {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
}

async function readJson(file) {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function listJson(dir) {
  try {
    return (await fs.readdir(dir)).filter((name) => name.endsWith('.json'));
  } catch {
    return [];
  }
}

function projectsDir(config) {
  return path.join(config.repoDir, DATA_DIR, PROJECTS_DIR);
}

function tasksDir(config) {
  return path.join(config.repoDir, DATA_DIR, TASKS_DIR);
}

function projectFile(config, id) {
  return path.join(projectsDir(config), `${id}.json`);
}

function taskFile(config, id) {
  return path.join(tasksDir(config), `${id}.json`);
}

async function ensureLayout(config) {
  await fs.mkdir(config.repoDir, { recursive: true });
  await fs.mkdir(projectsDir(config), { recursive: true });
  await fs.mkdir(tasksDir(config), { recursive: true });
  const meta = path.join(config.repoDir, DATA_DIR, 'meta.json');
  if (!(await exists(meta))) {
    await writeJson(meta, { schema: 1, createdAt: timestamp() });
  }
}

// --- config ----------------------------------------------------------------

function pickConfig(source) {
  const record = isRecord(source) ? source : {};
  const picked = {};
  if (typeof record.repoDir === 'string') picked.repoDir = record.repoDir.trim();
  if (typeof record.remote === 'string') picked.remote = record.remote.trim();
  if (typeof record.branch === 'string' && record.branch.trim() !== '') picked.branch = record.branch.trim();
  if (typeof record.autoCommit === 'boolean') picked.autoCommit = record.autoCommit;
  return picked;
}

function createConfigAccess(bundleConfig) {
  const fromBundle = pickConfig(bundleConfig);
  let cached = null;

  return {
    async get() {
      if (cached === null) {
        const stored = pickConfig(await readJson(CONFIG_FILE));
        cached = { ...DEFAULT_CONFIG, ...fromBundle, ...stored };
        if (cached.repoDir !== '') cached.repoDir = path.resolve(cached.repoDir);
      }
      return { ...cached };
    },
    async save(next) {
      cached = { ...next };
      await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
      await fs.writeFile(CONFIG_FILE, `${JSON.stringify(cached, null, 2)}\n`, 'utf8');
      return { ...cached };
    },
  };
}

// --- git -------------------------------------------------------------------

const GIT_ENV = {
  ...process.env,
  // A background Host has no terminal: without these, a credential prompt would
  // hang the request instead of failing with a message we can show the user.
  GIT_TERMINAL_PROMPT: '0',
  GCM_INTERACTIVE: 'never',
  GIT_PAGER: 'cat',
  GIT_EDITOR: 'true',
};

function runGit(config, args, timeout = GIT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    execFile(
      'git',
      ['-C', config.repoDir, ...args],
      { windowsHide: true, timeout, maxBuffer: 8 * 1024 * 1024, env: GIT_ENV },
      (error, stdout, stderr) => {
        const out = String(stdout ?? '');
        const err = String(stderr ?? '');
        if (error === null) {
          resolve({ code: 0, stdout: out, stderr: err, missing: false, timedOut: false });
          return;
        }
        if (error.code === 'ENOENT') {
          resolve({ code: -1, stdout: out, stderr: '找不到 git 可执行文件（PATH 上没有 git）', missing: true, timedOut: false });
          return;
        }
        resolve({
          code: typeof error.code === 'number' ? error.code : 1,
          stdout: out,
          stderr: err || describe(error),
          missing: false,
          timedOut: error.killed === true,
        });
      },
    );
  });
}

function output(result) {
  return `${result.stdout}${result.stderr}`.trim();
}

function hintFor(text) {
  if (/could not read Username|Authentication failed|terminal prompts disabled|GCM_INTERACTIVE|no credential/i.test(text)) {
    return '凭据不可用：请先在终端里手动执行一次该仓库的 git push（让凭据管理器缓存密码），之后插件内的推送就能直接用。';
  }
  if (/unable to access|Could not resolve host|Failed to connect|proxy/i.test(text)) {
    return '连不上远端：检查网络与代理（GitHub 走 127.0.0.1:7890 时需代理在线）。';
  }
  if (/CONFLICT|conflict|needs merge|would be overwritten/i.test(text)) {
    return '有冲突：需要手工解决同一个任务文件的两处修改，然后提交。';
  }
  if (/Updates were rejected|fetch first|non-fast-forward/i.test(text)) {
    return '远端有本地没有的提交（例如建仓库时的初始提交）：先点面板里的「拉取」合并远端历史，再推送。';
  }
  if (/not a git repository/i.test(text)) {
    return '本机该目录还不是 Git 仓库：重新保存一次设置即可自动初始化。';
  }
  return null;
}

async function ensureRepo(config) {
  await fs.mkdir(config.repoDir, { recursive: true });
  const warnings = [];
  let created = false;

  const probe = await runGit(config, ['rev-parse', '--is-inside-work-tree']);
  if (probe.missing) throw new Error(probe.stderr);
  if (probe.code !== 0) {
    const init = await runGit(config, ['init', '-b', config.branch]);
    if (init.code !== 0) {
      const fallback = await runGit(config, ['init']);
      if (fallback.code !== 0) throw new Error(`git init 失败：${output(fallback)}`);
      await runGit(config, ['symbolic-ref', 'HEAD', `refs/heads/${config.branch}`]);
      warnings.push('旧版 git 不支持 init -b，已用 symbolic-ref 设置分支。');
    }
    created = true;
  }

  await ensureLayout(config);

  const branchNow = await runGit(config, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
  if (branchNow.code === 0 && branchNow.stdout.trim() !== config.branch) {
    const rename = await runGit(config, ['branch', '-M', config.branch]);
    if (rename.code === 0) warnings.push(`当前分支已重命名为 ${config.branch}。`);
  }

  if (config.remote !== '') {
    const remotes = await runGit(config, ['remote']);
    const names = remotes.stdout.split('\n').map((line) => line.trim()).filter((line) => line !== '');
    if (!names.includes(config.remoteName)) {
      const add = await runGit(config, ['remote', 'add', config.remoteName, config.remote]);
      if (add.code !== 0) warnings.push(`添加远端失败：${output(add)}`);
    } else {
      const url = await runGit(config, ['remote', 'get-url', config.remoteName]);
      if (url.stdout.trim() !== config.remote) {
        const set = await runGit(config, ['remote', 'set-url', config.remoteName, config.remote]);
        if (set.code !== 0) warnings.push(`更新远端地址失败：${output(set)}`);
      }
    }
  }

  return { created, warnings };
}

async function commitAll(config, message, reason) {
  if (!config.autoCommit) return { committed: false, reason: 'auto-commit-off' };

  const add = await runGit(config, ['add', '-A'], 30000);
  if (add.code !== 0) return { committed: false, reason: output(add) };

  const staged = await runGit(config, ['status', '--porcelain'], 30000);
  if (staged.stdout.trim() === '') return { committed: false, reason: 'clean' };

  const commit = await runGit(config, ['commit', '-m', message], 60000);
  if (commit.code !== 0) return { committed: false, reason: output(commit) || reason || 'commit-failed' };

  const hash = await runGit(config, ['rev-parse', '--short', 'HEAD'], 15000);
  return { committed: true, hash: hash.stdout.trim() || null, message };
}

function parseBranchLine(line) {
  const body = line.slice(2).trim();
  if (body.startsWith('No commits yet on ')) {
    return { branch: body.slice('No commits yet on '.length).trim(), upstream: null, ahead: 0, behind: 0, gone: false };
  }
  const bracket = body.indexOf(' [');
  const head = bracket === -1 ? body : body.slice(0, bracket);
  let ahead = 0;
  let behind = 0;
  let gone = false;
  if (bracket !== -1) {
    for (const piece of body.slice(bracket + 2).replace(/\]$/, '').split(',')) {
      const [key, value] = piece.trim().split(/\s+/);
      if (key === 'ahead') ahead = Number(value) || 0;
      else if (key === 'behind') behind = Number(value) || 0;
      else if (key === 'gone') gone = true;
    }
  }
  const dots = head.indexOf('...');
  if (dots === -1) return { branch: head.trim(), upstream: null, ahead, behind, gone };
  return { branch: head.slice(0, dots).trim(), upstream: head.slice(dots + 3).trim(), ahead, behind, gone };
}

async function gitStatus(config) {
  const status = {
    configured: config.repoDir !== '',
    exists: false,
    initialized: false,
    branch: config.branch,
    upstream: null,
    ahead: 0,
    behind: 0,
    gone: false,
    dirty: 0,
    changes: [],
    last: null,
    remote: config.remote,
    error: null,
  };
  if (!status.configured) {
    status.error = '还没有设置仓库路径';
    return status;
  }
  status.exists = await exists(config.repoDir);
  if (!status.exists) return status;

  const probe = await runGit(config, ['rev-parse', '--is-inside-work-tree'], 20000);
  if (probe.missing) {
    status.error = probe.stderr;
    return status;
  }
  if (probe.code !== 0) return status;
  status.initialized = true;

  const porcelain = await runGit(config, ['status', '--porcelain=v1', '-b'], 30000);
  if (porcelain.code !== 0) {
    status.error = output(porcelain);
    return status;
  }
  const lines = porcelain.stdout.split('\n').filter((line) => line.trim() !== '');
  const head = lines.length > 0 && lines[0].startsWith('##') ? lines[0] : null;
  if (head !== null) Object.assign(status, parseBranchLine(head));
  const changes = head === null ? lines : lines.slice(1);
  status.dirty = changes.length;
  status.changes = changes.slice(0, MAX_CHANGES_REPORTED).map((line) => ({
    state: line.slice(0, 2),
    path: line.slice(3).trim(),
  }));

  const log = await runGit(config, ['log', '-1', '--format=%h%x09%s%x09%cI'], 20000);
  if (log.code === 0 && log.stdout.trim() !== '') {
    const [hash, subject, date] = log.stdout.trim().split('\t');
    status.last = { hash, subject, date };
  }
  return status;
}

// --- store -----------------------------------------------------------------

function normalizeSubtask(raw, index) {
  const record = isRecord(raw) ? raw : {};
  return {
    id: asId(record.id) ?? randomUUID(),
    title: asText(record.title, FIELD_LIMIT),
    done: record.done === true,
    due: asDate(record.due),
    priority: asPriority(record.priority),
    order: asOrder(record.order, index),
  };
}

function normalizeProject(raw, fallbackId) {
  const record = isRecord(raw) ? raw : {};
  return {
    id: asId(record.id) ?? asId(fallbackId) ?? randomUUID(),
    parentId: asId(record.parentId),
    name: asText(record.name, 200),
    color: asText(record.color, 20),
    order: asOrder(record.order, 0),
    archived: record.archived === true,
    createdAt: asText(record.createdAt, 40) || timestamp(),
    updatedAt: asText(record.updatedAt, 40) || timestamp(),
  };
}

function normalizeTask(raw, fallbackId) {
  const record = isRecord(raw) ? raw : {};
  const status = STATUSES.includes(record.status) ? record.status : 'todo';
  return {
    id: asId(record.id) ?? asId(fallbackId) ?? randomUUID(),
    projectId: asId(record.projectId),
    title: asText(record.title, FIELD_LIMIT),
    notes: asText(record.notes, NOTES_LIMIT),
    status,
    priority: asPriority(record.priority),
    due: asDate(record.due),
    order: asOrder(record.order, 0),
    tags: asTags(record.tags),
    subtasks: Array.isArray(record.subtasks) ? record.subtasks.map(normalizeSubtask) : [],
    createdAt: asText(record.createdAt, 40) || timestamp(),
    updatedAt: asText(record.updatedAt, 40) || timestamp(),
    doneAt: status === 'done' ? asText(record.doneAt, 40) || null : null,
  };
}

async function readStore(config) {
  const problems = [];
  const projects = [];
  const tasks = [];

  for (const name of await listJson(projectsDir(config))) {
    const raw = await readJson(path.join(projectsDir(config), name));
    if (raw === null) {
      problems.push(`项目文件无法解析：${name}`);
      continue;
    }
    projects.push(normalizeProject(raw, name.replace(/\.json$/, '')));
  }
  for (const name of await listJson(tasksDir(config))) {
    const raw = await readJson(path.join(tasksDir(config), name));
    if (raw === null) {
      problems.push(`任务文件无法解析：${name}`);
      continue;
    }
    tasks.push(normalizeTask(raw, name.replace(/\.json$/, '')));
  }

  const projectIds = new Set(projects.map((project) => project.id));
  for (const task of tasks) {
    if (task.projectId !== null && !projectIds.has(task.projectId)) task.projectId = null;
  }

  // Orphan sub-projects fall back to top level; a parent cycle is broken by
  // detaching the project that closes the loop.
  const byId = new Map(projects.map((project) => [project.id, project]));
  for (const project of projects) {
    if (project.parentId === null) continue;
    const seen = new Set([project.id]);
    let cursor = byId.get(project.parentId);
    while (cursor !== undefined) {
      if (seen.has(cursor.id)) {
        project.parentId = null;
        break;
      }
      seen.add(cursor.id);
      cursor = cursor.parentId === null ? undefined : byId.get(cursor.parentId);
    }
    if (project.parentId !== null && byId.get(project.parentId) === undefined) project.parentId = null;
  }

  projects.sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
  return { projects, tasks, problems };
}

function desiredProject(payload, existing) {
  const record = isRecord(payload) ? payload : {};
  const now = timestamp();
  return {
    id: asId(record.id) ?? existing?.id ?? randomUUID(),
    parentId: asId(record.parentId) ?? existing?.parentId ?? null,
    name: asText(record.name, 200).trim() || '未命名项目',
    color: asText(record.color, 20),
    order: asOrder(record.order, existing?.order ?? Date.now()),
    archived: record.archived === true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function desiredTask(payload, existing) {
  const record = isRecord(payload) ? payload : {};
  const now = timestamp();
  const status = STATUSES.includes(record.status) ? record.status : existing?.status ?? 'todo';
  return {
    id: asId(record.id) ?? existing?.id ?? randomUUID(),
    projectId: asId(record.projectId),
    title: asText(record.title, FIELD_LIMIT),
    notes: asText(record.notes, NOTES_LIMIT),
    status,
    priority: asPriority(record.priority),
    due: asDate(record.due),
    order: asOrder(record.order, existing?.order ?? Date.now()),
    tags: asTags(record.tags),
    subtasks: Array.isArray(record.subtasks) ? record.subtasks.map(normalizeSubtask) : existing?.subtasks ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    doneAt: status === 'done' ? existing?.doneAt ?? now : null,
  };
}

// --- actions ---------------------------------------------------------------

function requireRepo(config) {
  if (config.repoDir === '') throw new Error('还没有设置仓库路径，请先在设置里填写并保存。');
}

function createActions(configAccess) {
  async function state(config) {
    const store = config.repoDir === '' ? { projects: [], tasks: [], problems: [] } : await readStore(config);
    return {
      config,
      configPath: CONFIG_FILE,
      projects: store.projects,
      tasks: store.tasks,
      problems: store.problems,
      git: await gitStatus(config),
      now: timestamp(),
    };
  }

  return {
    env: async () => ({
      node: process.version,
      platform: process.platform,
      home: os.homedir(),
      configPath: CONFIG_FILE,
      gitDriver: typeof execFile === 'function' ? 'child_process.execFile' : null,
    }),

    state: async () => state(await configAccess.get()),

    'config/save': async (payload) => {
      const current = await configAccess.get();
      const record = isRecord(payload) ? payload : {};
      const next = { ...current };
      if (typeof record.repoDir === 'string') next.repoDir = record.repoDir.trim().replace(/[\\/]+$/, '');
      if (typeof record.remote === 'string') next.remote = record.remote.trim();
      if (typeof record.branch === 'string' && record.branch.trim() !== '') next.branch = record.branch.trim();
      if (typeof record.autoCommit === 'boolean') next.autoCommit = record.autoCommit;
      if (next.repoDir !== '' && !path.isAbsolute(next.repoDir)) {
        throw new Error('仓库路径必须是绝对路径，例如 D:\\notes\\todo-repo');
      }

      const saved = await configAccess.save(next);
      if (saved.repoDir === '') return { config: saved, created: false, warnings: ['仓库路径为空：数据不会写入磁盘。'], ...(await state(saved)) };

      const setup = await ensureRepo(saved);
      const snapshot = await state(saved);
      return { config: saved, created: setup.created, warnings: setup.warnings, ...snapshot };
    },

    'project/save': async (payload) => {
      const config = await configAccess.get();
      requireRepo(config);
      await ensureLayout(config);
      const record = isRecord(payload) ? payload : {};
      const id = asId(record.id);
      const file = id === null ? null : projectFile(config, id);
      const existing = file === null ? null : await readJson(file);
      const project = desiredProject(record, existing);
      const parentId = asId(record.parentId);
      if (parentId !== null) {
        const store = await readStore(config);
        const byId = new Map(store.projects.map((item) => [item.id, item]));
        if (byId.get(parentId) === undefined) throw new Error('父项目不存在或已被删除');
        // Nesting is capped at two levels: only top-level projects may be parents.
        if ((byId.get(parentId).parentId ?? null) !== null) throw new Error('子项目下面不能再添加子项目');
        if (id !== null && parentId === id) throw new Error('项目不能成为自己的父项目');
        if (id !== null) {
          // A top-level project with children of its own cannot be demoted:
          // its children would end up on a third level.
          if (asId(existing?.parentId) === null && store.projects.some((item) => item.parentId === id)) {
            throw new Error('该项目下还有子项目，不能把它变成子项目');
          }
          const seen = new Set([id]);
          let cursor = byId.get(parentId);
          while (cursor !== undefined) {
            if (seen.has(cursor.id)) throw new Error('不能把项目移动到它自己的子项目下');
            seen.add(cursor.id);
            cursor = cursor.parentId === null ? undefined : byId.get(cursor.parentId);
          }
        }
      }
      await writeJson(projectFile(config, project.id), project);
      const commit = await commitAll(config, `${existing === null ? '新增' : '更新'}项目：${project.name}`);
      return { id: project.id, committed: commit.committed, commit: commit.hash ?? null, commitNote: commit.reason ?? null };
    },

    'project/delete': async (payload) => {
      const config = await configAccess.get();
      requireRepo(config);
      const id = asId(isRecord(payload) ? payload.id : null);
      if (id === null) throw new Error('缺少项目 id');
      const store = await readStore(config);
      const target = store.projects.find((item) => item.id === id);
      if (target === undefined) throw new Error('项目不存在或已删除');

      // The project subtree goes with it: every descendant project file is
      // removed. Deleting a project must not delete the work inside it: tasks
      // of every removed project become unclassified instead, which is
      // recoverable by hand from the repository.
      const toDelete = new Set([id]);
      const stack = [id];
      while (stack.length > 0) {
        const currentId = stack.pop();
        for (const item of store.projects) {
          if (item.parentId === currentId && !toDelete.has(item.id)) {
            toDelete.add(item.id);
            stack.push(item.id);
          }
        }
      }
      for (const deletedId of toDelete) await fs.rm(projectFile(config, deletedId), { force: true });

      let moved = 0;
      for (const task of store.tasks) {
        if (task.projectId === null || !toDelete.has(task.projectId)) continue;
        await writeJson(taskFile(config, task.id), { ...task, projectId: null, updatedAt: timestamp() });
        moved += 1;
      }
      const name = asText(target.name, 200) || '未命名项目';
      const commit = await commitAll(config, `删除项目：${name}`);
      return { moved, committed: commit.committed, commit: commit.hash ?? null, commitNote: commit.reason ?? null };
    },

    'task/save': async (payload) => {
      const config = await configAccess.get();
      requireRepo(config);
      await ensureLayout(config);
      const record = isRecord(payload) ? payload : {};
      const id = asId(record.id);
      const file = id === null ? null : taskFile(config, id);
      const existing = file === null ? null : await readJson(file);
      const task = desiredTask(record, existing);

      if (task.projectId !== null && !(await exists(projectFile(config, task.projectId)))) task.projectId = null;
      await writeJson(taskFile(config, task.id), task);

      const done = task.subtasks.filter((subtask) => subtask.done).length;
      const progress = task.subtasks.length > 0 ? `（子任务 ${done}/${task.subtasks.length}）` : '';
      const commit = await commitAll(config, `${existing === null ? '新增' : '更新'}任务：${task.title.trim() || '未命名'}${progress}`);
      return { task, committed: commit.committed, commit: commit.hash ?? null, commitNote: commit.reason ?? null };
    },

    'task/delete': async (payload) => {
      const config = await configAccess.get();
      requireRepo(config);
      const id = asId(isRecord(payload) ? payload.id : null);
      if (id === null) throw new Error('缺少任务 id');
      const file = taskFile(config, id);
      const existing = await readJson(file);
      if (existing === null) throw new Error('任务不存在或已删除');
      await fs.rm(file, { force: true });
      const commit = await commitAll(config, `删除任务：${asText(existing.title, 200).trim() || '未命名'}`);
      return { committed: commit.committed, commit: commit.hash ?? null, commitNote: commit.reason ?? null };
    },

    'task/subtask': async (payload) => {
      const config = await configAccess.get();
      requireRepo(config);
      const record = isRecord(payload) ? payload : {};
      const taskId = asId(record.taskId);
      const subtaskId = asId(record.subtaskId);
      if (taskId === null || subtaskId === null) throw new Error('缺少任务或子任务 id');
      const file = taskFile(config, taskId);
      const existing = await readJson(file);
      if (existing === null) throw new Error('任务不存在或已删除');
      const task = normalizeTask(existing, taskId);
      const subtask = task.subtasks.find((item) => item.id === subtaskId);
      if (subtask === undefined) throw new Error('子任务不存在');
      subtask.done = typeof record.done === 'boolean' ? record.done : !subtask.done;
      task.updatedAt = timestamp();
      await writeJson(file, task);
      const commit = await commitAll(config, `子任务${subtask.done ? '完成' : '重开'}：${subtask.title.trim() || '未命名'}`);
      return { task, committed: commit.committed, commit: commit.hash ?? null, commitNote: commit.reason ?? null };
    },

    'git/status': async () => ({ git: await gitStatus(await configAccess.get()) }),

    'git/push': async () => {
      const config = await configAccess.get();
      requireRepo(config);
      await ensureLayout(config);
      const staged = await commitAll(config, '待办清单：推送前自动提交');
      const args = config.remote === '' ? ['push'] : ['push', '-u', config.remoteName, config.branch];
      const result = await runGit(config, args);
      const text = output(result);
      return {
        ok: result.code === 0,
        output: text,
        hint: result.code === 0 ? null : hintFor(text),
        autoCommit: staged,
        git: await gitStatus(config),
      };
    },

    'git/pull': async () => {
      const config = await configAccess.get();
      requireRepo(config);
      const target = config.remote === '' ? [] : [config.remoteName, config.branch];
      let result = await runGit(config, ['pull', '--rebase', '--autostash', ...target]);
      // A repository this plugin just initialized has no common ancestor with a remote
      // that already holds commits (e.g. the README created on GitHub). Rebase refuses
      // unrelated histories, so fall back to an explicit merge that accepts them.
      if (result.code !== 0 && /refusing to merge unrelated histories/i.test(output(result))) {
        result = await runGit(config, ['pull', '--no-rebase', '--no-edit', '--allow-unrelated-histories', '--autostash', ...target]);
      }
      const text = output(result);
      return {
        ok: result.code === 0,
        output: text,
        hint: result.code === 0 ? null : hintFor(text),
        git: await gitStatus(config),
      };
    },
  };
}

// --- transport -------------------------------------------------------------

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

async function readBody(request) {
  const text = await request.text();
  if (text.trim() === '') return {};
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('请求体不是合法 JSON');
  }
  if (!isRecord(parsed)) throw new Error('请求体必须是 JSON 对象');
  return parsed;
}

// Exact Fetch route per action. `ctx.connection.rpc.handle` is broken in this build
// (it throws "cannot get property webServer without inject"), so the action name lives
// in the path; what reaches this handler has already passed the Host/Origin fence and
// browser authentication, so no per-request authorization is needed here.
function createRoute(action, run) {
  return {
    path: `/api${CHANNEL}/${action}`,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      try {
        const payload = await readBody(request);
        const value = await run(payload);
        return jsonResponse({ ok: true, value });
      } catch (error) {
        return jsonResponse({ ok: false, error: { code: `dsh-todo/${action}`, message: describe(error) } }, 500);
      }
    },
  };
}

export async function apply(ctx, config) {
  const actions = createActions(createConfigAccess(config));
  for (const [action, run] of Object.entries(actions)) {
    ctx.connection.fetch.register(createRoute(action, run));
  }
}
