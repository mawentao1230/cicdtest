# Smart Cockpit CI/CD Pipeline

> 基于 OpenCode + OMO 的智能座舱 CI/CD 流水线，AI 驱动的代码审查、多平台构建、自动决策与合并。

## 项目概览

| 项目 | 值 |
|------|-----|
| 仓库 | `github.com/mawentao1230/cicdtest` |
| 默认分支 | `cicd_main`（已开启分支保护） |
| 触发方式 | **仅 PR**（push 到 cicd_main 被禁止） |
| AI 引擎 | OpenCode CLI + DeepSeek V4 Flash-Free |
| Agent 框架 | OMO (Oh My OpenAgent) — 10 个 Agent + 4 个审查类别 |
| CI 平台 | GitHub Actions (ubuntu-latest) |
| 构建系统 | Gradle 8.4 + Make + CMake 3.22 |
| 语言 | C++17, Kotlin 1.9, Java 17 |

---

## 架构图

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Smart Cockpit CI Pipeline (ci.yml)                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  触发: pull_request → cicd_main / develop / release/*                │
│                                                                       │
│  ┌──────────────────┐                                                │
│  │ Stage 1: Lint    │  cppcheck + Android Lint                       │
│  │                  │  输出: lint-combined.log                        │
│  └────────┬─────────┘                                                │
│           │                                                           │
│     ┌─────┴─────┐                                                    │
│     ▼           ▼                                                    │
│  ┌──────────┐ ┌──────────┐  Gradle / Make 并行构建                   │
│  │ Stage 2  │ │ Stage 3  │  输出: build-*.log                         │
│  │ Android  │ │ Make     │  (根据项目文件自动跳过不适用项)            │
│  └────┬─────┘ └────┬─────┘                                           │
│       └──────┬─────┘                                                  │
│              ▼                                                        │
│  ┌──────────────────┐                                                │
│  │ Stage 4: Test    │  JUnit 4 单元测试                               │
│  │                  │  输出: test.log, summary                        │
│  └────────┬─────────┘                                                │
│           │                                                           │
│           ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Stage 5: AI Gate (needs all, if: always())                       │ │
│  │                                                                   │ │
│  │  ① Collect Artifacts — lint + build + test logs                  │ │
│  │  ② Generate Code Diff — git diff (排除 .github/ .opencode/)     │ │
│  │  ③ Install OpenCode — curl https://opencode.ai/install | bash   │ │
│  │  ④ Run AI Gate — opencode run --auto -- "$(prompt)"              │ │
│  │     ├─ 代码审查 (按 .opencode/REVIEW.md 规范)                    │ │
│  │     ├─ 流水线结果分析                                            │ │
│  │     └─ 输出 JSON 决策                                            │ │
│  │  ⑤ Parse Decision — 提取 JSON → GITHUB_OUTPUT                   │ │
│  │  ⑥ Execute Decision — node execute-decision/index.js             │ │
│  │     ├─ PASS   → PR 评论 + 标签 + Auto Merge                     │ │
│  │     ├─ RETRY  → PR 评论 + 标签 + 邮件(预留) + 等待确认          │ │
│  │     └─ FAIL   → PR 评论 + 标签 + 邮件(预留) + 等待介入          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│           │                                                           │
│           ▼                                                           │
│  ┌──────────────────┐                                                │
│  │ Stage 6: Merge   │  条件触发 (decision == PASS)                   │
│  │                  │  gh pr merge --squash --auto                   │
│  └──────────────────┘                                                │
└──────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│               CI Pipeline Optimization (schedule-optimize.yml)        │
├──────────────────────────────────────────────────────────────────────┤
│  触发: schedule (每周日 03:00 UTC) | workflow_dispatch (手动)        │
│                                                                       │
│  ① Collect CI Metrics — gh run list → ci-metrics.json + trend.json  │
│  ② AI Analysis — opencode run → 分析趋势/瓶颈/成本                   │
│  ③ Create PR — 有建议时自动提交优化 PR                               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 文件结构

```
.
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                        # 主流水线 (321 行, 6 jobs)
│   │   └── schedule-optimize.yml         # 周度优化 (83 行, 1 job)
│   └── actions/
│       └── execute-decision/
│           └── index.js                  # 决策执行器 (邮件/评论/标签/合并)
├── .opencode/
│   ├── opencode.jsonc                    # OpenCode 配置 (MCP + 模型)
│   ├── oh-my-openagent.jsonc             # 10 Agent + 4 审查类别
│   ├── REVIEW.md                         # 代码审查规范 (86 行)
│   └── skills/cockpit-ci/                # 领域技能
│       ├── compile-check.md
│       ├── misra-check.md
│       └── dds-check.md
├── app/
│   ├── build.gradle                      # Android 应用构建配置
│   ├── lint.xml                          # Android Lint 规则
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml
│       │   ├── cpp/                      # C++ JNI 原生库
│       │   │   ├── sensor-interface.h
│       │   │   ├── native-lib.cpp
│       │   │   └── CMakeLists.txt
│       │   ├── java/com/cockpit/
│       │   │   ├── dashboard/
│       │   │   │   ├── DashboardActivity.kt
│       │   │   │   └── SensorManager.java
│       │   │   └── utils/
│       │   │       └── LogUtils.kt
│       │   └── res/
│       └── test/java/com/cockpit/dashboard/
│           ├── SensorManagerTest.java    # 10 个 JUnit 测试
│           └── LogUtilsTest.kt           # 7 个 Kotlin 测试
├── mcp-servers/
│   ├── build-server/index.js             # 构建日志分析
│   └── notify-server/index.js            # 邮件通知服务
├── build.gradle                          # Gradle 根配置
├── settings.gradle
├── gradle.properties
├── gradle/wrapper/gradle-wrapper.properties
├── Makefile                              # C++ 原生库 Make 构建
├── package.json                          # Node.js 依赖
├── setup-secrets.js                      # GitHub Secrets 配置工具
├── README.md
└── PROJECT.md                            # 本文档
```

---

## 流水线详解

### ci.yml — 6 阶段主流水线

| 阶段 | Job ID | 职责 | 依赖 |
|------|--------|------|------|
| 1 | `lint` | cppcheck + Android Lint | — |
| 2 | `build-android` | Gradle assembleDebug | lint |
| 3 | `build-make` | Make g++ 编译 C++ 库 | lint |
| 4 | `test` | JUnit 单元测试 (17 cases) | build-android + build-make |
| 5 | `ai-gate` | AI 审查 + 决策 | all, `if: always()` |
| 6 | `merge` | Auto Merge | ai-gate, `decision==PASS` |

### 决策 JSON 格式

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
  "reviewSummary": "代码审查未发现严重问题",
  "reviewScore": 92,
  "findings": [
    { "file": "path/to/file", "line": 42, "level": "SUGGESTION", "category": "Code Style", "message": "..." }
  ],
  "failures": [],
  "retry_jobs": []
}
```

### 决策规则

| 条件 | 决策 | 行为 |
|------|------|------|
| 全部通过 + 无 P0/P1 发现 | `PASS` | 评论 + 标签 `ai-passed` + **自动合并** |
| P0/BLOCKER 发现 | `FAIL` | 评论 + 标签 `ai-failed` + 邮件(预留) + 等待介入 |
| P1/CRITICAL 发现 | `FAIL` | 同上 |
| 编译失败可自动修复 | `RETRY` | 评论 + 标签 `ai-retry` + 邮件(预留) + **等待确认** |
| 测试真失败 (非 flaky) | `FAIL` | 同上 |

### 代码审查规范 (REVIEW.md)

| 级别 | 标签 | 影响 |
|------|------|------|
| P0 | BLOCKER | 编译失败/崩溃/安全漏洞 → FAIL |
| P1 | CRITICAL | 内存泄露/数据竞争/空指针 → FAIL |
| P2 | WARNING | 代码质量/可维护性 → PASS (记录) |
| P3 | SUGGESTION | 风格建议 → PASS (忽略) |

审查维度：C++ (MISRA 子集) / Java-Kotlin / 通用 / 智能座舱特定

---

## MCP Servers

### build-server (构建分析)

| 工具 | 功能 |
|------|------|
| `analyze_build_log` | 解析 Android/GNU 编译日志，提取错误文件/行号，按文件分组 |
| `trigger_build` | 触发远程编译任务 |
| `get_build_diff` | 对比两次构建的错误/警告增量，输出退化/改善/持平判断 |

### notify-server (邮件通知)

| 工具 | 功能 |
|------|------|
| `send_email` | 发送 HTML 邮件 (163/QQ/Gmail SMTP) |
| `send_pr_summary` | 生成并发送 PR 审查报告 HTML 邮件 |

---

## OpenCode 配置

### Agent 列表 (oh-my-openagent.jsonc)

| Agent | 模型 | 职责 |
|-------|------|------|
| `sisyphus` | deepseek-v4-flash-free | CI/CD 总协调 |
| `oracle` | kimi-k2.5-free | 架构审查 (AUTOSAR/DDS) |
| `momus` | minimax-m2.1-free | 代码质量审查 (MISRA) |
| `hephaestus` | deepseek-v4-flash-free | 自动修复 |
| `prometheus` | deepseek-v4-flash-free | 流水线规划优化 |
| `explore` | gpt-5-nano | 快速探索/flaky 判断 |
| `librarian` | big-pickle | 代码历史研究 |
| `atlas` | deepseek-v4-flash-free | 任务跟踪 |
| `metis` | kimi-k2.5-free | 差距分析 |
| `multimodal-looker` | nemotron-3-super-free | 可视化分析 |

### 审查类别

| 类别 | 模型 | 用途 |
|------|------|------|
| `cockpit-review` | kimi-k2.5-free | AUTOSAR/DDS/HAL 接口审查 |
| `build-analyze` | deepseek-v4-flash-free | 编译错误根因分析 |
| `code-quality` | minimax-m2.1-free | MISRA/安全漏洞检查 |
| `flaky-detect` | gpt-5-nano | Flaky test 判断 |

---

## GitHub Secrets 配置

### 必需

| Secret | 用途 | 备注 |
|--------|------|------|
| `OPENCODE_AUTH_JSON` | OpenCode AI 认证凭据 | **必需** |
| `GH_TOKEN` | GitHub CLI 操作 (PR 评论/合并/创建) | **必需**，需 `repo` + `workflow` 权限 |

### 邮件通知（可选，预留）

| Secret | 163 邮箱示例 | QQ 邮箱示例 | Gmail 示例 |
|--------|-------------|------------|------------|
| `EMAIL_HOST` | `smtp.163.com` | `smtp.qq.com` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` | `587` | `587` |
| `EMAIL_USER` | `user@163.com` | `user@qq.com` | `user@gmail.com` |
| `EMAIL_PASS` | 授权码（非登录密码） | 授权码（非 QQ 密码） | App Password |
| `EMAIL_TO` | 团队@公司.com | 同上 | 同上 |

> **重要**：所有邮箱提供商要求使用**授权码**而非登录密码。不配置上述 5 个 Secret 则邮件功能静默跳过，不影响流水线。

### 授权码获取

- **163**：登录 → 设置 → POP3/SMTP/IMAP → 开启 → 生成授权码
- **QQ**：登录 → 设置 → 账户 → POP3/SMTP 服务 → 生成授权码
- **Gmail**：Google 账户 → 安全性 → 两步验证 → App Passwords
- **企业微信**：管理员后台 → 应用管理 → 邮箱 → 客户端专用密码

### 使用 setup-secrets.js 批量配置

```bash
node setup-secrets.js
```

---

## 仓库配置要求

### 必需设置

| 设置 | 值 | 路径 |
|------|-----|------|
| 默认分支 | `cicd_main` | Settings → General → Default branch |
| Auto-merge | 开启 | Settings → General → Pull Requests → Allow auto-merge |
| Branch protection | 开启 | Settings → Branches → Add rule → `cicd_main` |
| └ Required checks | `Smart Cockpit CI Pipeline` | （仅 PR 触发流水线，禁止直接 push） |
| 仓库可见性 | **公开** | 免费版分支保护需公开仓库 |

### 通知配置（可选）

| 设置 | 用途 |
|------|------|
| GitHub Actions 权限 | Settings → Actions → General → Allow all actions |
| Secrets | Settings → Secrets and variables → Actions（配置上表 Secrets） |

---

## 使用指南

### 触发规则

```
事件            目标分支              触发?
────────────────────────────────────────────
push            cicd_main             ❌ (被分支保护拦截)
push            其他分支               ❌ (ci.yml 不监听 push)
PR 创建/更新     cicd_main             ✅
PR 创建/更新     develop               ✅
PR 创建/更新     release/*             ✅
workflow_dispatch  (手动)              ✅ (schedule-optimize)
schedule         每周日 03:00 UTC     ✅ (schedule-optimize)
```

### 开发流程

```bash
# 1. 创建 feature 分支
git checkout -b feature/xxx

# 2. 开发 + 提交
git add . && git commit -m "feat: xxx"

# 3. 推送分支
git push origin feature/xxx

# 4. 创建 PR (target: cicd_main)
gh pr create --title "feat: xxx" --body "..." --base cicd_main

# 5. 等待 CI 完成
#    → AI Gate 审查代码 diff
#    → PASS 时自动合并
#    → FAIL/RETRY 时查看评论，修复后再次推送
```

### 手动触发周度优化

```
GitHub Actions → CI Pipeline Optimization → Run workflow → Branch: cicd_main
```

### 查看 AI 审查结果

```
GitHub Actions → 最新 run → AI Gate job → Run AI Gate (review + decide) → 展开日志
或直接查看 PR 评论
```

---

## 适配真实项目

将测试仓库替换为真实智能座舱代码库后，流水线自动适配：

| 条件 | 行为 |
|------|------|
| 有 `gradlew` | Android Gradle 构建运行 |
| 无 `gradlew` | 自动跳过 Android 构建 |
| 有 `Makefile` | Make g++ 编译运行 |
| 有 `CMakeLists.txt` (根目录) | CMake 编译运行 |
| 两者都无 | 自动跳过 Make 构建 |
| 有 `.cpp/.h` 文件 | cppcheck 正常运行 |
| 无 C++ 源码 | cppcheck 退出 1 (正常，AI Gate 判定为误报) |

> **注意**：cppcheck 在无 C++ 源码时退出码为 1，AI Gate 会识别为误报并仍给 PASS。

---

## 邮件通知流程

```
PR 创建 → CI 完成
       │
       ├── PASS:   PR 评论 → 提交者 GitHub 通知 ✅
       │           自动合并 ✅
       │
       └── FAIL / RETRY:
              ├── PR 评论 → 提交者 GitHub 通知 ✅
              └── 邮件   → EMAIL_TO (团队/负责人) 收到详情 ✅
```

> **注意**：邮件发给 `EMAIL_TO`（固定收件人），而非提交者本人。GitHub API 不暴露用户邮箱。提交者通过 GitHub 评论通知即可获知结果。

---

## 关键设计决策

| # | 决策 | 原因 |
|---|------|------|
| 1 | **Heredoc 缩进必须 ≥ 首行** | YAML `\|` 块按缩进判定边界，EOF 在 0 列会提前结束块 |
| 2 | **AI Gate 用 `if: always()`** | 前置 job skip 不会级联跳过 AI 审查 |
| 3 | **仅 PR 触发** | 配合分支保护，杜绝未经审查的代码直接合入 |
| 4 | **直接嵌入 `${{ needs... }}` 而非 sed** | 消除 shell 注入和 sed 分隔符冲突 |
| 5 | **`indexOf/lastIndexOf` 提取 JSON** | 比正则更可靠，不依赖 AI 输出格式 |
| 6 | **尾逗号清理** | AI 常输出非标准 JSON（尾逗号），解析前自动修复 |
| 7 | **`--auto` 标志** | opencode 非交互模式需 `--auto` 才能读取文件和输出 |
| 8 | **GITHUB_OUTPUT 多行用 heredoc** | 含空格的值必须用 `<<EOF` 格式 |
| 9 | **Gradle 版本固定 8.4** | AGP 8.1.0 兼容 Gradle 8.0-8.4，避免默认版本不匹配 |
| 10 | **RETRY/FAIL 不自动修复** | 安全问题需人工确认，AI 只做分析和建议 |
| 11 | **代码 diff 限制 8KB** | 避免 token 浪费，超长 diff 截断 |

---

## 已知注意事项

### YAML 缩进陷阱

```yaml
# ❌ 错误: PROMPT_EOF 在 0 列 → YAML 提前结束 run: | 块
run: |
  cat > file <<'EOF'
content
EOF          # ← 这是致命的

# ✅ 正确: PROMPT_EOF 与内容同缩进级别
run: |
  cat > file <<'PROMPT_EOF'
  content     # ← 所有行 ≥ 2 空格
  PROMPT_EOF  # ← 与内容对齐
```

### Gradle 版本兼容

| AGP 版本 | 最低 Gradle | 状态 |
|----------|------------|------|
| 8.1.0 | 8.0 | ✅ 当前使用 `gradle-version: '8.4'` |
| 8.2.x | 8.2 | 可用 |
| 8.3.x | 8.4 | 可用 |

### Token 使用

| 阶段 | 估用 Token | 说明 |
|------|-----------|------|
| AI 代码审查 | ~2000-4000 | diff 8KB + prompt 模板 |
| AI 决策 | ~200-500 | 结果分析 + JSON 输出 |

### 故障排查

| 症状 | 检查 |
|------|------|
| workflow 显示 0 jobs | YAML 缩进错误 — 检查 heredoc EOF 位置 |
| AI Gate 显示帮助后退出 | `--config` 或 `-m` 参数多余 — 已移除 |
| opencode 超时 | 检查 `--auto` 标志是否存在 |
| AI JSON 解析失败 | AI 输出可能带尾逗号或额外文本 — 自动修复已内置 |
| Auto Merge 失败 401 | `GH_TOKEN` secret 过期 — 重新生成 PAT |
| Auto Merge 失败 "auto merge not allowed" | 仓库设置未开启 — Settings → Allow auto-merge |
| 直接 push cicd_main 被拒 | 分支保护生效 — 正常，必须走 PR |
| schedule-optimize PR 创建失败 | 仓库未开启 auto-merge 或 token 权限不足 |
| cppcheck exit 1 但实际无问题 | 项目无 .cpp 文件 — AI Gate 会判定为误报 |
| Gradle build 失败 "module() not found" | Gradle 版本不匹配 — 固定到 8.4 |

---

## 项目统计

| 指标 | 数量 |
|------|------|
| Workflow 文件 | 2 |
| Job 总数 | 7 (ci:6 + schedule:1) |
| 源代码文件 | 8 (Kotlin×3, Java×2, C++×3) |
| 测试用例 | 17 (JUnit×10 + Kotlin×7) |
| Agent | 10 |
| 审查类别 | 4 |
| MCP Server | 2 |
| GitHub Secrets | 7 (2 必需 + 5 可选) |
