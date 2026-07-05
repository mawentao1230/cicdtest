# DDS / SOME/IP 接口兼容性审查

## DDS 接口变更检查

### 向后兼容变更（绿色）
- 新增 Topic（不影响现有）
- 新增 optional field
- 新增枚举值（接收方未处理则忽略）
- 扩展数组长度限制

### 不兼容变更（红色 - 需阻拦）
- 删除 / 重命名字段
- 修改字段类型
- 修改字段顺序
- 修改 Topic 名称
- 删除枚举值
- 修改 QoS 策略（RELIABILITY / DURABILITY）

### 需人工确认变更（黄色）
- 从 optional 改为 required
- 修改默认值
- 缩小数组长度限制
- 新增 required field（需确认所有订阅者已更新）

## SOME/IP 接口变更检查

| 变更类型 | 影响 | 处理方式 |
|---------|------|---------|
| 新增 Method | 无 | 自动接受 |
| 删除 Method | 破坏性 | 拒绝 |
| 修改 Method 签名 | 破坏性 | 拒绝 |
| 新增 Event | 无 | 自动接受（需确认订阅关系）|
| 删除 Event | 破坏性 | 拒绝 |
| 新增 Field | 无 | 自动接受 |
| 删除 Field | 破坏性 | 拒绝 |
| 修改 Field 类型 | 破坏性 | 拒绝 |

## IDL 文件审查要点

```
// DDS IDL 示例
module cockpit {
  struct VehicleSpeed {
    double speed;           // m/s
    long timestamp;         // ms
  };
  #pragma keylist VehicleSpeed timestamp
};
```

检查清单：
1. `#pragma keylist` 是否正确标识了 key 字段
2. 所有单位是否在注释中标注
3. timestamp 字段是否存在且类型正确
4. 嵌套结构体的内存对齐是否合理（避免 padding 问题）

## SOME/IP IDL 审查要点

```
// SOME/IP ARXML 示例
<SOMEIP-METHOD UUID="xxx">
  <SHORT-NAME>SetClimateTemp</SHORT-NAME>
  <MAJOR-VERSION>1</MAJOR-VERSION>
  <MINOR-VERSION>0</MINOR-VERSION>
</SOMEIP-METHOD>
```

检查清单：
1. Major/Minor 版本号变更是否符合语义化版本规范
2. Service ID / Method ID 是否与现有注册表冲突
3. 新增 Method 的 timeout 是否合理（一般 2000-5000ms）
4. 接口描述文件是否同步更新了文档

## 审查命令

当检查接口兼容性时：
1. 对比基线分支的 IDL/ARXML 文件
2. 识别所有变更点并分类（绿色/黄色/红色）
3. 对红色变更，标注具体影响范围（哪些订阅者/消费者受影响）
4. 生成接口兼容性报告
