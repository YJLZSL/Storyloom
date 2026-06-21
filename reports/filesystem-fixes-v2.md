# Storyloom 文件系统清理报告 v2

**执行时间**: 2026-06-21  
**依据**: `reports/filesystem-audit-v2.md`  
**执行者**: 文件系统清理员

---

## 1. 删除的文件/目录

| 文件/目录 | 操作 | 说明 |
|-----------|------|------|
| `plan.md` | ✅ 已删除 | 过期的 Sidecar Adapter 临时计划文件 |
| `plan-v1.3.md` | ✅ 已删除 | 过期的 v1.3.0 开发计划文件 |
| `sea-config.json` | ✅ 已删除 | 未被引用的 Node.js SEA 配置文件，项目使用 `pkg` 而非 SEA |
| `scripts/build-nsis.cjs` | ✅ 已删除 | Electron 时代遗留的 NSIS 构建脚本，项目已迁移至 Tauri，无引用需求 |
| `NVIDIA Corporation/` | ✅ 已删除 | 完全无关的系统驱动日志目录，被错误放入项目根目录 |
| `scripts/comprehensive_v1_0_0_test.py` | ⚠️ 无需操作 | 文件不存在，已被 `package.json` 引用但物理缺失 |
| `scripts/visual_browser_smoke.py` | ⚠️ 无需操作 | 文件不存在，已被 `package.json` 引用但物理缺失 |
| `scripts/capture_console.py` | ⚠️ 无需操作 | 文件不存在 |
| `scripts/capture_task2_screenshots.py` | ⚠️ 无需操作 | 文件不存在 |
| `scripts/debug_outline_edit.py` | ⚠️ 无需操作 | 文件不存在 |
| `scripts/inspect_db.js` | ⚠️ 无需操作 | 文件不存在 |
| `scripts/smoke_api_v1_0_1.mjs` | ⚠️ 无需操作 | 文件不存在 |
| `scripts/task8_browser_audit.py` | ⚠️ 无需操作 | 文件不存在 |
| `scripts/uiux_walkthrough_v1_0_1.py` | ⚠️ 无需操作 | 文件不存在 |
| `scripts/v1_0_0_regression.py` | ⚠️ 无需操作 | 文件不存在 |
| `scripts/v1_3_visual_regression.py` | ⚠️ 无需操作 | 文件不存在 |
| `scripts/v1_4_tdesign_regression.py` | ⚠️ 无需操作 | 文件不存在 |
| `scripts/v4_2_regression.py` | ⚠️ 无需操作 | 文件不存在 |

---

## 2. Git 跟踪移除

以下文件已从 Git 索引中移除（`git rm --cached`），同时已添加 `.gitignore` 规则防止再次跟踪：

| 文件 | Git 状态变更 | 说明 |
|------|-------------|------|
| `src-tauri/signing-keys.key` | ✅ 已取消跟踪 | 私钥文件，安全风险 |
| `src-tauri/signing-keys.key.pub` | ✅ 已取消跟踪 | 公钥文件，配对安全处理 |
| `src-tauri/sidecars/better_sqlite3.node` | ✅ 已取消跟踪 | 本地编译产物，应重新生成 |

> 注意：`release/` 和 `release-v1.2.1/` 在 `.gitignore` 中已有规则，未纳入 Git 跟踪，无需执行 `git rm --cached`。

---

## 3. `.gitignore` 更新

已在根目录 `.gitignore` 中添加以下规则：

| 规则 | 说明 |
|------|------|
| `src-tauri/signing-keys.key` | 私钥安全 |
| `src-tauri/signing-keys.key.pub` | 公钥安全 |
| `src-tauri/sidecars/*.node` | 本地编译 Node 原生模块 |
| `release-v1.2.1/` | 旧版本发布产物（`release/` 和 `release-*/` 已存在） |
| `NVIDIA Corporation/` | 系统目录 |
| `data/backups/` | 运行时自动备份（已存在，确认保留） |
| `plan*.md` | 过期计划文件 |
| `sea-config.json` | 未使用配置文件 |
| `reports/*-cleanup-done.md` | 清理标记文件 |
| `reports/*-scan.md` | 扫描报告 |
| `reports/*-audit-v2.md` | 审计报告 |

---

## 4. `package.json` scripts 清理

已移除引用不存在脚本文件的 broken script references：

| 被移除的 script | 原命令 | 说明 |
|----------------|--------|------|
| `test:e2e:chromium` | `python scripts/comprehensive_v1_0_0_test.py --browser=chromium` | 目标文件不存在 |
| `test:e2e:firefox` | `python scripts/comprehensive_v1_0_0_test.py --browser=firefox` | 目标文件不存在 |
| `test:e2e:webkit` | `python scripts/comprehensive_v1_0_0_test.py --browser=webkit` | 目标文件不存在 |
| `test:e2e:all` | `python scripts/comprehensive_v1_0_0_test.py --browser=all` | 目标文件不存在 |
| `test:visual` | `python scripts/visual_browser_smoke.py --headed` | 目标文件不存在 |

> 剩余 `scripts/` 中的实际文件：`build-release.bat`, `clean-release.ps1`, `cleanup_garbled_workspaces.js`, `frontend-audit.py`, `gen-latest-yml.cjs`, `generate-storyloom-icons.py`, `start-sidecar.js` 仍保留，需进一步评估是否集成到 `package.json` 或删除。

---

## 5. 磁盘空间释放

| 项目 | 估计大小 | 状态 |
|------|---------|------|
| `plan.md`, `plan-v1.3.md`, `sea-config.json` | ~7 KB | ✅ 已释放 |
| `NVIDIA Corporation/` | 空 | ✅ 已删除 |
| `scripts/build-nsis.cjs` | ~3 KB | ✅ 已释放 |
| `release/` | ~1.2 GB | 物理文件保留，未纳入 Git 跟踪 |
| `release-v1.2.1/` | ~689 MB | 物理文件保留，未纳入 Git 跟踪 |

---

## 6. Git 状态摘要

```
M  .gitignore
M  package.json
D  plan-v1.3.md
D  plan.md
D  scripts/build-nsis.cjs
D  sea-config.json
D  src-tauri/sidecars/better_sqlite3.node
D  src-tauri/signing-keys.key
D  src-tauri/signing-keys.key.pub
```

> `src-tauri/target/` 未受影响，已保留。其余 `M` 状态文件（`server/db/migrate.ts`, `server/routes/assets.ts` 等）为本次清理前的既有修改，未涉及。

---

*清理完毕。所有修改已记录，等待 `git commit` 确认。*
