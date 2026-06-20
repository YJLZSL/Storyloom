"""
v1.3 视觉回归 + 浏览器真实点击测试脚本

覆盖：
- Task 3：命令面板在 6 主题下的截图
- Task 9：首页 → 创建工作区 → 时间轴 → 大纲 → Settings → 切换主题 →
         命令面板 → 缩放 +/- → 右栏面板切换

用法：
    python scripts/v1_3_visual_regression.py
    python scripts/v1_3_visual_regression.py --headless --keep-servers
    python scripts/v1_3_visual_regression.py --shots-dir docs/screenshots/v1.3-continue-after

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
DEFAULT_SHOTS = REPO_ROOT / "docs" / "screenshots" / "v1.3-continue-after"

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
        description="v1.3 视觉回归与浏览器真实点击测试",
    )
    p.add_argument("--browser", choices=["chromium", "firefox", "webkit"], default="chromium")
    headmode = p.add_mutually_exclusive_group()
    headmode.add_argument("--headed", action="store_true", help="带 GUI 启动浏览器")
    headmode.add_argument("--headless", action="store_true", help="无头模式（默认）")
    p.add_argument("--base-url", default="http://localhost:5173", help="前端 URL")
    p.add_argument("--api-url", default="http://localhost:3001", help="后端 URL")
    p.add_argument("--shots-dir", default=str(DEFAULT_SHOTS), help="截图保存目录")
    p.add_argument("--slow-mo", type=int, default=120, help="每次操作延迟 ms")
    p.add_argument("--workspace-name", default="v1.3 视觉回归测试工作区")
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
            # 后端根路径 404 也视为服务已启动
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
        error_html = shots_dir / "error-dump.html"
        error_html.write_text(page.content(), encoding="utf-8")
        shot(page, shots_dir, 99, "error-state")
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


def set_theme_via_ui(page, theme_name: str) -> None:
    """通过顶栏主题选择器切换主题。"""
    # 打开主题 Popover
    if not click_first_visible(page, [
        "button[aria-label='选择主题']",
        "button:has(.lucide-palette)",
    ], timeout=3000):
        raise RuntimeError("主题选择器按钮未找到")
    page.wait_for_timeout(600)
    # 点击对应主题名称
    if not click_first_visible(page, [
        f"button:has-text('{theme_name}')",
    ], timeout=3000):
        page.get_by_text(theme_name, exact=False).first.click(timeout=3000)
    page.wait_for_timeout(900)
    # 关闭 Popover
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)


def open_command_palette(page) -> None:
    """优先点击 TopToolbar 命令面板按钮，失败则按 Ctrl+K。"""
    if not click_first_visible(page, [
        "button:has(.lucide-command)",
        "button:has-text('Ctrl+K')",
        "button[aria-label*='命令']",
    ], timeout=3000):
        page.keyboard.press("Control+k")
    page.wait_for_timeout(600)


def is_command_palette_visible(page) -> bool:
    try:
        page.locator("[role='dialog'] input[cmdk-input]").wait_for(state="visible", timeout=2000)
        return True
    except Exception:
        return False


def run_command_palette_themes(page, shots_dir: Path) -> list[Path]:
    """Task 3：对 6 个主题分别截图命令面板。"""
    print("\n[Task 3] 命令面板 6 主题截图")
    paths: list[Path] = []
    for theme_id, theme_name in THEMES:
        print(f"  [theme] {theme_id} ({theme_name})")
        set_theme_via_ui(page, theme_name)

        # 如果仍在工作区选择页则重新进入工作区
        ensure_in_workspace(page)

        open_command_palette(page)
        if not is_command_palette_visible(page):
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)
            open_command_palette(page)

        path = shots_dir / f"command-palette-{theme_id}.png"
        page.screenshot(path=str(path), full_page=False)
        print(f"  [shot] {path}")
        paths.append(path)

        page.keyboard.press("Escape")
        page.wait_for_timeout(400)
    return paths


def ensure_in_workspace(page) -> None:
    """如果当前在工作区选择页，则创建/进入第一个工作区。"""
    if page.locator("text=Storyloom").count() == 0:
        return
    # 尝试点击第一个工作区卡片
    try:
        cards = page.locator("[data-onboarding='create-workspace']").all()
        if not cards:
            cards = page.locator("button:has-text('新建工作区')").all()
        if cards:
            # 如果还没有工作区，点击新建；否则点击第一个卡片
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

    # 优先点击第一个已有工作区卡片进入（避免已有数据时重复创建）
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
    # 填入名称（tdesign Input 可能没有 type 属性）
    try:
        name_input = page.locator("input#ws-name, input[placeholder*='工作区名称'], input").first
        name_input.wait_for(state="visible", timeout=3000)
        name_input.fill(name)
    except Exception as e:
        print(f"  [warn] 填写工作区名称失败：{e}")
    page.wait_for_timeout(300)
    # 提交（tdesign Dialog 确认按钮）
    submitted = click_first_visible(page, [
        "button:has-text('创建')",
        "button[type='submit']",
    ])
    if submitted:
        page.wait_for_timeout(2000)
    else:
        print("  [warn] 未找到创建提交按钮")


def click_view_tab(page, view_label: str) -> None:
    try:
        tab = page.locator("button").filter(has_text=view_label).first
        tab.click(timeout=3000)
    except Exception:
        page.get_by_text(view_label, exact=False).first.click(timeout=3000)
    page.wait_for_timeout(700)


def run_click_walkthrough(page, shots_dir: Path, args: argparse.Namespace) -> None:
    """Task 9：浏览器真实点击测试。"""
    print("\n[Task 9] 浏览器真实点击测试")
    idx = 0

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

    print("[3] 进入时间轴视图")
    click_view_tab(page, "时间轴")
    snap("view-timeline")

    print("[4] 进入大纲视图")
    click_view_tab(page, "大纲")
    snap("view-outline")

    print("[5] 打开 Settings")
    if not click_first_visible(page, [
        "button[aria-label='设置']",
        "button:has(.lucide-settings)",
    ]):
        raise RuntimeError("Settings 齿轮不可见")
    page.wait_for_timeout(1000)
    snap("settings-open")

    print("[6] 在 Settings 中切换主题")
    try:
        page.get_by_role("tab", name="主题").click(timeout=3000)
    except Exception:
        page.get_by_text("主题", exact=False).first.click(timeout=3000)
    page.wait_for_timeout(500)
    # 选择「子夜」主题
    try:
        page.locator("button").filter(has_text="子夜").first.click(timeout=3000)
    except Exception:
        page.get_by_text("子夜", exact=False).first.click(timeout=3000)
    page.wait_for_timeout(1000)
    snap("settings-theme-midnight")

    # 关闭 Settings
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)

    print("[7] 打开命令面板")
    open_command_palette(page)
    snap("command-palette")
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)

    print("[8] 测试时间轴缩放 +/- 与 Slider")
    click_view_tab(page, "时间轴")
    # 点击缩小按钮
    click_first_visible(page, [
        "button:has(.lucide-zoom-out)",
        "button[aria-label*='缩小']",
    ])
    page.wait_for_timeout(500)
    snap("zoom-out")
    # 点击放大按钮
    click_first_visible(page, [
        "button:has(.lucide-zoom-in)",
        "button[aria-label*='放大']",
    ])
    page.wait_for_timeout(500)
    snap("zoom-in")
    # 拖动 Slider（Radix Slider 的 thumb role="slider"）
    try:
        slider = page.locator("[role='slider']").first
        slider.wait_for(state="visible", timeout=3000)
        bbox = slider.bounding_box()
        if bbox:
            page.mouse.move(bbox["x"] + bbox["width"] / 2, bbox["y"] + bbox["height"] / 2)
            page.mouse.down()
            page.mouse.move(bbox["x"] + bbox["width"] / 2 + 60, bbox["y"] + bbox["height"] / 2)
            page.mouse.up()
            page.wait_for_timeout(500)
            snap("zoom-slider")
    except Exception as e:
        print(f"  [warn] Slider 拖动失败：{e}")

    print("[9] 切换右栏面板（角色 / 世界观 / 伏笔）")
    for panel_label in ["角色", "世界观", "伏笔"]:
        try:
            click_view_tab(page, panel_label)
            snap(f"panel-{panel_label}")
        except Exception as e:
            print(f"  [warn] 面板 {panel_label} 切换失败：{e}")

    print("[done] Task 9 全部步骤已执行")


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
                # 先进入首页并创建工作区，保证命令面板截图时有数据上下文
                page.goto(args.base_url, wait_until="networkidle")
                page.wait_for_timeout(1200)
                create_workspace_if_needed(page, args.workspace_name)
                page.wait_for_timeout(1000)

                # Task 3
                command_palette_paths = run_command_palette_themes(page, shots_dir)

                # Task 9
                run_click_walkthrough(page, shots_dir, args)

                # 汇总控制台错误
                a11y_errors = [e for e in console_errors if any(k in e.lower() for k in ["aria", "accessibility", "a11y", "role"])]
                if a11y_errors:
                    print(f"\n[warn] 发现 {len(a11y_errors)} 条 a11y 相关控制台错误")
                    for e in a11y_errors[:5]:
                        print(f"    - {e}")
                else:
                    print("\n[ok] 未发现 a11y 相关严重控制台错误")

                print(f"\n[done] 截图已保存到 {shots_dir}")
                print("  命令面板截图：")
                for p in command_palette_paths:
                    print(f"    - {p}")
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
