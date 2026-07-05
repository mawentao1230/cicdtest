# GitHub 仓库初始化指南

## 一、创建仓库

1. 在 GitHub 上创建新仓库 `smart-cockpit-ci`
2. 将本目录所有文件推送到仓库

## 二、配置 Repository Secrets

仓库 → Settings → Secrets and variables → Actions → New repository secret：

| Secret 名称 | 说明 | 获取方式 |
|------------|------|---------|
| `OPENCODE_AUTH_JSON` | OpenCode 认证 JSON | `opencode auth` 命令输出 |
| `GH_TOKEN` | GitHub Personal Access Token | GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)，权限: repo, workflow |
| `EMAIL_HOST` | SMTP 服务器地址 | 例如 `smtp.qq.com` |
| `EMAIL_PORT` | SMTP 端口 | 465(SSL) 或 587(TLS) |
| `EMAIL_USER` | SMTP 用户名 | 邮箱地址 |
| `EMAIL_PASS` | SMTP 密码或授权码 | 邮箱的 SMTP 授权码 |
| `EMAIL_TO` | 通知接收邮箱 | 审查报告发送目标 |

## 三、配置 Branch Protection

仓库 → Settings → Branches → Add rule：

- Branch name pattern: `main`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - `Smart Cockpit CI Pipeline / AI Gate`
- ✅ Require conversation resolution before merging

## 四、首次运行验证

```bash
git checkout -b test/ci-verify
echo "# Test PR" >> README.md
git add README.md
git commit -m "test: verify CI pipeline"
git push origin test/ci-verify
# 在 GitHub 上创建 PR → 观察 Actions 运行
```

## 五、本地 MCP 服务器测试

```bash
cd mcp-servers/build-server
npm install
cd ../notify-server
npm install
```
