"""
视觉 AI 真实浏览器点击测试脚本（v1.1.0+）

为下一位有视觉能力的 AI 准备：
- headed/headless 切换；headed 时可肉眼观察实际点击与渲染
- 真实点击关键按钮：创建工作区、切换视图、切换主题
- 每个关键步骤截图到 --shots-dir
- 出错时把当前 page.content() 写入 error-dump.html 便于排错

前置条件：
1. 运行 `npm run dev:server`（后端 3001）
2. 运行 `npm run dev:web`（前端 5173）
3. 运行 `pip install playwright && python -m playwright install chromium`

用法示例：
    python scripts/visual_browser_smoke.py --headed
    python scripts/visual_browser_smoke.py --browser firefox --shots-dir docs/screenshots/visual-ai-baseline
    python scripts/visual_browser_smoke.py --base-url http://localhost:5173 --headless
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SHOTS = REPO_ROOT / "docs" / "screenshots" / "visual-ai-baseline"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="视觉 AI 真实浏览器点击测试（headed 可肉眼观察）",
    )
    p.add_argument(
        "--browser", choices=["chromium", "firefox", "webkit"], default="chromium",
        help="使用哪个浏览器（默认 chromium）",
    )
    headmode = p.add_mutually_exclusive_group()
    headmode.add_argument("--headed", action="store_true", help="带 GUI 启动浏览器（默认）")
    headmode.add_argument("--headless", action="store_true", help="无头模式")
    p.add_argument("--base-url", default="http://localhost:5173", help="前端 URL")
    p.add_argument(
        "--shots-dir", default=str(DEFAULT_SHOTS),
        help="截图保存目录",
    )
    p.add_argument("--slow-mo", type=int, default=80, help="每次操作之间的延迟 ms（headed 默认 80）")
    p.add_argument("--workspace-name", default="视觉 AI 测试工作区",
                   help="测试时创建的工作区名称")
    return p.parse_args()


def shot(page, shots_dir: Path, idx: int, label: str) -> None:
    name = f"{idx:02d}-{label}.png"
    path = shots_dir / name
    page.screenshot(path=str(path), full_page=False)
    print(f"  [shot] {name}")


def click_first_visible(page, selectors: list[str], timeout: int = 4000) -> bool:
    """按顺序尝试一组选择器，命中第一个可见的就点击。返回是否成功。"""
    for sel in selectors:
        try:
            loc = page.locator(sel).first
            loc.wait_for(state="visible", timeout=timeout)
            loc.click()
            return True
        except Exception:
            continue
    return False


def run_flow(args: argparse.Namespace) -> int:
    from playwright.sync_api import sync_playwright

    shots_dir = Path(args.shots_dir)
    shots_dir.mkdir(parents=True, exist_ok=True)

    headless = bool(args.headless) and not args.headed
    if not args.headed and not args.headless:
        # 默认 headed，让视觉 AI 可以看到
        headless = False

    print(f"[smoke] browser={args.browser} headed={not headless} base={args.base_url} shots={shots_dir}")

    with sync_playwright() as p:
        bt = getattr(p, args.browser)
        browser = bt.launch(headless=headless, slow_mo=args.slow_mo)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="zh-CN")
        page = ctx.new_page()

        page.on("pageerror", lambda exc: print(f"  [pageerror] {exc}"))
        page.on("console", lambda msg: msg.type == "error" and print(f"  [console.error] {msg.text}"))

        try:
            print("[1] 打开首页")
            page.goto(args.base_url, wait_until="networkidle")
            page.wait_for_timeout(800)
            shot(page, shots_dir, 1, "home")

            print("[2] 创建工作区")
            opened = click_first_visible(page, [
                "text=创建第一个工作区",
                "text=新建工作区",
                "button:has-text(\"创建\")",
            ])
            if not opened:
                print("  [warn] 未找到创建工作区入口，可能已存在工作区")
            else:
                page.wait_for_timeout(500)
                # 找到第一个 input 写入名称
                inputs = page.locator("input[type='text']").all()
                if inputs:
                    inputs[0].fill(args.workspace_name)
                    shot(page, shots_dir, 2, "create-dialog-filled")
                # 提交
                submitted = click_first_visible(page, [
                    "button:has-text(\"创建\")",
                    "button:has-text(\"确定\")",
                    "button[type='submit']",
                ])
                if submitted:
                    page.wait_for_timeout(1500)

            print("[3] 进入工作区主界面")
            # 如果首页有卡片就点第一张进入
            try:
                cards = page.locator("[class*='cursor-pointer'][class*='rounded']").all()
                if cards:
                    cards[0].click()
                    page.wait_for_timeout(1200)
            except Exception:
                pass
            shot(page, shots_dir, 3, "workspace-main")

            print("[4] 切换视图")
            for idx, view in enumerate(["大纲", "时间轴"], start=4):
                try:
                    tab = page.get_by_role("tab", name=view).first
                    tab.click(timeout=3000)
                    page.wait_for_timeout(700)
                    shot(page, shots_dir, idx, f"view-{view}")
                except Exception:
                    try:
                        page.get_by_text(view, exact=False).first.click(timeout=3000)
                        page.wait_for_timeout(700)
                        shot(page, shots_dir, idx, f"view-{view}-fallback")
                    except Exception as e:
                        print(f"  [warn] 视图 {view} 未点中：{e}")

            print("[6] 切换主题")
            try:
                palette = page.locator(
                    "button[aria-label*='主题'], button:has(svg.lucide-palette)"
                ).first
                palette.click(timeout=3000)
                page.wait_for_timeout(500)
                page.get_by_text("子夜", exact=False).first.click(timeout=3000)
                page.wait_for_timeout(700)
                shot(page, shots_dir, 6, "theme-midnight")
                page.keyboard.press("Escape")
                page.wait_for_timeout(300)
                # 切回洛圣
                palette.click()
                page.wait_for_timeout(500)
                page.get_by_text("洛圣", exact=False).first.click(timeout=3000)
                page.wait_for_timeout(700)
                shot(page, shots_dir, 7, "theme-luosheng")
                page.keyboard.press("Escape")
            except Exception as e:
                print(f"  [warn] 主题切换未完成：{e}")

            print("[done] 全部步骤已执行")
            return 0
        except Exception as exc:
            print(f"[ERROR] {exc}")
            try:
                error_html = shots_dir / "error-dump.html"
                error_html.write_text(page.content(), encoding="utf-8")
                shot(page, shots_dir, 99, "error-state")
                print(f"[dump] page.content() saved to {error_html}")
            except Exception as nested:
                print(f"[dump-failed] {nested}")
            return 2
        finally:
            ctx.close()
            browser.close()


def main() -> int:
    args = parse_args()
    return run_flow(args)


if __name__ == "__main__":
    sys.exit(main())
