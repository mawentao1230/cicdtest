# Smart Cockpit CI/CD

AI 驱动的智能座舱 CI/CD 流水线 — 自动代码审查、多平台构建、决策与合并。

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/mawentao1230/cicdtest.git
cd cicdtest

# 2. 配置 GitHub Secrets (Settings → Secrets → Actions)
#    - OPENCODE_AUTH_JSON  (必需)
#    - GH_TOKEN            (必需, repo + workflow 权限)

# 3. 创建 feature 分支
git checkout -b feature/my-change

# 4. 开发 + 推送
git add . && git commit -m "feat: xxx"
git push origin feature/my-change

# 5. 创建 PR (target: cicd_main)
gh pr create --base cicd_main --title "feat: xxx"
```

PR 创建后，CI 自动运行 → AI 审查代码 + 分析结果 → PASS 后自动合并。

> **注意**：直接 push 到 cicd_main 会被分支保护拒绝，必须通过 PR。

## 流水线

```
PR → cicd_main
  │
  ├── Static Analysis  (cppcheck + Android Lint)
  ├── Build Android    (Gradle)
  ├── Build Make       (g++ C++)
  ├── Run Tests        (JUnit × 17)
  ├── AI Gate          (审查 diff + 决策)
  └── Auto Merge       (PASS 时自动合并)
```

## 决策规则

| 结果 | 行为 |
|------|------|
| ✅ PASS | 评论 + 自动合并 |
| 🔄 RETRY | 评论 + 等待确认 (不自动修复) |
| ❌ FAIL | 评论 + 等待人工介入 |

## 邮件通知 (可选)

在 GitHub Secrets 中配置 `EMAIL_HOST/PORT/USER/PASS/TO` 即可激活。不配置则静默跳过。

## 适配你的项目

流水线自动检测项目结构：

- 有 `gradlew` → Android 构建运行
- 有 `Makefile` → Make 编译运行
- 有 `.cpp/.h` → cppcheck 运行
- 都没有 → 对应阶段自动跳过

## 文档

- [完整架构文档](PROJECT.md) — 架构图、配置详解、故障排查
- [代码审查规范](.opencode/REVIEW.md) — P0-P3 级别、C++/Java/Kotlin/座舱审查维度
