from playwright.sync_api import sync_playwright
import os
import sys

BASE = "http://localhost:5173"
SHOT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "screenshots", "v4.2-testing")
os.makedirs(SHOT_DIR, exist_ok=True)

def shot(page, name):
    path = os.path.join(SHOT_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    print(f"[shot] {path}")
    return path

def wait(page):
    page.wait_for_load_state("networkidle")

def main():
    issues = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        # 1. 首页
        try:
            page.goto(BASE)
            wait(page)
            shot(page, "01-home")
            if page.locator("text=AI Timeline Creator").count() == 0:
                issues.append("高：首页未显示标题")
            # 章节横滑区域（workspace 自动加载后 ChapterRail）
            if page.locator("text=我的作品 · 横滑浏览").count() == 0:
                issues.append("中：首页未检测到 ChapterRail 相关元素")
            # 若仍停留在 WorkspaceSelector（多工作区测试环境），点击 ChapterRail 首个卡片
            if page.locator("text=选择一个工作区开始创作").count() > 0:
                cards = page.locator("[data-testid='chapter-rail-card']").all()
                if len(cards) > 0:
                    cards[0].click()
                    page.wait_for_timeout(500)
                    wait(page)
                    shot(page, "01b-workspace-selected")
                    if page.locator("text=选择一个工作区开始创作").count() > 0:
                        issues.append("阻塞：点击工作区卡片后仍未进入工作区")
                else:
                    issues.append("阻塞：WorkspaceSelector 存在但无工作区卡片可点击")
        except Exception as e:
            issues.append(f"阻塞：首页加载失败 {e}")

        # 2. 切换到时间轴视图
        try:
            page.click("text=时间轴", timeout=5000)
            wait(page)
            shot(page, "02-timeline")
            if page.locator("text=新建轨道").count() == 0 and page.locator("text=还没有轨道").count() == 0:
                issues.append("中：时间轴视图未识别到轨道或空状态")
        except Exception as e:
            issues.append(f"高：切换到时间轴失败 {e}")

        # 3. 树状时间轴
        try:
            page.click("text=树状", timeout=5000)
            wait(page)
            shot(page, "03-tree")
            if page.locator("text=暂无事件").count() == 0 and page.locator("svg").count() == 0:
                issues.append("中：树状时间轴未渲染")
        except Exception as e:
            issues.append(f"高：切换到树状失败 {e}")

        # 4. 关系图
        try:
            page.click("text=关系图", timeout=5000)
            wait(page)
            shot(page, "04-relationship")
        except Exception as e:
            issues.append(f"高：切换到关系图失败 {e}")

        # 5. 打开 AI 面板
        try:
            page.click("text=AI", timeout=5000)
            wait(page)
            shot(page, "05-ai-panel")
        except Exception as e:
            issues.append(f"中：打开 AI 面板失败 {e}")

        # 6. 打开伏笔面板
        try:
            page.click("text=伏笔", timeout=5000)
            wait(page)
            shot(page, "06-foreshadowing")
        except Exception as e:
            issues.append(f"中：打开伏笔面板失败 {e}")

        # 7. 大纲视图
        try:
            page.click("text=大纲", timeout=5000)
            wait(page)
            shot(page, "07-outline")
        except Exception as e:
            issues.append(f"中：切换到大纲失败 {e}")

        # 8. 主题切换（TopToolbar 中的太阳/月亮按钮）
        try:
            toggles = page.locator("button[aria-label*='主题']").all()
            if len(toggles) > 0:
                before_dark = page.locator("html.dark").count() > 0
                toggles[0].click()
                page.wait_for_timeout(500)
                after_toggle = page.locator("html.dark").count() > 0
                shot(page, "08-theme-toggle")
                if after_toggle == before_dark:
                    issues.append("中：主题切换后 html.dark 未变化")
                toggles[0].click()
                page.wait_for_timeout(500)
                shot(page, "09-theme-restore")
            else:
                issues.append("低：未找到主题切换按钮")
        except Exception as e:
            issues.append(f"低：主题切换失败 {e}")

        # 9. 控制台错误收集
        logs = []
        def handle_log(msg):
            if msg.type in ("error", "warning"):
                logs.append(f"{msg.type}: {msg.text}")
        page.on("console", handle_log)
        page.reload()
        wait(page)
        severe = [l for l in logs if "error" in l.lower()]
        if severe:
            issues.append(f"高：控制台严重错误 {len(severe)} 条")

        browser.close()

    # 输出报告
    report_path = os.path.join(os.path.dirname(__file__), "..", "docs", "测试报告 v4.2.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# 测试报告 v4.2\n\n")
        f.write("> 生成时间：2026-06-18\n\n")
        f.write("## 测试范围\n\n")
        f.write("- 首页 ChapterRail\n")
        f.write("- 时间轴视图\n")
        f.write("- 树状时间轴视图\n")
        f.write("- 关系图视图\n")
        f.write("- AI 助手面板\n")
        f.write("- 伏笔面板\n")
        f.write("- 大纲视图\n")
        f.write("- 主题切换（如存在）\n\n")
        f.write("## 问题清单\n\n")
        if issues:
            for i in issues:
                f.write(f"- {i}\n")
        else:
            f.write("- 未发现阻塞/高/中优先级问题。\n")
        f.write("\n## 截图目录\n\n")
        f.write(f"`docs/screenshots/v4.2-testing/`\n\n")
        for fn in sorted(os.listdir(SHOT_DIR)):
            f.write(f"- [{fn}](./screenshots/v4.2-testing/{fn})\n")
    print(f"[report] {report_path}")
    for i in issues:
        print(f"[issue] {i}")
    sys.exit(0 if not any("阻塞" in i or "高" in i for i in issues) else 1)

if __name__ == "__main__":
    main()
