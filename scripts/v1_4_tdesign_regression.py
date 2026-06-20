"""
v1.4 TDesign / IconPark 前端打磨 — 浏览器回归测试脚本

覆盖：
- SideNav 折叠展开与导航
- TopToolbar 视图切换、缩放、命令面板
- SettingsDialog 打开与 Tab 切换
- CommandPalette 打开
- TimelineMinimap 显示
- AI 面板显示
- 6 主题（luosheng/midnight/forest/ink-wash/contrast/system）截图

用法：
    python scripts/v1_4_tdesign_regression.py
    python scripts/v1_4_tdesign_regression.py --headed --keep-servers
    python scripts/v1_4_tdesign_regression.py --shots-dir docs/screenshots/v1.4-tdesign

前置：
    pip install playwright && python -m playwright install chromium
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SHOTS = REPO_ROOT / "docs" / "screenshots" / "v1.4-tdesign"

THEMES: list[tuple[str, str]] = [
    ("luosheng", "洛圣"),
    ("midnight", "子夜"),
    ("forest", "森林"),
    ("ink-wash", "水墨"),
    ("contrast", "高对比"),
    ("system", "跟随系统"),
]

console_errors: list[str] = []


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="v1.4 TDesign / IconPark 前端打磨回归测试",
    )
    p.add_argument("--browser", choices=["chromium", "firefox", "webkit"], default="chromium")
    headmode = p.add_mutually_exclusive_group()
    headmode.add_argument("--headed", action="store_true", help="带 GUI 启动浏览器")
    headmode.add_argument("--headless", action="store_true", help="无头模式（默认）")
    p.add_argument("--base-url", default="http://localhost:5173", help="前端 URL")
    p.add_argument("--api-url", default="http://localhost:3001", help="后端 URL")
    p.add_argument("--shots-dir", default=str(DEFAULT_SHOTS), help="截图保存目录")
    p.add_argument("--slow-mo", type=int, default=120, help="每次操作延迟 ms")
    p.add_argument("--workspace-name", default="v1.4 TDesign 回归测试工作区")
    p.add_argument(
        "--keep-servers",
        action="store_true",
        help="测试结束后不关闭 dev server（调试用）",
    )
    return p.parse_args()


def wait_for_port(host: str, port: int, timeout: float = 60.0) -> bool:
    """轮询端口是否可访问；后端检查 /api/health，前端检查 /。"""
    is_api = port == 3001
    url = f"http://{host}:{port}{'/api/health' if is_api else '/'}"
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            resp = urllib.request.urlopen(url, timeout=2)
            if is_api:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("success") and data.get("data", {}).get("status") in ("ok", "degraded"):
                    return True
            else:
                return True
        except urllib.error.HTTPError as e:
            if is_api and e.code == 404:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def find_pid_by_port(port: int) -> int | None:
    """在 Windows 上通过 netstat 找占用端口的 PID。"""
    try:
        result = subprocess.run(
            ["netstat", "-ano", "-p", "tcp"],
            capture_output=True,
            text=True,
            check=False,
        )
        for line in result.stdout.splitlines():
            if f":{port}" in line and ("LISTENING" in line or "ESTABLISHED" in line):
                parts = line.strip().split()
                if parts:
                    try:
                        return int(parts[-1])
                    except ValueError:
                        continue
    except Exception:
        pass
    return None


def kill_port_occupier(port: int) -> None:
    pid = find_pid_by_port(port)
    if pid:
        try:
            os.kill(pid, signal.SIGTERM)
            time.sleep(1)
            os.kill(pid, signal.SIGKILL)
        except Exception:
            pass


def start_dev_servers() -> tuple[subprocess.Popen, subprocess.Popen]:
    """分别启动前端和后端 dev server。"""
    env = os.environ.copy()
    env["NODE_ENV"] = "development"

    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"

    server = subprocess.Popen(
        [npm_cmd, "run", "dev:server"],
        cwd=REPO_ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
    )
    web = subprocess.Popen(
        [npm_cmd, "run", "dev:web"],
        cwd=REPO_ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
    )
    return server, web


def stop_dev_servers(server: subprocess.Popen | None, web: subprocess.Popen | None) -> None:
    for proc in (web, server):
        if proc is None:
            continue
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass
    kill_port_occupier(5173)
    kill_port_occupier(3001)


def shot(page, shots_dir: Path, idx: int, label: str) -> Path:
    name = f"{idx:02d}-{label}.png"
    path = shots_dir / name
    page.screenshot(path=str(path), full_page=False)
    print(f"  [shot] {path}")
    return path


def save_error_dump(page, shots_dir: Path) -> None:
    try:
        error_dir = shots_dir / "error_dump"
        error_dir.mkdir(parents=True, exist_ok=True)
        error_html = error_dir / "error-dump.html"
        error_html.write_text(page.content(), encoding="utf-8")
        shot(page, error_dir, 99, "error-state")
        print(f"  [dump] {error_html}")
    except Exception as e:
        print(f"  [dump-failed] {e}")


def click_first_visible(page, selectors: list[str], timeout: int = 4000):
    for sel in selectors:
        try:
            loc = page.locator(sel).first
            loc.wait_for(state="visible", timeout=timeout)
            loc.click()
            return True
        except Exception:
            continue
    return False


def wait_for_network_idle(page) -> None:
    try:
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        pass


def ensure_in_workspace(page, workspace_name: str) -> None:
    """如果当前在工作区选择页，则创建/进入第一个工作区。"""
    if page.locator("text=Storyloom").count() == 0:
        return
    try:
        cards = page.locator("[data-onboarding='create-workspace']").all()
        if not cards:
            cards = page.locator("button:has-text('新建工作区')").all()
        if cards:
            ws_cards = page.locator("div[class*='rounded-xl']").all()
            if len(ws_cards) > 0:
                ws_cards[0].click()
            else:
                cards[0].click()
            page.wait_for_timeout(1500)
    except Exception as e:
        print(f"  [warn] ensure_in_workspace: {e}")


def create_workspace_if_needed(page, name: str) -> None:
    if page.locator("text=Storyloom").count() == 0:
        print("  [skip] 已在工作区内")
        return

    try:
        cards = page.locator("[class*='rounded-xl']").all()
        if len(cards) > 0:
            print("  [enter] 点击已有工作区卡片")
            cards[0].click()
            page.wait_for_timeout(1500)
            return
    except Exception:
        pass

    opened = click_first_visible(page, [
        "button[data-onboarding='create-workspace']",
        "text=创建第一个工作区",
        "text=新建工作区",
    ])
    if not opened:
        print("  [warn] 未找到创建工作区入口")
        return

    page.wait_for_timeout(800)
    try:
        name_input = page.locator("input#ws-name, input[placeholder*='工作区名称'], input").first
        name_input.wait_for(state="visible", timeout=3000)
        name_input.fill(name)
    except Exception as e:
        print(f"  [warn] 填写工作区名称失败：{e}")
    page.wait_for_timeout(300)
    submitted = click_first_visible(page, [
        "button:has-text('创建')",
        "button[type='submit']",
    ])
    if submitted:
        page.wait_for_timeout(2000)
    else:
        print("  [warn] 未找到创建提交按钮")


def set_theme_via_ui(page, theme_name: str) -> None:
    """通过顶栏主题选择器切换主题。"""
    if not click_first_visible(page, [
        "button[aria-label='选择主题']",
        "button:has(.i-palette)",
        "button:has-text('主题')",
    ], timeout=3000):
        raise RuntimeError("主题选择器按钮未找到")
    page.wait_for_timeout(600)
    if not click_first_visible(page, [
        f"button:has-text('{theme_name}')",
    ], timeout=3000):
        page.get_by_text(theme_name, exact=False).first.click(timeout=3000)
    page.wait_for_timeout(900)
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)


def open_command_palette(page) -> None:
    """优先点击 TopToolbar 命令面板按钮，失败则按 Ctrl+K。"""
    if not click_first_visible(page, [
        "button[aria-label='命令面板']",
        "button:has(.i-command)",
        "button:has-text('Ctrl+K')",
        "button:has-text('命令')",
    ], timeout=3000):
        page.keyboard.press("Control+k")
    page.wait_for_timeout(600)


def is_command_palette_visible(page) -> bool:
    try:
        page.locator("[role='dialog'] input[cmdk-input]").wait_for(state="visible", timeout=2000)
        return True
    except Exception:
        return False


def click_side_nav_item(page, label: str) -> None:
    """点击 SideNav 中指定文字菜单项。"""
    selectors = [
        f"li.t-menu__item:has-text('{label}')",
        f".t-menu__item:has-text('{label}')",
        f"[role='menuitem']:has-text('{label}')",
        f"button:has-text('{label}')",
    ]
    if not click_first_visible(page, selectors, timeout=4000):
        page.get_by_text(label, exact=False).first.click(timeout=4000)
    page.wait_for_timeout(700)


def click_top_toolbar_tab(page, label: str) -> None:
    """点击 TopToolbar 视图标签（TDesign Tabs 或按钮）。"""
    selectors = [
        f".t-tabs__nav-item:has-text('{label}')",
        f"[role='tab']:has-text('{label}')",
        f"button:has-text('{label}')",
    ]
    if not click_first_visible(page, selectors, timeout=4000):
        page.get_by_text(label, exact=False).first.click(timeout=4000)
    page.wait_for_timeout(700)


def toggle_sidenav_collapsed(page) -> None:
    """点击 SideNav 折叠/展开按钮。"""
    click_first_visible(page, [
        "button[aria-label='折叠侧边栏']",
        "button[aria-label='展开侧边栏']",
        "button:has(.i-menu-fold)",
        "button:has(.i-menu-unfold)",
    ], timeout=4000)
    page.wait_for_timeout(700)


def open_settings(page) -> None:
    if not click_first_visible(page, [
        "button[aria-label='设置']",
        "button:has(.i-setting)",
        "button:has-text('设置')",
    ], timeout=4000):
        raise RuntimeError("Settings 齿轮不可见")
    page.wait_for_timeout(1000)


def is_settings_open(page) -> bool:
    try:
        page.locator("[role='dialog']").filter(has_text="设置").wait_for(state="visible", timeout=2000)
        return True
    except Exception:
        return page.locator("text=偏好").count() > 0 and page.locator("text=主题").count() > 0


def debug_settings_tabs(page) -> None:
    """打印 SettingsDialog 内 Tabs 的 DOM 结构与文本，便于排错。"""
    try:
        html = page.locator("[role='dialog']").first.inner_html(timeout=3000)
        print(f"  [debug-settings-html] {html[:800]}")
    except Exception as e:
        print(f"  [debug-settings-html-failed] {e}")
    try:
        tabs = page.locator(".t-tabs__nav-item").all()
        print(f"  [debug-settings-tabs] count={len(tabs)}")
        for i, tab in enumerate(tabs):
            print(f"    [{i}] text={tab.text_content()!r} visible={tab.is_visible()}")
    except Exception as e:
        print(f"  [debug-settings-tabs-failed] {e}")


def click_settings_tab(page, label: str) -> None:
    """切换 SettingsDialog 的 Tab；TDesign Tabs 的 label 在 .t-tabs__nav-item-text 内。"""
    # 先等待 Tabs 渲染
    try:
        page.locator(".t-tabs__nav").wait_for(state="visible", timeout=3000)
    except Exception:
        pass

    # 先尝试直接按文字点击 .t-tabs__nav-item（含后代文本）
    try:
        loc = page.locator(".t-tabs__nav-item").filter(has_text=label).first
        loc.wait_for(state="visible", timeout=3000)
        loc.click(force=True, timeout=3000)
        page.wait_for_timeout(700)
        return
    except Exception:
        pass

    # 兜底：点击 .t-tabs__nav-item-text
    try:
        loc = page.locator(".t-tabs__nav-item-text").filter(has_text=label).first
        loc.wait_for(state="visible", timeout=3000)
        loc.click(force=True, timeout=3000)
        page.wait_for_timeout(700)
        return
    except Exception:
        pass

    # 兜底：按索引点击 .t-tabs__nav-item
    try:
        tabs = page.locator(".t-tabs__nav-item").all()
        for tab in tabs:
            text = tab.text_content() or ""
            if label in text:
                tab.click(force=True, timeout=3000)
                page.wait_for_timeout(700)
                return
    except Exception:
        pass

    debug_settings_tabs(page)
    raise RuntimeError(f"Settings Tab {label} 切换失败")


def run_theme_screenshots(page, shots_dir: Path) -> list[Path]:
    """对 6 个主题分别截图，验证核心界面在主题切换下正常。"""
    print("\n[Task] 6 主题截图")
    paths: list[Path] = []
    for theme_id, theme_name in THEMES:
        print(f"  [theme] {theme_id} ({theme_name})")
        set_theme_via_ui(page, theme_name)
        ensure_in_workspace(page, "")
        click_top_toolbar_tab(page, "时间轴")
        page.wait_for_timeout(800)
        path = shots_dir / f"theme-{theme_id}-timeline.png"
        page.screenshot(path=str(path), full_page=False)
        print(f"  [shot] {path}")
        paths.append(path)
    return paths


def run_regression_flow(page, shots_dir: Path, args: argparse.Namespace) -> list[Path]:
    """v1.4 核心回归流程。"""
    print("\n[Task] v1.4 核心回归测试")
    idx = 0
    all_paths: list[Path] = []

    def snap(label: str) -> Path:
        nonlocal idx
        idx += 1
        return shot(page, shots_dir, idx, label)

    print("[1] 打开首页")
    page.goto(args.base_url, wait_until="networkidle")
    page.wait_for_timeout(1000)
    snap("home")

    print("[2] 创建工作区")
    create_workspace_if_needed(page, args.workspace_name)
    snap("workspace-main")

    print("[3] SideNav 导航：时间轴 → 大纲")
    click_side_nav_item(page, "时间轴")
    snap("sidenav-timeline")
    click_side_nav_item(page, "大纲")
    snap("sidenav-outline")

    print("[4] SideNav 折叠与展开")
    toggle_sidenav_collapsed(page)
    snap("sidenav-collapsed")
    toggle_sidenav_collapsed(page)
    snap("sidenav-expanded")

    print("[5] TopToolbar 视图切换")
    click_top_toolbar_tab(page, "时间轴")
    snap("top-toolbar-timeline")
    click_top_toolbar_tab(page, "叙事")
    snap("top-toolbar-narrative")
    click_top_toolbar_tab(page, "时间轴")

    print("[6] TimelineMinimap 显示")
    try:
        minimap = page.locator("[data-testid='timeline-minimap'], .timeline-minimap, svg").first
        minimap.wait_for(state="visible", timeout=3000)
        snap("timeline-minimap")
    except Exception as e:
        print(f"  [warn] TimelineMinimap 未定位到：{e}")
        snap("timeline-minimap-missing")

    print("[7] TopToolbar 缩放")
    click_first_visible(page, [
        "button[aria-label='缩小']",
        "button:has(.i-zoom-out)",
    ])
    page.wait_for_timeout(500)
    snap("zoom-out")
    click_first_visible(page, [
        "button[aria-label='放大']",
        "button:has(.i-zoom-in)",
    ])
    page.wait_for_timeout(500)
    snap("zoom-in")

    print("[8] 命令面板")
    open_command_palette(page)
    if not is_command_palette_visible(page):
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        open_command_palette(page)
    snap("command-palette")
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)

    print("[9] SettingsDialog 打开与 Tab 切换")
    open_settings(page)
    if not is_settings_open(page):
        raise RuntimeError("SettingsDialog 未打开")
    snap("settings-open")
    for tab_label in ["主题", "快捷键", "教程"]:
        try:
            click_settings_tab(page, tab_label)
            snap(f"settings-tab-{tab_label}")
        except Exception as e:
            print(f"  [warn] Settings Tab {tab_label} 切换失败：{e}")
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)

    print("[10] AI 面板显示")
    click_side_nav_item(page, "AI 助手")
    snap("ai-panel")

    print("[done] v1.4 核心回归流程已执行")
    return all_paths


def run_flow(args: argparse.Namespace) -> int:
    from playwright.sync_api import sync_playwright

    shots_dir = Path(args.shots_dir)
    shots_dir.mkdir(parents=True, exist_ok=True)

    headless = not args.headed if args.headed or args.headless else True
    print(f"[config] browser={args.browser} headless={headless} shots={shots_dir}")

    server_proc: subprocess.Popen | None = None
    web_proc: subprocess.Popen | None = None

    try:
        print("[servers] 启动 dev:server (3001) 与 dev:web (5173)...")
        server_proc, web_proc = start_dev_servers()

        print("[servers] 等待后端 3001...")
        if not wait_for_port("localhost", 3001, timeout=90):
            print("[ERROR] 后端 3001 未就绪")
            return 2
        print("[servers] 等待前端 5173...")
        if not wait_for_port("localhost", 5173, timeout=120):
            print("[ERROR] 前端 5173 未就绪")
            return 2
        print("[servers] 前后端均已就绪")

        with sync_playwright() as p:
            bt = getattr(p, args.browser)
            browser = bt.launch(headless=headless, slow_mo=args.slow_mo)
            ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="zh-CN")
            page = ctx.new_page()

            def on_page_error(exc):
                print(f"  [pageerror] {exc}")

            def on_console(msg):
                if msg.type == "error":
                    text = msg.text
                    console_errors.append(text)
                    print(f"  [console.error] {text}")

            page.on("pageerror", on_page_error)
            page.on("console", on_console)

            try:
                page.goto(args.base_url, wait_until="networkidle")
                page.wait_for_timeout(1200)
                create_workspace_if_needed(page, args.workspace_name)
                page.wait_for_timeout(1000)

                theme_paths = run_theme_screenshots(page, shots_dir)
                run_regression_flow(page, shots_dir, args)

                a11y_errors = [e for e in console_errors if any(k in e.lower() for k in ["aria", "accessibility", "a11y", "role"])]
                if a11y_errors:
                    print(f"\n[warn] 发现 {len(a11y_errors)} 条 a11y 相关控制台错误")
                    for e in a11y_errors[:5]:
                        print(f"    - {e}")
                else:
                    print("\n[ok] 未发现 a11y 相关严重控制台错误")

                print(f"\n[done] 截图已保存到 {shots_dir}")
                print("  主题截图：")
                for pth in theme_paths:
                    print(f"    - {pth}")
                return 0
            except Exception as exc:
                print(f"\n[ERROR] {exc}")
                save_error_dump(page, shots_dir)
                return 2
            finally:
                ctx.close()
                browser.close()
    finally:
        if not args.keep_servers:
            print("[servers] 停止 dev server...")
            stop_dev_servers(server_proc, web_proc)


def main() -> int:
    args = parse_args()
    return run_flow(args)


if __name__ == "__main__":
    sys.exit(main())
