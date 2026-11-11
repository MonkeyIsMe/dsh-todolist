# dsh-todolist · DSH 待办清单插件

DSH（DeepSeek Harness）插件 **`@local/dsh-todo` v1.4.5**：侧栏「待办清单」面板 —— 项目（两级）、任务、
子任务、优先级、截止时间（精确到分钟）+ **截止提醒**，数据以「一个项目/任务一个 JSON 文件」存在
**本地 git 仓库**里，通过 GitHub 远端在多台机器之间同步。

## 功能

| 能力 | 说明 |
|---|---|
| 项目 | 两级层级（子项目靠 `parentId`）；顶级项目与子项目都可归档字段（当前固定 false） |
| 任务 | 状态 `todo/doing/done`、优先级 1–4、标签（≤12）、备注 |
| 截止时间 | `YYYY-MM-DD`（纯日期，按当天 23:59 算）或 `YYYY-MM-DDTHH:mm`（本地时间，精确到分钟） |
| 子任务 | `{id,title,done,due,priority,order}`；子任务的 due 目前仍是**纯日期** |
| 截止提醒 | 截止前 1 小时未完成 → 面板顶部红色横幅（列出任务 + 剩余/逾期），进入提醒窗口瞬间播一声短音。**页面内提醒**：DSH 没开就不提醒，也没有系统通知；只有带时间的 due 参与 |
| 相对时间 | 任务行 chip 显示「距截止还有 42 分钟 / 已逾期 15 分钟」，每 30 秒刷新 |
| Git | 改动自动本地提交；面板上有**推送 / 拉取**按钮与工作区状态 |

## 数据布局（插件读写的全部内容）

仓库就是用户自己指定的一个 git 目录（每台机器路径**可以不同**）：

```
<repoDir>/
  todo/
    meta.json                  { "schema": 1, "createdAt": "<ISO>" }
    projects/<projectId>.json  一个项目一个文件
    tasks/<taskId>.json        一个任务一个文件
  todo-list.json               旧版(v1)数据，v1.1.3+ 完全忽略：保留、别改、别删
```

**项目字段**：`id`(≤64, `[A-Za-z0-9_-]`，即文件名)、`parentId`(string，缺省=顶级)、`name`(≤200)、
`color`(≤20, `#hex` 或 `''`)、`order`、`archived`、`createdAt`、`updatedAt`。

**任务字段**：`id`、`projectId`(string|null，可为子项目 id)、`title`(≤4000)、`notes`(≤20000)、
`status`、`priority`(1-4|null)、`due`(见上)、`order`、`tags`(≤12)、`subtasks[]`、
`createdAt`/`updatedAt`/`doneAt`。

**每机本地配置（不在仓库里）**：`~/.dsh-todo/config.json`
```json
{ "repoDir": "E:\\资料\\个人\\todolist", "remote": "https://github.com/MonkeyIsMe/MyTodoList.git",
  "branch": "main", "autoCommit": true, "remoteName": "origin" }
```

> 注：本仓库（`dsh-todolist`）装的是**插件源码**；上面那个 `MyTodoList` 才是**待办数据仓库**，两者不是一回事。

## Git 行为（准确描述，便于排障）

- 每次改动 → `git add -A` + `git commit`（信息形如「更新任务：xxx」）。
- **推送** = 先自动提交一次（「待办清单：推送前自动提交」）再 `git push -u origin main`。
- **拉取** = `git pull --rebase --autostash origin main`；
  遇到 `refusing to merge unrelated histories` 自动降级为
  `--no-rebase --no-edit --allow-unrelated-histories --autostash` 合并。
- 只碰 `main` 分支。

## 接口（跨端契约）

- 通道 `/dsh-todo`，每个动作一条精确 Fetch 路由：`POST /api/dsh-todo/<action>`。
- 动作：`state`（初始加载）、`config/save`、`project/save`、`project/delete`、
  `task/save`、`task/delete`、`task/subtask`、`git/status`、`git/push`、`git/pull`。
- 响应 `{ ok: true, ... }` / `{ ok: false, error: { code, message } }`；
  git 失败还带 `hint`（把 git 原始输出翻成人话）。
- 与 token 面板同样的坑：这个构建上 `ctx.connection.rpc.handle` 不可用
  （"cannot get property webServer without inject"），所以统一走 `connection.fetch.register`。

## 组件

```
package.json       name=@local/dsh-todo，dsh.client = { platform: 'web', immediately: true }
cordis.patch.yml   Loader 补丁：insert 一条 id=dsh-todo 的 bundle
host.js            入口 shim（静态 inject + `./impl.js?v=` 动态 import）
impl.js            Host 半边：任务存储 + 全部 git 操作（约 770 行）
client.js          Client 半边：面板与交互（约 2060 行）
locale/{zh,en}.json / icon.svg
```

配置刻意放在 `~/.dsh-todo/config.json` 而不是 bundle Config：仓库路径是**每台机器各写一次**的事实，
不该靠编辑 profile 来重设。

## 安装

1. 目录放固定路径（例如 `C:\Users\<用户名>\dsh-todo`）。
2. plugin_manager 先 `remove_bundle` 掉旧插件（`@local/todo-list` 和旧版 `@local/dsh-todo`），
   再 `install_bundle`，target 填目录绝对路径。
3. 打开面板 → 设置里填 **仓库路径**（本机 `E:\资料\个人\todolist`，他机随意）、
   **远端** `https://github.com/MonkeyIsMe/MyTodoList.git`、**分支** `main`、自动提交开启。
   保存后插件会 `git init` 并把分支设为 `main`。
4. **先点「拉取」再动手**。推送需要 GitHub HTTPS 凭据（Credential Manager 或 token）。

## 两台机器之间的安全规则

1. 固定顺序：**拉取 → 使用/修改 → 推送**。
2. 推送被拒（non-fast-forward）= 另一台先推了：先拉再推。
3. rebase 冲突时按提示手工解那个 JSON 文件，`git add` 后继续 rebase；解不了就先停手。
4. **版本要一致**：≤v1.1.0 不认识 `parentId`（保存项目会**丢字段**，层级变平）；
   ≤v1.1.4 不认识带时间的 `due`（保存任务会把 `YYYY-MM-DDTHH:mm` **截成日期**）。
   拉取永远安全，**写入不安全** —— 升级完成并验证前，别在旧版上编辑。
5. 两边的远端地址与分支必须一致。

## 换机器（另一台电脑）要注意的点

见 [ADAPT.md](./ADAPT.md)。
