# Smart Cockpit CI/CD Pipeline

> 基于 OpenCode + OMO 的智能座舱 CI/CD 流水线，实现 AI 驱动的代码审查、构建分析、自动决策与合并。

## 项目概览

| 项目 | 值 |
|------|-----|
| 仓库 | `github.com/mawentao1230/cicdtest` |
| 默认分支 | `cicd_main` |
| AI 引擎 | OpenCode CLI + DeepSeek V4 Flash-Free |
| Agent 框架 | OMO (Oh My OpenAgent) |
| CI 平台 | GitHub Actions |

---

## 架构图

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Smart Cockpit CI Pipeline                         │
│                          (ci.yml)                                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  触发条件: push | pull_request (opened, synchronize, reopened)       │
│                                                                       │
│  ┌─────────────────┐                                                 │
│  │ Stage 1: Lint   │  cppcheck + Android Lint                       │
│  │ (always runs)   │  输出: lint-combined.log, status=failure/success│
│  └────────┬────────┘                                                 │
│           │                                                           │
│     ┌─────┴─────┐                                                    │
│     ▼           ▼                                                    │
│  ┌──────────┐ ┌──────────┐                                          │
│  │ Stage 2  │ │ Stage 3  │  Gradle / Make 并行构建                   │
│  │ Android  │ │ Make     │  输出: build-*.log, status=failure/success│
│  └────┬─────┘ └────┬─────┘                                          │
│       └──────┬─────┘                                                 │
│              ▼                                                       │
│  ┌─────────────────┐                                                 │
│  │ Stage 4: Test   │  单元测试 (gradle test / make test)             │
│  │ (needs 2+3)     │  输出: test.log, status, summary                │
│  └────────┬────────┘                                                 │
│           │                                                           │
│           ▼                                                           │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ Stage 5: AI Gate (needs 1+2+3+4, if: always())               │    │
│  │                                                                │    │
│  │  ┌─ ① Collect artifacts ──────────────────────────────────┐  │    │
│  │  │  lint.log, build-android.log, build-make.log, test.log  │  │    │
│  │  │  results.env (状态变量)                                  │  │    │
│  │  └─────────────────────────────────────────────────────────┘  │    │
│  │                           │                                    │    │
│  │                           ▼                                    │    │
│  │  ┌─ ② Install OpenCode ──────────────────────────────────┐   │    │
│  │  │  curl -fsSL https://opencode.ai/install | bash         │   │    │
│  │  └─────────────────────────────────────────────────────────┘  │    │
│  │                           │                                    │    │
│  │                           ▼                                    │    │
│  │  ┌─ ③ Run AI Gate ──────────────────────────────────────┐    │    │
│  │  │  opencode run -- "$(cat /tmp/ai-prompt.txt)"          │    │    │
│  │  │  → DeepSeek V4 Flash-Free 推理决策                     │    │    │
│  │  │  → 输出 JSON: {decision, confidence, reason, details} │    │    │
│  │  └───────────────────────────────────────────────────────┘    │    │
│  │                           │                                    │    │
│  │                           ▼                                    │    │
│  │  ┌─ ④ Parse Decision ───────────────────────────────────┐    │    │
│  │  │  提取 JSON → GITHUB_OUTPUT decision=PASS|FAIL|RETRY   │    │    │
│  │  └───────────────────────────────────────────────────────┘    │    │
│  │                           │                                    │    │
│  │                           ▼                                    │    │
│  │  ┌─ ⑤ Execute Decision ────────────────────────────────┐    │    │
│  │  │  node execute-decision/index.js                      │    │    │
│  │  │                                                       │    │    │
│  │  │  PASS  → PR Comment ✅ + Label "ai-passed" + Auto Merge│   │    │
│  │  │  RETRY → PR Comment 🔄 + Label "ai-retry" + 自动修复  │    │    │
│  │  │  FAIL  → PR Comment ❌ + Label "ai-failed" + 通知      │    │    │
│  │  └───────────────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                           │                                           │
│                           ▼                                           │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ Stage 6: Auto Merge (条件触发)                               │    │
│  │  if: decision == "PASS" → gh pr merge --squash --auto        │    │
│  │  if: push event (no PR)  → 优雅跳过                           │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│                   CI Pipeline Optimization                             │
│                 (schedule-optimize.yml)                                │
├──────────────────────────────────────────────────────────────────────┤
│  触发条件: 每周日 03:00 UTC | workflow_dispatch (手动)               │
│                                                                       │
│  ┌─ ① Collect CI Metrics ───────────────────────────────────────┐   │
│  │  gh run list → ci-metrics.json (最近 100 次运行)              │   │
│  │  gh run list → build-trend.json (最近 50 次 PR 构建)          │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                           │                                           │
│                           ▼                                           │
│  ┌─ ② AI Analysis ──────────────────────────────────────────────┐   │
│  │  opencode run → 分析构建趋势、失败模式、并行度、成本          │   │
│  │               → optimization-plan.md                          │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                           │                                           │
│                           ▼                                           │
│  ┌─ ③ Create Optimization PR (条件) ────────────────────────────┐   │
│  │  if optimization-plan.md exists                               │   │
│  │    → git branch → commit → push → gh pr create               │   │
│  │  else → "No optimization needed, pipeline is healthy."        │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 文件结构

