const fs = require("fs");
const { execSync } = require("child_process");

// ─── Email notification (reserved) ──────────────────────────
// 激活方式: 在 GitHub Secrets 中添加:
//   EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_TO
// 不配置则自动跳过, 仅输出日志

function emailEnabled() {
  return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_TO);
}

async function sendEmailNotification(subject, htmlBody) {
  if (!emailEnabled()) {
    console.log("Email notification skipped (EMAIL_HOST not configured)");
    return;
  }
  try {
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: `"Smart Cockpit CI" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject,
      html: htmlBody,
    });
    console.log("Email sent to " + process.env.EMAIL_TO);
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
}

function buildEmailBody(decision, prInfo) {
  const labels = { PASS: "通过", RETRY: "需重试", FAIL: "未通过" };
  const result = labels[decision.decision] || decision.decision;

  let h = `<h2>AI Gate Decision: ${result}</h2>`;
  h += `<table style="border-collapse:collapse;font-family:monospace;">`;
  h += `<tr><td style="padding:6px;border:1px solid #ddd;font-weight:bold">PR</td><td style="padding:6px;border:1px solid #ddd"><a href="https://github.com/mawentao1230/cicdtest/pull/${prInfo.number}">#${prInfo.number} ${prInfo.title}</a></td></tr>`;
  h += `<tr><td style="padding:6px;border:1px solid #ddd;font-weight:bold">提交者</td><td style="padding:6px;border:1px solid #ddd">@${prInfo.author}</td></tr>`;
  h += `<tr><td style="padding:6px;border:1px solid #ddd;font-weight:bold">决策</td><td style="padding:6px;border:1px solid #ddd;color:${decision.decision === 'PASS' ? '#2e7d32' : '#c62828'}">${decision.decision}</td></tr>`;
  h += `<tr><td style="padding:6px;border:1px solid #ddd;font-weight:bold">置信度</td><td style="padding:6px;border:1px solid #ddd">${((decision.confidence||0)*100).toFixed(0)}%</td></tr>`;
  if (decision.reviewScore != null) {
    h += `<tr><td style="padding:6px;border:1px solid #ddd;font-weight:bold">审查评分</td><td style="padding:6px;border:1px solid #ddd">${decision.reviewScore}/100</td></tr>`;
  }
  h += `</table>`;

  h += `<h3>Reason</h3><p>${decision.reason}</p>`;

  const findings = decision.findings || [];
  if (findings.length > 0) {
    h += `<h3>Findings (${findings.length})</h3><ul>`;
    for (const f of findings) {
      h += `<li><b>[${f.level}]</b> ${f.file}:${f.line} — ${f.message}</li>`;
    }
    h += `</ul>`;
  }

  if (decision.reviewSummary) {
    h += `<h3>Review Summary</h3><pre style="background:#f5f5f5;padding:8px;white-space:pre-wrap">${decision.reviewSummary}</pre>`;
  }

  if (decision.decision === "RETRY") {
    h += `<p style="color:#e65100">⚠️ 等待人工确认: AI 已分析但不自动修复，请确认后处理。</p>`;
  }
  if (decision.decision === "FAIL") {
    h += `<p style="color:#c62828">🚫 需要人工介入: 请审查 findings 后修复代码。</p>`;
  }

  h += `<hr><p style="color:#888;font-size:12px">OpenCode + OMO | ${new Date().toISOString()}</p>`;
  return h;
}

function loadDecisionFromOutput(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) {
    throw new Error("无法从 AI 输出中提取决策 JSON");
  }
  const clean = raw.slice(a, b + 1).replace(/,\s*([\]}])/g, "$1");
  return JSON.parse(clean);
}

function getPRInfo() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    return { number: null, title: "Unknown", author: "Unknown" };
  }
  const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
  return {
    number: event.pull_request?.number || null,
    title: event.pull_request?.title || "Unknown",
    author: event.pull_request?.user?.login || "Unknown",
  };
}

