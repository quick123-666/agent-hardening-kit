# Pi 扩展案例

本目录包含基于 agent-hardening-kit 理念的 Pi 扩展实现。

## 扩展列表

### pi-no-delete-db.ts

**禁止删除数据库硬约束**

基于 agent-hardening-kit 的安全约束经验，专门保护数据库不被误删除。

**保护对象**：
- SQL: DROP DATABASE / DROP SCHEMA / DROP TABLE / DROP INDEX / DELETE FROM / TRUNCATE
- Milvus: drop_collection / drop_database
- MongoDB: dropDatabase / .drop
- Redis: FLUSHALL / FLUSHDB
- 文件系统: rm 数据库文件 / rm -rf 数据库目录

**安装**：

```bash
# 复制到全局扩展目录
cp pi-no-delete-db.ts ~/.pi/agent/extensions/

# 加载扩展
pi -e ~/.pi/agent/extensions/pi-no-delete-db.ts
```

**使用**：

```bash
/no-delete-db status     # 查看状态
/no-delete-db list       # 列出禁用操作
/no-delete-db allow X    # 临时允许
/no-delete-db block X    # 重新禁止
/no-delete-db config     # 查看配置
```

**AI 工具**：
- `check_database_command` - 检查命令是否安全

**日志**：`~/.pi/agent/logs/no-delete-db.log`

## 设计原则

这些扩展遵循 agent-hardening-kit 的核心原则：

1. **零信任安全** - 默认拒绝
2. **Runtime 硬拦截** - 不依赖 LLM 自律
3. **可配置** - 根据场景调整
4. **完整日志** - 所有操作可追溯
5. **临时允许机制** - 平衡安全与灵活性
