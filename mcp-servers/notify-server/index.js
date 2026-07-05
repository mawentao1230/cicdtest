import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import nodemailer from "nodemailer";

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.example.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || "",
      pass: process.env.EMAIL_PASS || ""
    }
  });
}

const server = new Server(
  { name: "cockpit-notify-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "send_email",
      description: "发送审查报告到指定邮箱",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "string", description: "收件人邮箱" },
          subject: { type: "string", description: "邮件主题" },
          body: { type: "string", description: "邮件正文（HTML）" },
          cc: { type: "string", description: "抄送" }
        },
        required: ["to", "subject", "body"]
      }
    },
    {
      name: "send_pr_summary",
      description: "发送 PR 变更摘要通知",
      inputSchema: {
        type: "object",
        properties: {
          prNumber: { type: "number", description: "PR 编号" },
          prTitle: { type: "string", description: "PR 标题" },
          author: { type: "string", description: "PR 作者" },
          status: {
            type: "string",
            enum: ["passed", "failed", "needs_review"],
            description: "审查状态"
          },
          summary: { type: "string", description: "审查摘要" },
          reviewers: {
            type: "array",
            items: { type: "string" },
            description: "评审人列表"
          }
        },
        required: ["prNumber", "prTitle", "author", "status", "summary"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "send_email": {
      const { to, subject, body, cc } = args;
      const transporter = getTransporter();

      const mailOptions = {
        from: `"Smart Cockpit CI" <${process.env.EMAIL_USER}>`,
        to,
        subject: `[智能座舱 CI] ${subject}`,
        html: body,
        cc: cc || undefined
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "sent",
              messageId: info.messageId,
              to,
              subject
            }, null, 2)
          }]
        };
      } catch (err) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "failed",
              error: err.message
            }, null, 2)
          }],
          isError: true
        };
      }
    }

    case "send_pr_summary": {
      const { prNumber, prTitle, author, status, summary, reviewers } = args;

      const statusLabels = {
        passed: '<span style="color:#2e7d32;font-weight:bold">✅ 通过</span>',
        failed: '<span style="color:#c62828;font-weight:bold">❌ 失败</span>',
        needs_review: '<span style="color:#f57c00;font-weight:bold">⏳ 需审查</span>'
      };

      const htmlBody = `
        <h2>智能座舱 CI/CD 审查报告</h2>
        <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">PR 编号</td>
              <td style="padding:8px;border:1px solid #ddd;">#${prNumber}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">标题</td>
              <td style="padding:8px;border:1px solid #ddd;">${prTitle}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">作者</td>
              <td style="padding:8px;border:1px solid #ddd;">${author}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">状态</td>
              <td style="padding:8px;border:1px solid #ddd;">${statusLabels[status] || status}</td></tr>
        </table>
        <h3>审查摘要</h3>
        <pre style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap;">${summary}</pre>
        <hr>
        <p style="color:#888;font-size:12px;">由 OpenCode + OMO 自动生成</p>
      `;

      const transporter = getTransporter();
      const to = process.env.EMAIL_TO || "";
      const subject = `[PR #${prNumber}] ${prTitle} - ${status === "passed" ? "通过" : status === "failed" ? "失败" : "需审查"}`;

      try {
        const info = await transporter.sendMail({
          from: `"Smart Cockpit CI" <${process.env.EMAIL_USER}>`,
          to,
          subject,
          html: htmlBody
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "sent",
              messageId: info.messageId,
              to,
              subject,
              cc: reviewers?.join(", ") || ""
            }, null, 2)
          }]
        };
      } catch (err) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "failed",
              error: err.message
            }, null, 2)
          }],
          isError: true
        };
      }
    }

    default:
      throw new Error(`未知工具: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
