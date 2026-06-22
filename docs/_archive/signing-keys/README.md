# 签名密钥说明

> ⚠️ **安全警告**：私钥文件 (`*.key`) 永远不要上传到 GitHub 或其他公开仓库！

---

## 当前版本：v5

### 文件清单

| 文件 | 说明 |
|------|------|
| `signing-keys-v5.key` | **私钥**（base64 编码，用于 `TAURI_SIGNING_PRIVATE_KEY` 环境变量） |
| `signing-keys-v5.key.pub` | **公钥**（base64 编码，用于 `tauri.conf.json` 的 `plugins.updater.pubkey`） |

---

## 公钥值（用于 `tauri.conf.json`）

```
7kkVR42Iv3rD3Eo2xLe+0sHw/ZDCd367NXgq0FKx/WM=
```

在 `src-tauri/tauri.conf.json` 中配置：

```json
{
  "plugins": {
    "updater": {
      "pubkey": "7kkVR42Iv3rD3Eo2xLe+0sHw/ZDCd367NXgq0FKx/WM="
    }
  }
}
```

---

## 私钥值（用于发布时的环境变量）

```
NUaDp2M6y0EgEPlcnsglEZ1Y+oIPeaYsXqgVvhNEZKc=
```

发布构建时，在 CI/CD 或本地环境中设置：

```bash
# Windows (PowerShell)
$env:TAURI_SIGNING_PRIVATE_KEY="NUaDp2M6y0EgEPlcnsglEZ1Y+oIPeaYsXqgVvhNEZKc="

# Windows (Git Bash)
export TAURI_SIGNING_PRIVATE_KEY="NUaDp2M6y0EgEPlcnsglEZ1Y+oIPeaYsXqgVvhNEZKc="

# Linux / macOS
export TAURI_SIGNING_PRIVATE_KEY="NUaDp2M6y0EgEPlcnsglEZ1Y+oIPeaYsXqgVvhNEZKc="
```

---

## 使用方法

### 1. 本地构建并签名

```bash
cd D:\AIKFCC\Storyloom

# 设置环境变量（Windows Git Bash）
export TAURI_SIGNING_PRIVATE_KEY=$(cat docs/_archive/signing-keys/signing-keys-v5.key)

# 构建
npm run build && npm run build:server && npm run build:sidecar && npm run tauri:build

# 检查签名文件
ls src-tauri/target/release/bundle/nsis/*.sig
```

### 2. GitHub Actions 自动发布

在 GitHub Actions 工作流中设置 Secret：

- **Secret 名称**：`TAURI_SIGNING_PRIVATE_KEY`
- **Secret 值**：`NUaDp2M6y0EgEPlcnsglEZ1Y+oIPeaYsXqgVvhNEZKc=`

### 3. 更新发布元数据

构建完成后，将 `latest.json` 和 `.sig` 签名文件一并上传到 GitHub Release：

```
latest.json
Storyloom Setup 1.X.X.exe
Storyloom Setup 1.X.X.exe.sig
```

---

## 历史密钥（归档）

- `signing-keys-v4.*` — 旧版本（已废弃）
- `signing-keys-v3.*` — 旧版本（已废弃）
- `signing-keys-v2.*` — 旧版本（已废弃）

---

*最后更新：2026-06-22（v5 密钥对重新生成）*
