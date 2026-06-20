from playwright.sync_api import sync_playwright
import sys

BASE_URL = "http://localhost:5173"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        logs = []
        errors = []

        def on_console(msg):
            logs.append((msg.type, msg.text))
            print(f"[console.{msg.type}] {msg.text}")

        def on_pageerror(err):
            errors.append(str(err))
            print(f"[pageerror] {err}")

        page.on("console", on_console)
        page.on("pageerror", on_pageerror)

        try:
            page.goto(BASE_URL, timeout=15000)
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception as e:
            print(f"[goto error] {e}")

        page.wait_for_timeout(1500)

        # Try to open the create workspace dialog (uses TDesign Dialog)
        try:
            page.click("button:has-text('新建工作区')", timeout=5000)
            page.wait_for_timeout(1500)
        except Exception as e:
            print(f"[dialog open error] {e}")

        # Close dialog if open
        try:
            page.keyboard.press("Escape")
            page.wait_for_timeout(500)
        except Exception:
            pass

        # Enter existing test workspace
        try:
            ws_card = page.locator("text=全面测试工作区").first
            if ws_card.count() > 0:
                ws_card.click(timeout=5000)
                page.wait_for_timeout(2000)
        except Exception as e:
            print(f"[enter workspace error] {e}")

        # Create a track to trigger MessagePlugin
        try:
            page.click("button:has-text('新建轨道')", timeout=5000)
            page.wait_for_timeout(500)
            inp = page.locator("input[placeholder*='主线']")
            if inp.count() > 0:
                inp.fill("测试轨道")
                inp.press("Enter")
                page.wait_for_timeout(1500)
        except Exception as e:
            print(f"[create track error] {e}")

        # Open settings to expose TDesign plugin components
        try:
            page.click("button:has-text('设置')", timeout=3000)
            page.wait_for_timeout(800)
            page.click("button:has-text('全部重置')", timeout=3000)
            page.wait_for_timeout(800)
        except Exception as e:
            print(f"[settings error] {e}")

        print("\n=== SUMMARY ===")
        print(f"page errors: {len(errors)}")
        print(f"console errors: {len([l for l in logs if l[0] == 'error'])}")
        print(f"console warnings: {len([l for l in logs if l[0] == 'warning'])}")

        react_render_errors = [e for e in errors if "reactRender" in e]
        print(f"reactRender errors: {len(react_render_errors)}")
        for e in react_render_errors:
            print(f"  - {e}")

        browser.close()

    sys.exit(1 if react_render_errors else 0)

if __name__ == "__main__":
    main()