function postPRComment(prNumber, body) {
  if (!prNumber || !process.env.GH_TOKEN) {
    console.log("Skip PR comment (no PR number or token)");
    return;
  }
  const tmpFile = `pr-comment-${Date.now()}.md`;
  try {
    fs.writeFileSync(tmpFile, body, "utf8");
    execSync(
      `gh pr comment "${prNumber}" --body-file "${tmpFile}"`,
      { env: { ...process.env }, stdio: "pipe" }
    );
    console.log(`PR #${prNumber} comment posted`);
  } catch (err) {
    console.error("PR comment failed:", err.message);
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

function addPRLabel(prNumber, label) {
  if (!prNumber) return;
  try {
    execSync(`gh pr edit "${prNumber}" --add-label "${label}"`, {
      env: { ...process.env }, stdio: "pipe"
    });
  } catch {}
}

function mergePR(prNumber) {
  if (!prNumber) return;
  try {
    execSync(`gh pr merge "${prNumber}" --squash --auto`, {
      env: { ...process.env }, stdio: "pipe"
    });
    console.log(`PR #${prNumber} merged`);
  } catch (err) {
    console.error("Auto merge failed:", err.message);
  }
}

function formatComment(decision) {
  const emoji = { PASS: "✅", RETRY: "🔄", FAIL: "❌" };
  const text = {
    PASS: "全部通过，准备自动合并",
    RETRY: "需重试（AI 将尝试修复）",
    FAIL: "未通过，需人工介入",
  };

  let c = `## 🤖 AI Gate Review Result\n\n`;
  c += `**Decision**: ${emoji[decision.decision] || "❓"} **${decision.decision}** — ${text[decision.decision] || ""}\n\n`;
  c += `**Confidence**: ${((decision.confidence || 0) * 100).toFixed(0)}%`;

  if (decision.reviewScore != null) {
    const bar = decision.reviewScore >= 90 ? "🟢" : decision.reviewScore >= 70 ? "🟡" : "🔴";
    c += ` | **Review Score**: ${bar} ${decision.reviewScore}/100`;
  }
  c += `\n\n**Reason**: ${decision.reason}\n\n`;

  c += `### Stage Status\n| Stage | Status |\n|-------|--------|\n`;
  for (const [k, v] of Object.entries(decision.details || {})) {
    const icon = v === "success" ? "✅" : v === "failure" ? "❌" : "⏳";
    c += `| ${k} | ${icon} ${v} |\n`;
  }

  const findings = decision.findings || [];
  if (findings.length > 0) {
    const levels = { BLOCKER: "❌", CRITICAL: "🔴", WARNING: "⚠️", SUGGESTION: "💡" };
    c += `\n### Code Review Findings (${findings.length})\n`;
    c += `| Level | Category | File:Line | Message |\n`;
    c += `|-------|----------|-----------|--------|\n`;
    for (const f of findings) {
      c += `| ${levels[f.level] || "❓"} ${f.level} | ${f.category || "-"} | \`${f.file}:${f.line}\` | ${f.message} |\n`;
    }
  }

  if (decision.reviewSummary) {
    c += `\n### Review Summary\n${decision.reviewSummary}\n`;
  }

  const failures = decision.failures || [];
  if (failures.length > 0) {
    c += `\n### Issues Found\n`;
    for (const f of failures) {
      c += `- **${f.stage || f.file}**: ${f.message}\n`;
    }
  }

  if (decision.decision === "RETRY" && decision.retry_jobs?.length > 0) {
    c += `\n### Retry Plan\nRetry: ${decision.retry_jobs.join(", ")}\n`;
  }

  if (decision.decision === "RETRY") {
    c += `\n> ⚠️ **等待确认**: AI 已分析问题但不自动修复。请确认后手动触发重新运行失败的 job，或推送修复提交。\n`;
  }
  if (decision.decision === "FAIL") {
    c += `\n> 🚫 **需要人工介入**: 检测到严重问题，AI 不会自动处理。请审查上方 findings 后手动修复并重新提交。\n`;
  }

  c += `\n---\n_Generated by OpenCode + OMO | ${new Date().toISOString()}_\n`;
  return c;
}

function main() {
  const filePath = process.argv[2] || "ai-output.log";

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const decision = loadDecisionFromOutput(filePath);
  const prInfo = getPRInfo();

  console.log(`Decision: ${decision.decision} (confidence: ${decision.confidence})`);
  console.log(`Reason: ${decision.reason}`);

  const comment = formatComment(decision);
  const emailBody = buildEmailBody(decision, prInfo);

  switch (decision.decision) {
    case "PASS":
      postPRComment(prInfo.number, comment);
      addPRLabel(prInfo.number, "ai-passed");
      mergePR(prInfo.number);
      break;
    case "RETRY":
      postPRComment(prInfo.number, comment);
      addPRLabel(prInfo.number, "ai-retry");
      for (const job of decision.retry_jobs || []) {
        console.log(`Retry job needed: ${job}`);
      }
      sendEmailNotification(
        `[PR #${prInfo.number}] AI Gate: RETRY — ${prInfo.title}`,
        emailBody
      );
      break;
    case "FAIL":
      postPRComment(prInfo.number, comment);
      addPRLabel(prInfo.number, "ai-failed");
      sendEmailNotification(
        `[PR #${prInfo.number}] AI Gate: FAIL — ${prInfo.title}`,
        emailBody
      );
      break;
    default:
      console.error(`Unknown decision: ${decision.decision}`);
      process.exit(1);
  }

  fs.writeFileSync("decision-result.json", JSON.stringify(decision, null, 2));
}

main();
