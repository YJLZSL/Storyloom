from playwright.sync_api import sync_playwright
import os
import sys

BASE = "http://localhost:5173"
SHOT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "screenshots", "v1.0.0-testing")
os.makedirs(SHOT_DIR, exist_ok=True)


def shot(page, name):
    path = os.path.join(SHOT_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    print(f"[shot] {path}")
    return path


def wait(page):
    page.wait_for_load_state("networkidle")


def ensure_workspace(page, issues):
    """如果当前在 WorkspaceSelector，则创建或选择首个工作区。"""
    if page.locator("text=选择一个工作区开始创作").count() == 0:
        return True

    # v1.0.0 WorkspaceCard 无 data-testid，用可点击卡片结构匹配
    cards = page.locator(".cursor-pointer.rounded-xl.border").all()
    if len(cards) == 0:
        cards = page.locator("button:has-text('新建工作区'), button:has-text('创建第一个工作区')").all()

    if len(cards) > 0:
        # 优先选择真正的工作区卡片；否则点新建按钮
        selectable = page.locator(".cursor-pointer.rounded-xl.border").all()
        if selectable:
            selectable[0].click()
        else:
            cards[0].click()
        page.wait_for_timeout(500)
        wait(page)
        shot(page, "01b-workspace-selected")
        if page.locator("text=选择一个工作区开始创作").count() > 0:
            issues.append("阻塞：点击工作区卡片/按钮后仍未进入工作区")
            return False
        return True

    issues.append("阻塞：WorkspaceSelector 存在但无工作区卡片或新建按钮可点击")
    return False


def create_workspace_if_needed(page, issues):
    """若工作区列表为空，通过新建工作区对话框创建一个。"""
    if page.locator("text=还没有工作区").count() == 0:
        return ensure_workspace(page, issues)

    # 点击创建第一个工作区
    page.click("button:has-text('创建第一个工作区')", timeout=5000)
    page.wait_for_timeout(300)

    # 等待对话框并填写
    page.wait_for_selector("input#ws-name", state="visible", timeout=5000)
    page.fill("input#ws-name", "回归测试工作区")
    page.click("button:has-text('创建')", timeout=5000)
    page.wait_for_timeout(800)
    wait(page)
    shot(page, "01b-workspace-selected")

    if page.locator("text=选择一个工作区开始创作").count() > 0:
        issues.append("阻塞：创建工作区后仍未进入工作区")
        return False
    return True


def click_view_tab(page, label, issues, issue_label):
    try:
        page.click(f"button:has-text('{label}')", timeout=5000)
        page.wait_for_timeout(300)
        wait(page)
    except Exception as e:
        issues.append(f"{issue_label}：切换到 {label} 失败 {e}")
        return False
    return True


def click_side_nav(page, label, issues, issue_label):
    try:
        # SideNav 按钮同时显示图标和文字；用 has-text 匹配
        page.click(f"nav button:has-text('{label}')", timeout=5000)
        page.wait_for_timeout(300)
        wait(page)
    except Exception as e:
        issues.append(f"{issue_label}：打开 {label} 面板失败 {e}")
        return False
    return True


def main():
    issues = []
    console_logs = []
    page_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        def handle_console(msg):
            console_logs.append((msg.type, msg.text))

        def handle_pageerror(err):
            page_errors.append(str(err))

        page.on("console", handle_console)
        page.on("pageerror", handle_pageerror)

        # 1. 首页
        try:
            page.goto(BASE)
            wait(page)
            shot(page, "01-home")
            if page.locator("text=AI Timeline Creator").count() == 0:
                issues.append("高：首页未显示标题")

            # v1.0.0 首页为 WorkspaceSelector（无 ChapterRail 作为必要元素）
            if page.locator("text=选择一个工作区开始创作").count() == 0:
                issues.append("中：首页未检测到工作区选择器")

            if not create_workspace_if_needed(page, issues):
                raise RuntimeError("无法进入工作区")
        except Exception as e:
            issues.append(f"阻塞：首页加载失败 {e}")

        # 2. 切换到时间轴视图
        if click_view_tab(page, "时间轴", issues, "高"):
            shot(page, "02-timeline")
            has_new_track = page.locator("text=新建轨道").count() > 0
            has_empty = page.locator("text=还没有轨道").count() > 0 or page.locator("text=时间轴还是空的").count() > 0
            if not has_new_track and not has_empty:
                issues.append("中：时间轴视图未识别到轨道或空状态")

        # 3. 大纲视图
        if click_view_tab(page, "大纲", issues, "中"):
            shot(page, "03-outline")

        # 4. 树状时间轴
        if click_view_tab(page, "树状", issues, "中"):
            shot(page, "04-tree")
            has_no_events = page.locator("text=暂无事件").count() > 0
            has_svg = page.locator("svg").count() > 0
            if not has_no_events and not has_svg:
                issues.append("中：树状时间轴未渲染")

        # 5. 关系图
        if click_view_tab(page, "关系图", issues, "中"):
            shot(page, "05-relationship")

        # 6. 统计视图
        if click_view_tab(page, "统计", issues, "低"):
            shot(page, "06-stats")

        # 7. 打开 AI 助手面板
        if click_side_nav(page, "AI 助手", issues, "中"):
            shot(page, "07-ai-panel")
            if page.locator("text=AI 面板").count() == 0:
                issues.append("中：AI 助手面板标题未显示")

        # 8. 打开伏笔面板
        if click_side_nav(page, "伏笔", issues, "中"):
            shot(page, "08-foreshadowing")

        # 9. 打开角色面板
        if click_side_nav(page, "角色", issues, "中"):
            shot(page, "09-characters")

        # 10. 打开世界观面板
        if click_side_nav(page, "世界观", issues, "中"):
            shot(page, "10-worldview")

        # 11. 主题切换
        try:
            def open_theme_popover():
                # 主题变更后的 view transition 可能让 Radix Popover 状态不一致，
                # 首次点击可能只重置内部状态，因此未出现主题按钮时再点一次。
                for _ in range(2):
                    page.click("button[aria-label='选择主题']", timeout=5000)
                    page.wait_for_timeout(600)
                    if page.locator("button:has-text('子夜')").count() > 0:
                        break
                else:
                    raise RuntimeError("无法打开主题面板")

            open_theme_popover()
            page.click("button:has-text('子夜')", timeout=5000)
            page.wait_for_timeout(800)
            shot(page, "11-theme-midnight")
            midnight_theme = page.evaluate("() => document.documentElement.dataset.theme")
            if midnight_theme != "midnight":
                issues.append(f"中：切换到子夜主题后 dataset.theme 为 {midnight_theme}，期望 midnight")

            open_theme_popover()
            page.click("button:has-text('洛圣')", timeout=5000)
            page.wait_for_timeout(800)
            shot(page, "12-theme-luosheng")
            luosheng_theme = page.evaluate("() => document.documentElement.dataset.theme")
            if luosheng_theme != "luosheng":
                issues.append(f"中：切换到洛圣主题后 dataset.theme 为 {luosheng_theme}，期望 luosheng")
        except Exception as e:
            issues.append(f"低：主题切换失败 {e}")

        # 12. 刷新并收集控制台严重错误
        page.reload()
        wait(page)
        shot(page, "13-reloaded")

        severe = [
            f"{t}: {txt}"
            for t, txt in console_logs
            if t == "error" or (t == "warning" and "error" in txt.lower())
        ] + [f"pageerror: {err}" for err in page_errors]
        if severe:
            for entry in severe:
                issues.append(f"高：控制台严重错误 {entry}")

        browser.close()

    report_path = os.path.join(os.path.dirname(__file__), "..", "docs", "测试报告 v1.0.0.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# 测试报告 v1.0.0\n\n")
        f.write("> 生成时间：2026-06-18\n\n")
        f.write("## 测试范围\n\n")
        f.write("- 首页 WorkspaceSelector\n")
        f.write("- 时间轴视图\n")
        f.write("- 大纲视图\n")
        f.write("- 树状时间轴视图\n")
        f.write("- 关系图视图\n")
        f.write("- 统计视图\n")
        f.write("- AI 助手面板\n")
        f.write("- 伏笔面板\n")
        f.write("- 角色面板\n")
        f.write("- 世界观面板\n")
        f.write("- 主题切换（洛圣 / 子夜）\n\n")
        f.write("## 问题清单\n\n")
        if issues:
            for i in issues:
                f.write(f"- {i}\n")
        else:
            f.write("- 未发现阻塞/高/中优先级问题。\n")
        f.write("\n## 截图目录\n\n")
        f.write(f"`docs/screenshots/v1.0.0-testing/`\n\n")
        for fn in sorted(os.listdir(SHOT_DIR)):
            f.write(f"- [{fn}](./screenshots/v1.0.0-testing/{fn})\n")
    print(f"[report] {report_path}")
    for i in issues:
        print(f"[issue] {i}")
    sys.exit(0 if not any("阻塞" in i or "高" in i for i in issues) else 1)


if __name__ == "__main__":
    main()
