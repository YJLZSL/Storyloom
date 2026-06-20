from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
import os
import sys
import time
import socket
import subprocess

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_URL = "http://localhost:5173"
SERVER_PORT = 5173
BACKEND_URL = "http://localhost:3001"
BACKEND_PORT = 3001

WORKSPACE_NAME = f"调试大纲编辑-{time.strftime('%m%d%H%M%S')}"
TRACK_NAME = "主线"
EVENT_TITLE = "测试事件 A"
EVENT_TITLE_EDITED = "测试事件 A-已编辑"
EVENT_SUMMARY = "这是测试摘要"


def wait_for_server(port, timeout=60):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                return True
        except OSError:
            time.sleep(0.5)
    return False


def start_process(cmd, label, port, timeout=120):
    print(f"[server] starting {label}: {cmd} ...")
    proc = subprocess.Popen(
        cmd,
        cwd=BASE_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        shell=True,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )
    if not wait_for_server(port, timeout=timeout):
        proc.terminate()
        raise RuntimeError(f"{label} 启动超时 (端口 {port})")
    print(f"[server] {label} ready on port {port}")
    return proc


def stop_process(proc):
    if proc is None:
        return
    try:
        if os.name == "nt":
            proc.send_signal(subprocess.signal.CTRL_BREAK_EVENT)
        else:
            proc.terminate()
        proc.wait(timeout=10)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass


def main():
    server_proc = None
    backend_proc = None
    try:
        if not wait_for_server(BACKEND_PORT, timeout=3):
            backend_proc = start_process("npm run dev:server", "后端服务", BACKEND_PORT, timeout=120)
        else:
            print(f"[server] {BACKEND_URL} 已运行")

        if not wait_for_server(SERVER_PORT, timeout=3):
            server_proc = start_process("npm run dev:web", "前端开发服务器", SERVER_PORT, timeout=120)
        else:
            print(f"[server] {BASE_URL} 已运行")

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()

            def on_console(msg):
                print(f"[console {msg.type}] {msg.text}")

            page.on("console", on_console)

            print("[debug] goto home")
            page.goto(BASE_URL, timeout=15000)
            page.wait_for_load_state("networkidle", timeout=10000)

            print("[debug] create workspace")
            page.click("button:has-text('新建工作区')", timeout=5000)
            page.wait_for_selector("input#ws-name", state="visible", timeout=5000)
            page.fill("input#ws-name", WORKSPACE_NAME)
            page.fill("textarea#ws-desc", "调试使用")
            page.locator("input#ws-name").press("Enter")
            page.wait_for_timeout(1500)

            print("[debug] create track")
            page.click("button:has-text('新建轨道')", timeout=5000)
            page.wait_for_timeout(500)
            inp = page.locator("input[placeholder*='主线']")
            inp.fill(TRACK_NAME)
            inp.press("Enter")
            page.wait_for_timeout(1000)

            print("[debug] create event")
            page.click("button:has-text('新建事件')", timeout=5000)
            page.wait_for_timeout(800)
            page.locator("input[placeholder='事件标题']").fill(EVENT_TITLE)
            page.locator("input[placeholder='简短描述']").fill(EVENT_SUMMARY)
            selects = page.locator("select").all()
            for sel in selects:
                label = sel.get_attribute("aria-label") or ""
                first_opt = sel.locator("option").first.inner_text()
                if "所属轨道" in label or "未分类" in first_opt or "track" in label.lower():
                    sel.select_option(label=TRACK_NAME)
                    break
            page.locator("button[type='submit']:has-text('保存')").click(timeout=5000)
            page.wait_for_timeout(1500)
            # Ensure event editor dialog is closed
            try:
                page.wait_for_selector("text=事件编辑器", state="hidden", timeout=5000)
            except Exception:
                pass

            print("[debug] switch to outline")
            page.click("button:has-text('大纲')", timeout=5000)
            page.wait_for_timeout(1000)

            print(f"[debug] outline has old title: {page.locator(f'text={EVENT_TITLE}').count()}")

            print("[debug] click h4 to edit")
            page.locator(f"h4:has-text('{EVENT_TITLE}')").first.click(timeout=3000)
            page.wait_for_timeout(500)

            edit_input = page.locator("[data-outline-event-id] input[type='text']").first
            if edit_input.count() == 0:
                edit_input = page.locator("input[type='text']").filter(visible=True).first
            print(f"[debug] edit input count: {edit_input.count()}")

            print("[debug] fill and press Enter")
            edit_input.fill(EVENT_TITLE_EDITED)
            edit_input.press("Enter")

            print("[debug] waiting for edited title text (10s timeout)")
            try:
                page.wait_for_selector(f"text={EVENT_TITLE_EDITED}", timeout=10000)
                print("[debug] SUCCESS: edited title found")
            except PlaywrightTimeout:
                print("[debug] FAILURE: edited title not found within 10s")
                print(f"[debug] page text: {page.inner_text('body')[:1000]}")
                print(f"[debug] old title count: {page.locator(f'text={EVENT_TITLE}').count()}")
                print(f"[debug] edited title count: {page.locator(f'text={EVENT_TITLE_EDITED}').count()}")
                # Check if still editing
                still_editing = page.locator("[data-outline-event-id] input[type='text']").count()
                print(f"[debug] still editing input count: {still_editing}")
                # Screenshot
                shot_path = os.path.join(BASE_DIR, "docs", "screenshots", "debug-outline-edit.png")
                os.makedirs(os.path.dirname(shot_path), exist_ok=True)
                page.screenshot(path=shot_path, full_page=True)
                print(f"[debug] screenshot saved: {shot_path}")

            browser.close()
    finally:
        stop_process(server_proc)
        stop_process(backend_proc)


if __name__ == "__main__":
    main()