```
.
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                       # 主流水线 (6 jobs, 266 行)
│   │   └── schedule-optimize.yml        # 周度优化 (1 job, 83 行)
│   └── actions/
│       └── execute-decision/
│           └── index.js                 # 决策执行器 (149 行)
├── .opencode/
│   ├── opencode.jsonc                   # OpenCode 配置 (MCP Servers)
│   ├── oh-my-openagent.jsonc            # 10 个 Agent + 4 个类别
│   └── skills/cockpit-ci/               # 领域技能定义
│       ├── compile-check.md
│       ├── misra-check.md
│       └── dds-check.md
├── mcp-servers/
│   ├── build-server/index.js            # 构建分析 MCP (184 行)
│   └── notify-server/index.js           # 邮件通知 MCP (183 行)
├── dummy.cpp                            # 测试源码
├── setup-secrets.js                     # Secrets 初始化
├── package.json
└── PROJECT.md                           # 本文档
```

---

## 流水线详解

### ci.yml — 6 阶段主流水线

| 阶段 | Job ID | 职责 | 触发条件 |
|------|--------|------|----------|
| 1 | `lint` | Static Analysis (cppcheck + Android Lint) | always |
| 2 | `build-android` | Gradle 构建 | needs lint |
| 3 | `build-make` | Make/CMake 构建 | needs lint |
| 4 | `test` | 单元测试 | needs build-android + build-make |
| 5 | `ai-gate` | AI 决策 | needs all, `if: always()` |
| 6 | `merge` | 自动合并 | needs ai-gate, decision==PASS |

**AI Decision JSON 格式:**
```json
{
  "decision": "PASS",
  "confidence": 0.95,
  "reason": "全部检查通过",
  "details": {
    "lint": "success",
    "buildAndroid": "success",
    "buildMake": "success",
    "test": "success"
  },
  "failures": [],
  "retry_jobs": []
}
```

**决策规则:**
- 全部通过 → `PASS` → 自动合并
- Lint 失败且为误报 (无 C++ 源码) → `PASS`
- 编译失败可自动修复 → `RETRY`
- 编译失败无法修复 / 测试真失败 → `FAIL`

### schedule-optimize.yml — 周度优化

| 步骤 | 职责 |
|------|------|
| 1. Collect CI Metrics | 收集 100 次构建 + 50 次 PR 数据 |
| 2. AI Analysis | 分析趋势/瓶颈/并行度/成本 |
| 3. Create PR | 有优化建议时自动创建 PR |

---

## MCP Servers

### build-server (构建分析)
| 工具 | 功能 |
|------|------|
| `analyze_build_log` | 解析编译日志，提取错误文件/行号，支持 Android 和 GNU 格式 |
| `trigger_build` | 触发远程编译任务 |
| `get_build_diff` | 对比两次构建的错误/警告增量 |

### notify-server (邮件通知)
| 工具 | 功能 |
|------|------|
| `send_email` | 发送 HTML 邮件 (163 SMTP) |
| `send_pr_summary` | 生成并发送 PR 审查报告 HTML 邮件 |

---

## GitHub Secrets

| Secret | 用途 |
|--------|------|
| `OPENCODE_AUTH_JSON` | OpenCode AI 认证凭据 |
| `GH_TOKEN` | GitHub CLI 操作 (PR 评论/合并) |
| `EMAIL_HOST` | SMTP 服务器 (smtp.163.com) |
| `EMAIL_PORT` | SMTP 端口 (587) |
| `EMAIL_USER` | 发件邮箱 |
| `EMAIL_PASS` | SMTP 授权码 |
| `EMAIL_TO` | 收件邮箱 |

---

## 调试修复记录

| # | 症状 | 根因 | 修复 |
|---|------|------|------|
| 1 | Workflow 显示 0 jobs | YAML heredoc `PROMPT_EOF` 缩进为 0 列，导致 `run: \|` 块提前结束 | heredoc body/EOF 统一 10 空格缩进 |
| 2 | Push 事件不触发 | 文件丢失 `push:` 触发器 | 添加 `push:` 至 `on:` |
| 3 | AI Gate 被跳过 | 前置 job skip 导致 needs 级联跳过 | 添加 `if: always()` |
| 4 | opencode 退出 1 (帮助) | `--config` / `-m` 不被 `opencode run` 支持 | 移除参数，用默认配置 |
| 5 | AI JSON 解析失败 | AI 输出带尾逗号 `},` | 解析前 `.replace(/,\s*([\]}])/g, '$1')` |
| 6 | 正则匹配不完整 | 非贪心 `.*?` 只匹配内层 `}` | `indexOf('{')` + `lastIndexOf('}')` |
| 7 | Auto Merge push 失败 | push 事件无 PR → `gh pr merge null` 报错 | null 检测，跳过 |
| 8 | Collect Metrics 失败 | `gh run list --json duration` 是无效字段 | 替换为 `createdAt,status` |
| 9 | Create PR 步骤失败 | `--body "$(cat ...)"` shell 注入 + `set -e` | `set +e` + `--body-file` + `exit 0` |

---

## 关键设计决策

1. **Heredoc 缩进**: YAML `|` 字面块要求所有内容行缩进 ≥ 首行缩进。heredoc 终止符和 body 必须与 `run: |` 块内容同缩进级别。YAML 去除公共缩进后 shell 才能正确识别 EOF。

2. **AI Gate 独立性**: 使用 `if: always()` 确保 AI Gate 无论前置 job 成功/失败/跳过都执行，因为 AI 需要完整的上下文来做决策。

3. **Push 事件兼容**: `push:` 触发覆盖 push 场景；merge job 在无 PR 时优雅跳过而非报错。

4. **AI 输出容错**: 不假设 AI 输出完美 JSON，用 `indexOf/lastIndexOf` 提取边界 + 尾逗号清理 + try/catch 降级。

5. **非交互模式**: `opencode run` 默认非交互，无 `--auto` 时 AI 无法调用工具。prompt 设计为纯推理任务（只输出 JSON），不要求 AI 执行命令。
