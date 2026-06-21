## 诊断报告

### 已发现的问题

1. **pub_date 问题** ✅ 需要修复
   - 用户提供的 `latest.json` 中 `pub_date` 为 `"2026-06-21T14:14:59.060Z"`。
   - 当前时间: 2026-06-21T22:56:18Z。虽然现在是过去，但毫秒时间戳 `.060Z` 格式在某些旧版本 Tauri 解析器中存在兼容性问题，可能导致解析失败。建议改为标准 ISO 8601 格式（不带毫秒）。
   - 同时，该日期是今天刚生成的，如果测试时系统时间稍有偏差，会被视为未来日期。建议改为今天稍早的时间（如 12:00）。

2. **endpoints URL 问题** ✅ 需要修复
   - 当前使用 `https://github.com/YJLZSL/Storyloom/releases/latest/download/latest.json`
   - GitHub 的 `/latest/download/` 端点受 API 速率限制（每小时 60 次未认证请求），且在中国大陆等网络环境下可能不稳定。
   - **建议**：改用带版本号的直接下载 URL，并添加 fallback endpoint。

3. **签名格式问题** ⚠️ 高度可疑
   - `tauri.conf.json` 中的 `pubkey` 与 `signing-keys-v3.key.pub` 的公钥 **完全匹配** ✅
   - 但用户提供的 `latest.json` 中的 `signature` 与项目根目录下 `latest.json`（1.4.0）中的签名格式 **完全不同** ❌
     - 1.4.0 签名长度: ~188 字符，以 `RUR` 开头（标准 minisign 格式）
     - 用户提供的 1.5.0 签名长度: ~116 字符，以 `+` 开头（非标准格式）
   - **结论**：用户提供的 `signature` 很可能不是用 `signing-keys-v3.key` 正确生成的。需要重新生成。

4. **latest.json 路径问题** ✅ 需要修复
   - `src-tauri/target/release/bundle/nsis/latest.json` 不存在，需要创建。
   - 项目根目录下的 `latest.json` 版本为 1.4.0，是旧版本，需要更新为 1.5.0。

5. **UpdateNotifier.tsx 错误处理** ✅ 建议改进
   - `case 'error'` 完全静默，没有任何日志或提示，导致更新失败时无法调试。
   - 建议添加 `console.error` 日志，便于排查问题。

### 修复后的文件

见 `latest.json` 和 `tauri.conf.json` 的修改。

### 签名重新生成命令（用户必须执行）

由于 `signature` 字段明显不正确，用户需要重新生成签名：

```bash
# 使用 Tauri 2.x 的 sign 命令
cd D:/AIKFCC/Storyloom/src-tauri
tauri sign --private-key signing-keys-v3.key --bundle target/release/bundle/nsis/Storyloom_1.5.0_x64-setup.exe

# 生成的 .sig 文件内容应放入 latest.json 的 signature 字段
# 或者使用 tauri updater 的自动生成命令
tauri updater sign --private-key signing-keys-v3.key --bundle target/release/bundle/nsis/Storyloom_1.5.0_x64-setup.exe
```

生成的 `.sig` 文件内容（包含 `untrusted comment:` 和 `trusted comment:` 行）应完整放入 `signature` 字段。

标准 minisign 签名格式示例：
```
untrusted comment: signature from minisign secret key
RUR6wkYowoZ2UnBgfrykIAAosVShlGCvFpuxOY0cQ+SxPBYbJc1VmRxvvN3ivp1SHRPFKdVJjEJlftt8I2AX7rlmendw6c9u5AnueCSycSMmRF/DW9lryij3EcbJI74uA5vKMlBxoWa+HkuOlp9oGKIohNGIN5Dt/Rbm9r4V8j9AAochzOq14oNI
trusted comment: timestamp:1687355957	file:Storyloom_1.5.0_x64-setup.exe	hashed
...
```

