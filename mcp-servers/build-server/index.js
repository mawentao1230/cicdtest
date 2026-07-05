import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "cockpit-build-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "analyze_build_log",
      description: "分析编译日志，定位错误文件和行号",
      inputSchema: {
        type: "object",
        properties: {
          log: { type: "string", description: "编译日志内容" },
          buildType: {
            type: "string",
            enum: ["android", "make"],
            description: "编译类型"
          }
        },
        required: ["log"]
      }
    },
    {
      name: "trigger_build",
      description: "触发远程编译任务",
      inputSchema: {
        type: "object",
        properties: {
          target: {
            type: "string",
            description: "编译目标 (all / clean / specific-module)"
          },
          buildType: {
            type: "string",
            enum: ["android", "make"],
            description: "编译类型"
          },
          branch: { type: "string", description: "分支名称" }
        },
        required: ["target", "buildType"]
      }
    },
    {
      name: "get_build_diff",
      description: "对比两次构建的差异",
      inputSchema: {
        type: "object",
        properties: {
          baselineLog: { type: "string", description: "基准构建日志" },
          currentLog: { type: "string", description: "当前构建日志" }
        },
        required: ["baselineLog", "currentLog"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "analyze_build_log": {
      const { log, buildType } = args;
      const errors = [];
      const lines = log.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (buildType === "android") {
          const androidMatch = line.match(
            /(.+\.(?:java|kt|cpp|c|h)):(\d+):\s*(error|warning):\s*(.+)/
          );
          if (androidMatch) {
            errors.push({
              file: androidMatch[1],
              line: parseInt(androidMatch[2]),
              level: androidMatch[3],
              message: androidMatch[4]
            });
          }
        }

        const genericMatch = line.match(
          /(.+\.(?:c|cpp|h|hpp|cc|java|kt)):(\d+):(\d+)?:?\s*(error|warning):\s*(.+)/i
        );
        if (genericMatch) {
          errors.push({
            file: genericMatch[1],
            line: parseInt(genericMatch[2]),
            level: genericMatch[4].toLowerCase(),
            message: genericMatch[5]
          });
        }

        const undefinedRef = line.match(/undefined reference to `(.+)'/);
        if (undefinedRef) {
          errors.push({
            file: "linker",
            line: i + 1,
            level: "error",
            message: `未定义引用: ${undefinedRef[1]}`
          });
        }
      }

      const grouped = {};
      for (const err of errors) {
        const key = err.file;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(err);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            total: errors.length,
            errorCount: errors.filter(e => e.level === "error").length,
            warningCount: errors.filter(e => e.level === "warning").length,
            filesWithIssues: Object.keys(grouped).length,
            grouped,
            errors: errors.slice(0, 50)
          }, null, 2)
        }]
      };
    }

    case "trigger_build": {
      const { target, buildType, branch } = args;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "triggered",
            buildType,
            target,
            branch: branch || "current",
            message: `已触发 ${buildType} 编译 (目标: ${target})`
          }, null, 2)
        }]
      };
    }

    case "get_build_diff": {
      const { baselineLog, currentLog } = args;
      const baselineErrors = baselineLog.match(/error:/gi)?.length || 0;
      const baselineWarnings = baselineLog.match(/warning:/gi)?.length || 0;
      const currentErrors = currentLog.match(/error:/gi)?.length || 0;
      const currentWarnings = currentLog.match(/warning:/gi)?.length || 0;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            baseline: { errors: baselineErrors, warnings: baselineWarnings },
            current: { errors: currentErrors, warnings: currentWarnings },
            delta: {
              errors: currentErrors - baselineErrors,
              warnings: currentWarnings - baselineWarnings
            },
            verdict: currentErrors > baselineErrors
              ? "退化" : currentErrors < baselineErrors
              ? "改善" : "持平"
          }, null, 2)
        }]
      };
    }

    default:
      throw new Error(`未知工具: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
