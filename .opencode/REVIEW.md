# Smart Cockpit Code Review 规范

## 严重级别定义

| 级别 | 标签 | 说明 | 决策影响 |
|------|------|------|----------|
| P0 | `BLOCKER` | 必须修复，否则导致编译失败、崩溃、安全漏洞 | → FAIL |
| P1 | `CRITICAL` | 高风险缺陷，内存泄露、数据竞争、API 不兼容 | → FAIL |
| P2 | `WARNING` | 代码质量、可维护性问题 | → PASS (记录) |
| P3 | `SUGGESTION` | 风格建议、更好的实现方式 | → PASS (忽略) |

## 审查维度

### 1. C++ 代码 (MISRA 子集)

| 检查项 | 级别 | 说明 |
|--------|------|------|
| 裸指针未检查 | P1 | `new`/`malloc` 后未检查 `nullptr`；指针解引用前未判空 |
| 数组越界风险 | P1 | 固定大小数组未做边界检查；`strcpy`/`sprintf` 用 `strncpy`/`snprintf` 替代 |
| 资源未释放 | P1 | 构造函数中分配资源，析构函数未释放；缺少 RAII 包装 |
| 整数溢出 | P2 | 未做溢出检查的算术运算；应使用 `std::numeric_limits` 检查 |
| 全局变量 | P2 | 命名空间内的非 const 全局变量 |
| 未使用头文件保护 | P0 | 缺少 `#ifndef` / `#pragma once` |
| 空 else | P2 | `if` 语句有空 `else` 分支或无意义的 else |
| 魔法数字 | P3 | 除 0/1/-1 外的字面常量，应提取为 constexpr |
| 递归风险 | P2 | 递归函数无深度限制 |

### 2. Java/Kotlin 代码

| 检查项 | 级别 | 说明 |
|--------|------|------|
| 空引用未处理 | P1 | public 方法未对参数做 null 检查 |
| 异常吞没 | P1 | `try { } catch(Exception e) { }` 空 catch |
| 资源泄露 | P1 | File/Stream/Cursor 未在 finally/try-with-resources 中关闭 |
| 线程安全 | P1 | 共享可变状态未加同步；非 volatile 的 double-checked locking |
| 硬编码凭据 | P0 | 代码中出现密码/Token/密钥 |
| 弃用 API | P2 | 使用 `@Deprecated` 的 API |

### 3. 通用检查

| 检查项 | 级别 | 说明 |
|--------|------|------|
| 日志泄露敏感信息 | P0 | 日志中打印密码/Token/个人隐私数据 |
| 重复代码 | P3 | 超过 15 行的重复代码块 |
| 函数过长 | P2 | 单函数超过 80 行，应拆分 |
| 文件过大 | P2 | 单文件超过 500 行 |
| 命名规范 | P3 | 不符合项目命名约定 (`camelCase` / `PascalCase` / `snake_case`) |

### 4. 智能座舱特定检查

| 检查项 | 级别 | 说明 |
|--------|------|------|
| 实时性破坏 | P1 | UI 线程执行 IO/网络操作；循环中无 yield 点 |
| CAN/DDS 协议兼容 | P1 | 修改了消息结构未更新序列化代码 |
| 硬件依赖 | P2 | 直接依赖特定硬件型号，应通过抽象层 |

## 审查输出格式

```json
{
  "decision": "PASS|FAIL",
  "confidence": 0.85,
  "reason": "决策摘要",
  "details": {
    "lint": "success",
    "buildAndroid": "success",
    "buildMake": "success",
    "test": "success"
  },
  "reviewSummary": "代码审查摘要，列出发现的问题",
  "reviewScore": 85,
  "findings": [
    { "file": "path/to/file", "line": 42, "level": "BLOCKER", "category": "Security", "message": "..." }
  ],
  "failures": [],
  "retry_jobs": []
}
```

## 决策规则 (完整版)

1. 任何 P0/BLOCKER 发现 → **FAIL**
2. 任何 P1/CRITICAL 发现 → **FAIL**
3. 仅有 P2/P3 发现 + 流水线全部通过 → **PASS** (附带 reviewSummary)
4. 编译失败且 AI 判断可自动修复 → **RETRY**
5. 测试真失败 (非 flaky) → **FAIL**
