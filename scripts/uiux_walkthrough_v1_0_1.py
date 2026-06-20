"""
v1.0.1 UI/UX 视觉走查
覆盖：首页、工作区主界面、各视图、各面板、主题切换、响应式
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_DIR = Path(__file__).resolve().parent.parent
SHOTS = BASE_DIR / "docs" / "screenshots" / "v1.0.1-uiux-walkthrough"
SHOTS.mkdir(parents=True, exist_ok=True)
URL = "http://localhost:5173"

def shot(page, name):
    path = SHOTS / f"{name}.png"
    page.screenshot(path=str(path), full_page=False)
    print(f"[shot] {path.name}")


def click_text(page, text, timeout=5000):
    locator = page.get_by_text(text, exact=False).first
    locator.scroll_into_view_if_needed(timeout=timeout)
    locator.click(timeout=timeout)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="zh-CN")
        page = ctx.new_page()

        # 1. 首页
        page.goto(URL, wait_until="networkidle")
        page.wait_for_timeout(1500)
        shot(page, "01-home-1440x900")

        # 2. 创建工作区（如果首页有创建入口）
        try:
            create_btn = page.get_by_text("创建第一个工作区", exact=False).first
            if create_btn.is_visible(timeout=2000):
                create_btn.click()
                page.wait_for_timeout(800)
                # 填名称
                name_inputs = page.locator("input[type='text']").all()
                if name_inputs:
                    name_inputs[0].fill("UIUX 走查工作区")
                page.wait_for_timeout(300)
                # 提交
                submit = page.get_by_role("button", name="创建").first
                submit.click()
                page.wait_for_timeout(1500)
        except Exception as e:
            print(f"[warn] create workspace skipped: {e}")

        # 如果首页有现有工作区卡片，点击进入
        try:
            cards = page.locator(".cursor-pointer.rounded-xl.border").all()
            if cards:
                cards[0].click()
                page.wait_for_timeout(1500)
        except Exception:
            pass

        shot(page, "02-workspace-main")

        # 3. 各视图
        for view in ["时间轴", "大纲", "叙事", "甘特", "树状", "统计", "关系图"]:
            try:
                page.get_by_role("tab", name=view).first.click(timeout=2000)
                page.wait_for_timeout(800)
                shot(page, f"03-view-{view}")
            except Exception:
                try:
                    page.get_by_text(view, exact=False).first.click(timeout=2000)
                    page.wait_for_timeout(800)
                    shot(page, f"03-view-{view}")
                except Exception as e:
                    print(f"[warn] view {view} skipped: {e}")

        # 4. SideNav 各面板
        for panel in ["角色", "世界观", "伏笔", "AI 助手"]:
            try:
                page.get_by_text(panel, exact=False).first.click(timeout=2000)
                page.wait_for_timeout(800)
                shot(page, f"04-panel-{panel.replace(' ', '_')}")
            except Exception as e:
                print(f"[warn] panel {panel} skipped: {e}")

        # 5. 主题切换：依次切换到所有主题
        themes = [
            ("子夜", "midnight"),
            ("森林", "forest"),
            ("水墨", "ink-wash"),
            ("高对比", "contrast"),
            ("洛圣", "luosheng"),
        ]
        for label, key in themes:
            try:
                # 打开 Palette 主题面板
                palette = page.locator("button[aria-label*='主题'], button:has(svg.lucide-palette)").first
                palette.click(timeout=2000)
                page.wait_for_timeout(500)
                # 选主题
                page.get_by_text(label, exact=False).first.click(timeout=2000)
                page.wait_for_timeout(800)
                # 关闭面板
                page.keyboard.press("Escape")
                page.wait_for_timeout(400)
                # 验证 dataset
                actual = page.evaluate("document.documentElement.dataset.theme")
                print(f"[theme] {label} -> dataset.theme={actual} (expected={key})")
                shot(page, f"05-theme-{key}")
            except Exception as e:
                print(f"[warn] theme {label} skipped: {e}")

        # 6. 响应式
        sizes = [
            ("desktop-1920x1080", 1920, 1080),
            ("desktop-1280x800", 1280, 800),
            ("tablet-768x1024", 768, 1024),
            ("mobile-390x844", 390, 844),
        ]
        for label, w, h in sizes:
            try:
                page.set_viewport_size({"width": w, "height": h})
                page.goto(URL, wait_until="networkidle")
                page.wait_for_timeout(800)
                shot(page, f"06-responsive-{label}")
            except Exception as e:
                print(f"[warn] responsive {label} skipped: {e}")

        ctx.close()
        browser.close()
        print(f"\n[done] screenshots saved to {SHOTS}")


if __name__ == "__main__":
    main()
