# 智能座舱编译错误检查

## Android (Gradle) 编译常见错误

| 错误模式 | 可能原因 | 修复策略 |
|---------|---------|---------|
| `AAPT: error: resource style/xxx not found` | 资源文件缺失或引用错误 | 检查 res/ 目录和依赖库版本 |
| `cannot find symbol` | 类/方法不存在或未导入 | 检查 import 和依赖配置 |
| `AndroidManifest.xml: error: uses-sdk:minSdkVersion` | SDK 版本冲突 | 统一各模块的 compileSdk/minSdk |
| `NDK resolution outcome: Project :xxx` | NDK 路径或版本问题 | 检查 local.properties 和 CMakeLists |
| `Duplicate class xxx found in modules` | 依赖库冲突 | 添加 exclude 规则或统一版本 |

## Make 编译常见错误

| 错误模式 | 可能原因 | 修复策略 |
|---------|---------|---------|
| `No rule to make target 'xxx', needed by 'yyy'` | 文件缺失或路径不对 | 检查 Makefile 中的源文件路径 |
| `undefined reference to` | 链接时符号未找到 | 检查库链接顺序和 -l 参数 |
| `multiple definition of` | 符号重复定义 | 检查头文件中的变量定义（用 extern） |
| `implicit declaration of function` | 函数未声明 | 添加正确的头文件包含 |
| `dereferencing pointer to incomplete type` | 结构体定义不可见 | 检查类型定义的头文件是否包含 |
| `fatal error: xxx.h: No such file or directory` | 头文件路径错误 | 检查 -I 包含路径是否正确 |

## 系统性编译问题诊断流程

1. 先检查 first error（后续错误往往是由第一个错误级联导致）
2. 确认错误类型：语法错误 / 语义错误 / 链接错误
3. 展开头文件宏定义，确认预处理后的代码
4. 对比前后两次 PR 的 diff，聚焦变更文件

## 座舱项目特有规则

- Android HAL 层的 .aidl 接口变更需要同步更新 CPP 实现
- DDS idl 文件变更后必须重新生成绑定代码
- 所有新增模块必须在顶层 CMakeLists.txt 和 Android.bp 中注册
- 跨模块依赖变更需要更新 BUILD.gn / Android.bp 的 deps 字段
