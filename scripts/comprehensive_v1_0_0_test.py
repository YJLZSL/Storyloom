from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout, expect
import os
import sys
import re
import time
import socket
import subprocess
import platform
from datetime import datetime
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPORT_DIR = os.path.join(BASE_DIR, "docs")
SHOT_BASE = os.path.join(BASE_DIR, "docs", "screenshots", "comprehensive-testing")

BASE_URL = "http://localhost:5173"
SERVER_PORT = 5173
BACKEND_URL = "http://localhost:3001"
BACKEND_PORT = 3001

WORKSPACE_NAME = f"全面测试工作区-{datetime.now().strftime('%m%d%H%M%S')}"
TRACK_NAME = "主线"
EVENT_TITLE = "测试事件 A"
EVENT_TITLE_EDITED = "测试事件 A-已编辑"
EVENT_SUMMARY = "这是测试摘要"
CHARACTER_NAME = "张三"
WORLD_SETTING_NAME = "魔法体系"
FORESHADOWING_TITLE = "神秘符号"

THEME_MAP = [
    ("子夜", "midnight"),
    ("森林", "forest"),
    ("水墨", "ink-wash"),
    ("高对比", "contrast"),
    ("洛圣", "luosheng"),
]

VIEW_TABS = ["时间轴", "大纲", "叙事", "甘特", "树状", "统计", "关系图"]

RESPONSIVE_SIZES = [
    ("desktop-1280x800", 1280, 800),
    ("desktop-1024x768", 1024, 768),
    ("tablet-portrait-768x1024", 768, 1024),
    ("mobile-390x844", 390, 844),
]


# 已知误报过滤正则/子串
KNOWN_FALSE_PATTERNS = [
    re.compile(r"StrictMode", re.I),
    re.compile(r"react-i18next"),
    re.compile(r"TDesign", re.I),
    re.compile(r"adapter", re.I),
    re.compile(r"deprecated", re.I),
    re.compile(r"findDOMNode", re.I),
    re.compile(r"Warning:"),
    re.compile(r"warning:"),
    re.compile(r"Failed to load resource"),
]


def is_false_positive(text):
    for pat in KNOWN_FALSE_PATTERNS:
        if pat.search(text):
            return True
    return False


class Issue:
    def __init__(self, priority, message, step=""):
        self.priority = priority
        self.message = message
        self.step = step

    def __str__(self):
        if self.step:
            return f"[{self.priority}] {self.step}: {self.message}"
        return f"[{self.priority}] {self.message}"


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)
    return path


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
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        shell=True,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )
    if not wait_for_server(port, timeout=timeout):
        proc.terminate()
        raise RuntimeError(f"{label} 启动超时 (端口 {port})")
    print(f"[server] {label} ready on port {port}")
    return proc


def start_dev_backend():
    if wait_for_server(BACKEND_PORT, timeout=2):
        print(f"[server] 后端服务已在端口 {BACKEND_PORT} 运行")
        return None
    return start_process("npm run dev:server", "后端服务", BACKEND_PORT, timeout=120)


def start_dev_server():
    if wait_for_server(SERVER_PORT, timeout=2):
        print(f"[server] 前端开发服务器已在端口 {SERVER_PORT} 运行")
        return None
    return start_process("npm run dev:web", "前端开发服务器", SERVER_PORT, timeout=120)


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


def safe_action(page, action, issues, step, priority="中", timeout=5000):
    try:
        return action()
    except PlaywrightTimeout as e:
        issues.append(Issue(priority, f"操作超时: {e}", step))
    except Exception as e:
        issues.append(Issue(priority, f"操作失败: {e}", step))
    return None


def attach_log_handlers(page, logs, errors, issues, source=""):
    def on_console(msg):
        logs.append((msg.type, msg.text))
        if msg.type == "error" and not is_false_positive(msg.text):
            issues.append(Issue("高", f"{source}控制台 error: {msg.text[:200]}", "控制台监听"))

    def on_pageerror(err):
        err_text = str(err)
        errors.append(err_text)
        if not is_false_positive(err_text):
            issues.append(Issue("高", f"{source}pageerror: {err_text[:200]}", "页面错误监听"))

    page.on("console", on_console)
    page.on("pageerror", on_pageerror)


def collect_severe_logs(logs, errors, issues, source=""):
    prefix = f"{source}: " if source else ""
    for t, txt in logs:
        if t == "error" and not is_false_positive(txt):
            issues.append(Issue("高", f"{prefix}控制台 error: {txt[:200]}", "控制台监听"))
    for err in errors:
        if not is_false_positive(err):
            issues.append(Issue("高", f"{prefix}pageerror: {err[:200]}", "页面错误监听"))


def screenshot(page, rel_path, issues=None, step=None):
    full_path = os.path.join(SHOT_BASE, rel_path)
    ensure_dir(os.path.dirname(full_path))
    try:
        page.screenshot(path=full_path, full_page=True)
        print(f"[shot] {full_path}")
        return full_path
    except Exception as e:
        msg = f"截图失败: {e}"
        print(f"[warn] {msg}")
        if issues is not None and step is not None:
            issues.append(Issue("低", msg, step))
        return None


def check_home_elements(page, issues, browser_label):
    try:
        title = page.locator("text=AI Timeline Creator")
        cards = page.locator(".cursor-pointer.rounded-xl.border")
        new_btn = page.locator("button:has-text('新建工作区')")
        if title.count() == 0:
            issues.append(Issue("高", "首页未显示标题 AI Timeline Creator", browser_label))
        if cards.count() == 0:
            issues.append(Issue("中", "首页未显示工作区选择器/卡片", browser_label))
        if new_btn.count() == 0:
            issues.append(Issue("中", "首页未显示新建工作区按钮", browser_label))
    except Exception as e:
        issues.append(Issue("中", f"首页元素检查失败: {e}", browser_label))


def check_garbled_workspaces(page, issues):
    try:
        cards = page.locator(".cursor-pointer.rounded-xl.border").all()
        garbled = []
        for card in cards:
            text = card.inner_text()
            if "?????" in text:
                garbled.append(text[:80].replace("\n", " "))
        if garbled:
            issues.append(Issue("高", f"发现乱码工作区卡片: {'; '.join(garbled)}", "工作区CRUD"))
    except Exception as e:
        issues.append(Issue("低", f"乱码检查失败: {e}", "工作区CRUD"))


def is_in_workspace_main(page):
    has_new_track_btn = page.locator("button:has-text('新建轨道')").count() > 0
    has_timeline_tab = page.locator("button:has-text('时间轴')").count() > 0
    return has_new_track_btn and has_timeline_tab


def assert_no_duplicates(page, locator, max_count, issues, step, item_name):
    try:
        count = locator.count()
        if count > max_count:
            issues.append(Issue("高", f"发现 {count} 个「{item_name}」，期望不超过 {max_count} 个", step))
    except Exception as e:
        issues.append(Issue("中", f"重复创建检测失败 ({item_name}): {e}", step))


def assert_creation_area_finished(page, dialog_locator, inline_input_locator, issues, step, item_name):
    """检查创建区域是否已关闭或重置。对话框使用 not_to_be_visible；内联表单使用 input_value == ''。"""
    if dialog_locator is not None:
        try:
            count = dialog_locator.count()
            if count == 0:
                return
            expect(dialog_locator).not_to_be_visible(timeout=3000)
            return
        except Exception:
            pass

    if inline_input_locator is not None:
        try:
            if inline_input_locator.count() > 0 and inline_input_locator.input_value() == "":
                return
        except Exception:
            pass

    issues.append(Issue("中", f"{item_name} 创建区域未关闭/未重置", step))
    try:
        cancel_btn = page.locator("button:has-text('取消')").filter(visible=True)
        if cancel_btn.count() > 0:
            cancel_btn.last.click(timeout=3000)
        else:
            page.keyboard.press("Escape")
        page.wait_for_timeout(500)
    except Exception:
        pass


def create_or_select_workspace(page, issues):
    step = "工作区CRUD"
    try:
        if page.locator(f"text={WORKSPACE_NAME}").count() > 0:
            page.locator(f"text={WORKSPACE_NAME}").first.click(timeout=3000)
            page.wait_for_timeout(1200)
            try:
                page.wait_for_function("() => !!document.querySelector('button') && Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('新建轨道'))", timeout=5000)
            except Exception:
                pass
            if is_in_workspace_main(page):
                return True
    except Exception as e:
        issues.append(Issue("低", f"选择已有工作区失败: {e}", step))

    try:
        page.click("button:has-text('新建工作区')", timeout=5000)
    except Exception as e:
        issues.append(Issue("高", f"点击新建工作区按钮失败: {e}", step))
        return False

    page.wait_for_timeout(500)
    dialog = page.locator("input#ws-name")
    try:
        page.wait_for_selector("input#ws-name", state="visible", timeout=5000)
    except Exception as e:
        issues.append(Issue("高", f"未弹出新建工作区对话框: {e}", step))
        return False

    page.fill("input#ws-name", WORKSPACE_NAME)
    page.fill("textarea#ws-desc", "全面测试使用的工作区")
    try:
        page.locator("input#ws-name").press("Enter")
    except Exception as e:
        issues.append(Issue("高", f"提交新建工作区表单失败: {e}", step))
        return False

    page.wait_for_timeout(1200)
    try:
        page.wait_for_load_state("networkidle", timeout=5000)
    except Exception:
        pass

    try:
        page.wait_for_function("() => !!document.querySelector('button') && Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('新建轨道'))", timeout=5000)
    except Exception:
        pass

    assert_creation_area_finished(page, dialog, None, issues, step, "新建工作区")

    if not is_in_workspace_main(page):
        issues.append(Issue("高", "创建工作区后仍未进入工作区主界面", step))
        return False
    return True


def cleanup_default_track_via_api(page, track_name, issues, step):
    """通过后端 API 删除工作区中预置的同名轨道，避免重复检测误报。"""
    try:
        def delete_tracks(workspace_name, target_name):
            return page.evaluate("""async ({ workspaceName, targetName }) => {
                try {
                    const listRes = await fetch('/api/workspaces');
                    if (!listRes.ok) return { error: 'list workspaces failed' };
                    const workspacesJson = await listRes.json();
                    const workspaceList = workspacesJson.data || workspacesJson || [];
                    const ws = workspaceList.find(w => w.name === workspaceName);
                    if (!ws) return { error: 'workspace not found' };
                    const tracksRes = await fetch(`/api/workspaces/${ws.id}/tracks`);
                    if (!tracksRes.ok) return { error: 'list tracks failed' };
                    const tracksJson = await tracksRes.json();
                    const trackList = tracksJson.data || tracksJson.items || tracksJson || [];
                    let deleted = 0;
                    for (const t of trackList) {
                        if (t.name === targetName) {
                            const delRes = await fetch(`/api/workspaces/${ws.id}/tracks/${t.id}`, { method: 'DELETE' });
                            if (delRes.ok) deleted++;
                        }
                    }
                    return { deleted };
                } catch (e) {
                    return { error: String(e) };
                }
            }""", {"workspaceName": workspace_name, "targetName": target_name})

        result = delete_tracks(WORKSPACE_NAME, track_name)
        if isinstance(result, dict) and result.get("deleted", 0) > 0:
            page.wait_for_timeout(600)
    except Exception as e:
        issues.append(Issue("低", f"API 清理轨道 {track_name} 失败: {e}", step))


def create_track(page, issues):
    step = "时间轴功能"
    cleanup_default_track_via_api(page, TRACK_NAME, issues, step)
    try:
        page.click("button:has-text('新建轨道')", timeout=5000)
    except Exception as e:
        issues.append(Issue("高", f"点击新建轨道失败: {e}", step))
        return False

    page.wait_for_timeout(400)
    try:
        page.wait_for_selector("text=新建轨道", state="visible", timeout=5000)
    except Exception:
        pass

    dialog = page.locator("input[placeholder*='主线']")
    try:
        inp = page.locator("input[placeholder*='主线']")
        inp.fill(TRACK_NAME)
        inp.press("Enter")
    except Exception as e:
        issues.append(Issue("高", f"填写/提交轨道名称失败: {e}", step))
        return False

    page.wait_for_timeout(1200)
    assert_creation_area_finished(page, dialog, None, issues, step, "新建轨道")
    assert_no_duplicates(page, page.locator(f"text={TRACK_NAME}"), 1, issues, step, TRACK_NAME)
    return True


def create_event_via_toolbar(page, issues):
    step = "时间轴功能"
    try:
        page.click("button:has-text('新建事件')", timeout=5000)
    except Exception as e:
        issues.append(Issue("高", f"点击顶部新建事件失败: {e}", step))
        return False

    page.wait_for_timeout(800)
    dialog = page.locator("input[placeholder='事件标题']")
    try:
        page.wait_for_selector("text=事件编辑器", state="visible", timeout=5000)
    except Exception:
        pass

    try:
        page.locator("input[placeholder='事件标题']").fill(EVENT_TITLE)
    except Exception as e:
        issues.append(Issue("高", f"填写事件标题失败: {e}", step))
        return False

    try:
        page.locator("input[placeholder='简短描述']").fill(EVENT_SUMMARY)
    except Exception as e:
        issues.append(Issue("低", f"填写事件摘要失败: {e}", step))

    try:
        selects = page.locator("select").all()
        for sel in selects:
            label = sel.get_attribute("aria-label") or ""
            first_opt = sel.locator("option").first.inner_text()
            if "所属轨道" in label or "未分类" in first_opt or "track" in label.lower():
                sel.select_option(label=TRACK_NAME)
                break
    except Exception as e:
        issues.append(Issue("低", f"选择事件所属轨道失败: {e}", step))

    today_str = datetime.now().strftime("%Y-%m-%d")
    try:
        date_inputs = page.locator("input[placeholder='选择开始时间']").all()
        if date_inputs:
            date_inputs[0].click()
            page.wait_for_timeout(400)
            today_cell = page.locator(f"td[title='{today_str}'], .t-date-picker__cell:has-text('{datetime.now().day}')").first
            if today_cell.count() > 0:
                today_cell.click()
            else:
                page.keyboard.press("Escape")
    except Exception as e:
        issues.append(Issue("低", f"选择今天日期失败: {e}", step))

    try:
        page.locator("button[type='submit']:has-text('保存')").click(timeout=5000)
    except Exception as e:
        issues.append(Issue("高", f"保存事件失败: {e}", step))
        return False

    page.wait_for_timeout(1200)
    assert_creation_area_finished(page, dialog, None, issues, step, "事件编辑器")
    assert_no_duplicates(page, page.locator(f"text={EVENT_TITLE}"), 1, issues, step, EVENT_TITLE)
    return True


def verify_event_on_timeline(page, issues):
    step = "时间轴功能"
    try:
        if page.locator(f"text={EVENT_TITLE}").count() == 0:
            issues.append(Issue("高", "时间轴上未显示刚创建的事件卡片", step))
    except Exception as e:
        issues.append(Issue("高", f"验证时间轴事件失败: {e}", step))


def quick_edit_in_outline(page, issues):
    step = "大纲视图"
    try:
        page.click("button:has-text('大纲')", timeout=5000)
    except Exception as e:
        issues.append(Issue("高", f"切换到大纲视图失败: {e}", step))
        return False

    page.wait_for_timeout(800)
    try:
        page.wait_for_load_state("networkidle", timeout=5000)
    except Exception:
        pass

    try:
        if page.locator(f"text={EVENT_TITLE}").count() == 0:
            issues.append(Issue("高", "大纲视图中未显示刚创建的事件", step))
            return False
    except Exception as e:
        issues.append(Issue("高", f"检查大纲事件失败: {e}", step))
        return False

    try:
        page.locator(f"h4:has-text('{EVENT_TITLE}')").first.click(timeout=3000)
        page.wait_for_timeout(500)
        edit_input = page.locator("[data-outline-event-id] input[type='text']").first
        if edit_input.count() == 0:
            edit_input = page.locator("input[type='text']").filter(visible=True).first
        edit_input.fill(EVENT_TITLE_EDITED)
        edit_input.press("Enter")
        try:
            page.wait_for_selector(f"text={EVENT_TITLE_EDITED}", timeout=3000)
        except PlaywrightTimeout:
            issues.append(Issue("中", "快速编辑后大纲未显示新标题", step))
    except Exception as e:
        issues.append(Issue("中", f"大纲快速编辑失败: {e}", step))
    return True


def create_character(page, issues):
    step = "角色面板"
    try:
        page.click("nav button:has-text('角色')", timeout=5000)
    except Exception as e:
        issues.append(Issue("高", f"打开角色面板失败: {e}", step))
        return False

    page.wait_for_timeout(600)
    name_input = page.locator("input[placeholder='角色名称']")
    try:
        name_input.fill(CHARACTER_NAME)
        page.locator("input[placeholder='角色身份']").fill("主角")
        page.click("button:has-text('添加角色')", timeout=5000)
    except Exception as e:
        issues.append(Issue("高", f"创建角色失败: {e}", step))
        return False

    page.wait_for_timeout(800)
    assert_creation_area_finished(page, None, name_input, issues, step, "角色创建区域")
    assert_no_duplicates(page, page.locator(f"text={CHARACTER_NAME}"), 1, issues, step, CHARACTER_NAME)
    if page.locator(f"text={CHARACTER_NAME}").count() == 0:
        issues.append(Issue("中", "创建角色后未在面板中显示", step))
    return True


def create_world_setting(page, issues):
    step = "世界观面板"
    try:
        page.click("nav button:has-text('世界观')", timeout=5000)
    except Exception as e:
        issues.append(Issue("高", f"打开世界观面板失败: {e}", step))
        return False

    page.wait_for_timeout(600)
    try:
        page.click("button:has-text('文化')", timeout=3000)
        name_input = page.locator("input[placeholder='设定名称']")
        name_input.fill(WORLD_SETTING_NAME)
        page.click("button:has-text('添加设定')", timeout=5000)
    except Exception as e:
        issues.append(Issue("高", f"创建世界观设定失败: {e}", step))
        return False

    page.wait_for_timeout(800)
    name_input = page.locator("input[placeholder='设定名称']")
    assert_creation_area_finished(page, None, name_input, issues, step, "世界观设定创建区域")
    assert_no_duplicates(page, page.locator(f"text={WORLD_SETTING_NAME}"), 1, issues, step, WORLD_SETTING_NAME)
    if page.locator(f"text={WORLD_SETTING_NAME}").count() == 0:
        issues.append(Issue("中", "创建世界观设定后未在面板中显示", step))
    return True


def create_foreshadowing(page, issues):
    step = "伏笔面板"
    try:
        page.click("nav button:has-text('伏笔')", timeout=5000)
    except Exception as e:
        issues.append(Issue("高", f"打开伏笔面板失败: {e}", step))
        return False

    page.wait_for_timeout(800)
    title_input = page.locator("input[placeholder='伏笔标题 *']")
    try:
        new_btn = page.locator("button", has_text=re.compile(r"^新建$")).filter(visible=True)
        if new_btn.count() == 0:
            new_btn = page.locator("button:has(.lucide-plus):has-text('新建')").filter(visible=True)
        new_btn.first.click(timeout=3000)
    except Exception as e:
        issues.append(Issue("高", f"点击伏笔新建按钮失败: {e}", step))
        return False

    page.wait_for_timeout(400)
    try:
        title_input.fill(FORESHADOWING_TITLE)
        page.locator("select").first.select_option("planted")
        page.locator("button[type='submit']:has-text('添加伏笔')").click(timeout=5000)
    except Exception as e:
        issues.append(Issue("高", f"创建伏笔失败: {e}", step))
        return False

    page.wait_for_timeout(800)
    assert_creation_area_finished(page, title_input, None, issues, step, "伏笔创建区域")
    assert_no_duplicates(page, page.locator(f"text={FORESHADOWING_TITLE}"), 1, issues, step, FORESHADOWING_TITLE)
    if page.locator(f"text={FORESHADOWING_TITLE}").count() == 0:
        issues.append(Issue("中", "创建伏笔后未在面板中显示", step))
    return True


def test_ai_panel(page, issues):
    step = "AI助手面板"
    try:
        page.click("nav button:has-text('AI 助手')", timeout=5000)
    except Exception as e:
        issues.append(Issue("高", f"打开AI助手面板失败: {e}", step))
        return False

    page.wait_for_timeout(600)
    try:
        page.click("button:has-text('内容分析')", timeout=5000)
    except Exception as e:
        issues.append(Issue("中", f"点击内容分析卡片失败: {e}", step))
        return False

    page.wait_for_timeout(400)
    try:
        inputs = page.locator("textarea, input[type='text']").all()
        found = False
        for inp in inputs:
            val = inp.input_value()
            if "请帮我分析以下内容" in val:
                found = True
                break
        if not found:
            issues.append(Issue("中", "点击内容分析后输入框未出现提示前缀", step))
    except Exception as e:
        issues.append(Issue("低", f"检查AI输入框失败: {e}", step))
    return True


def test_themes(page, issues):
    step = "主题切换"
    try:
        page.click("button[aria-label='选择主题']", timeout=5000)
        page.wait_for_timeout(500)
    except Exception as e:
        issues.append(Issue("中", f"打开主题选择器失败: {e}", step))
        return

    for name, expected in THEME_MAP:
        try:
            btn = page.locator("button", has_text=re.compile(re.escape(name))).filter(visible=True)
            if btn.count() == 0:
                page.click("button[aria-label='选择主题']", timeout=5000)
                page.wait_for_timeout(600)
                btn = page.locator("button", has_text=re.compile(re.escape(name))).filter(visible=True)
            btn.first.click(timeout=5000)
        except Exception as e:
            issues.append(Issue("中", f"切换到主题 {name} 失败: {e}", step))
            continue

        page.wait_for_timeout(700)
        try:
            actual = page.evaluate("() => document.documentElement.dataset.theme")
            if actual != expected:
                issues.append(Issue("中", f"主题 {name} 后 dataset.theme={actual}，期望 {expected}", step))
        except Exception as e:
            issues.append(Issue("低", f"读取主题dataset失败: {e}", step))

    try:
        page.keyboard.press("Escape")
    except Exception:
        pass


def switch_views(page, issues, shot_prefix):
    step = "视图标签切换"
    for label in VIEW_TABS:
        try:
            page.click(f"button:has-text('{label}')", timeout=5000)
            page.wait_for_timeout(600)
            page.wait_for_load_state("networkidle", timeout=5000)
        except Exception as e:
            issues.append(Issue("中", f"切换到视图 {label} 失败: {e}", step))


def run_browser_tests(browser_type, p, issues, shots_index):
    browser_label = browser_type.name
    print(f"\n[browser] starting {browser_label}")
    try:
        browser = browser_type.launch(headless=True)
    except Exception as e:
        issues.append(Issue("中", f"无法启动 {browser_label}: {e}", "多浏览器基础加载"))
        return

    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    logs, errors = [], []

    try:
        page.goto(BASE_URL, timeout=15000)
        page.wait_for_load_state("networkidle", timeout=10000)
    except Exception as e:
        issues.append(Issue("高", f"{browser_label} 首页加载失败: {e}", "多浏览器基础加载"))
        browser.close()
        return

    attach_log_handlers(page, logs, errors, issues, f"{browser_label} | ")

    check_home_elements(page, issues, browser_label)
    check_garbled_workspaces(page, issues)
    shot_path = screenshot(page, f"{browser_label}/01-home.png", issues, "多浏览器基础加载")
    if shot_path:
        shots_index.append((browser_label, "01-home", shot_path))

    if not create_or_select_workspace(page, issues):
        collect_severe_logs(logs, errors, issues, browser_label)
        browser.close()
        return

    shot_path = screenshot(page, f"{browser_label}/02-workspace-main.png", issues, "工作区CRUD")
    if shot_path:
        shots_index.append((browser_label, "02-workspace-main", shot_path))

    if page.locator("button:has-text('时间轴')").count() > 0:
        page.click("button:has-text('时间轴')", timeout=5000)
        page.wait_for_timeout(600)

    create_track(page, issues)
    create_event_via_toolbar(page, issues)
    verify_event_on_timeline(page, issues)
    shot_path = screenshot(page, f"{browser_label}/03-timeline.png", issues, "时间轴功能")
    if shot_path:
        shots_index.append((browser_label, "03-timeline", shot_path))

    quick_edit_in_outline(page, issues)
    shot_path = screenshot(page, f"{browser_label}/04-outline.png", issues, "大纲视图")
    if shot_path:
        shots_index.append((browser_label, "04-outline", shot_path))

    if create_character(page, issues):
        shot_path = screenshot(page, f"{browser_label}/05-characters.png", issues, "角色面板")
        if shot_path:
            shots_index.append((browser_label, "05-characters", shot_path))

    if create_world_setting(page, issues):
        shot_path = screenshot(page, f"{browser_label}/06-worldview.png", issues, "世界观面板")
        if shot_path:
            shots_index.append((browser_label, "06-worldview", shot_path))

    if create_foreshadowing(page, issues):
        shot_path = screenshot(page, f"{browser_label}/07-foreshadowing.png", issues, "伏笔面板")
        if shot_path:
            shots_index.append((browser_label, "07-foreshadowing", shot_path))

    if test_ai_panel(page, issues):
        shot_path = screenshot(page, f"{browser_label}/08-ai-panel.png", issues, "AI助手面板")
        if shot_path:
            shots_index.append((browser_label, "08-ai-panel", shot_path))

    test_themes(page, issues)
    shot_path = screenshot(page, f"{browser_label}/09-theme-luosheng.png", issues, "主题切换")
    if shot_path:
        shots_index.append((browser_label, "09-theme-luosheng", shot_path))

    switch_views(page, issues, f"{browser_label}/")
    shot_path = screenshot(page, f"{browser_label}/10-views.png", issues, "视图标签切换")
    if shot_path:
        shots_index.append((browser_label, "10-views", shot_path))

    collect_severe_logs(logs, errors, issues, browser_label)

    browser.close()


def run_responsive_tests(p, issues, shots_index):
    step_prefix = "响应式测试"
    try:
        browser = p.chromium.launch(headless=True)
    except Exception as e:
        issues.append(Issue("中", f"响应式测试无法启动 Chromium: {e}", step_prefix))
        return

    for name, w, h in RESPONSIVE_SIZES:
        context = browser.new_context(viewport={"width": w, "height": h})
        page = context.new_page()
        try:
            page.goto(BASE_URL, timeout=15000)
            page.wait_for_load_state("networkidle", timeout=10000)
            shot_path = screenshot(page, f"responsive/{name}.png", issues, step_prefix)
            if shot_path:
                shots_index.append(("responsive", name, shot_path))

            overflow = page.evaluate("""() => {
                const body = document.body;
                const html = document.documentElement;
                return {
                    scrollWidth: Math.max(body.scrollWidth, html.scrollWidth),
                    clientWidth: window.innerWidth,
                    scrollHeight: Math.max(body.scrollHeight, html.scrollHeight),
                    clientHeight: window.innerHeight
                };
            }""")
            if overflow["scrollWidth"] > overflow["clientWidth"] + 5:
                issues.append(Issue("中", f"{name} 检测到水平布局溢出 (scrollWidth={overflow['scrollWidth']}, clientWidth={overflow['clientWidth']})", step_prefix))
            if overflow["scrollHeight"] > overflow["clientHeight"] + 5:
                issues.append(Issue("低", f"{name} 检测到垂直滚动 (scrollHeight={overflow['scrollHeight']}, clientHeight={overflow['clientHeight']})", step_prefix))

            try:
                boxes = page.locator("header, nav, main").all()
                rects = []
                for el in boxes:
                    rects.append(el.bounding_box())
                found_overlap = False
                for i, r1 in enumerate(rects):
                    if not r1 or found_overlap:
                        continue
                    for r2 in rects[i + 1:]:
                        if not r2:
                            continue
                        if (r1["x"] < r2["x"] + r2["width"] and r1["x"] + r1["width"] > r2["x"] and
                                r1["y"] < r2["y"] + r2["height"] and r1["y"] + r1["height"] > r2["y"]):
                            issues.append(Issue("中", f"{name} 检测到主要布局元素重叠", step_prefix))
                            found_overlap = True
                            break
            except Exception as e:
                issues.append(Issue("低", f"{name} 重叠检测失败: {e}", step_prefix))
        except Exception as e:
            issues.append(Issue("中", f"{name} 响应式测试失败: {e}", step_prefix))
        finally:
            context.close()

    browser.close()


def write_report(issues, shots_index, browser_info):
    ensure_dir(REPORT_DIR)
    report_path = os.path.join(REPORT_DIR, "全面测试报告 v1.0.0.md")

    high = [i for i in issues if i.priority == "高"]
    medium = [i for i in issues if i.priority == "中"]
    low = [i for i in issues if i.priority == "低"]
    passed = len(high) == 0

    lines = []
    lines.append("# 全面测试报告 v1.0.1（修复后验证）\n")
    lines.append(f"> 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append("> 说明：本次测试为修复后验证（v1.0.1 验证测试），重点关注对话框关闭、重复创建、全程 pageerror 监听等回归项。\n")
    lines.append("## 测试环境\n")
    lines.append(f"- 操作系统：{platform.system()} {platform.release()} ({platform.machine()})\n")
    for bi in browser_info:
        lines.append(f"- {bi}\n")
    lines.append("\n## 通过/失败摘要\n")
    lines.append(f"- 高优先级问题：{len(high)}\n")
    lines.append(f"- 中优先级问题：{len(medium)}\n")
    lines.append(f"- 低优先级问题：{len(low)}\n")
    lines.append(f"- 总体结果：{'通过' if passed else '未通过'}（无高优先级问题视为通过）\n")
    lines.append("\n## 问题清单\n")
    lines.append("### 高优先级\n")
    if high:
        for i in high:
            lines.append(f"- {i}\n")
    else:
        lines.append("- 无\n")
    lines.append("\n### 中优先级\n")
    if medium:
        for i in medium:
            lines.append(f"- {i}\n")
    else:
        lines.append("- 无\n")
    lines.append("\n### 低优先级\n")
    if low:
        for i in low:
            lines.append(f"- {i}\n")
    else:
        lines.append("- 无\n")
    lines.append("\n## 截图索引\n")
    grouped = defaultdict(list)
    for browser, name, path in shots_index:
        rel = os.path.relpath(path, REPORT_DIR).replace("\\", "/")
        grouped[browser].append((name, rel))
    for browser in sorted(grouped.keys()):
        lines.append(f"\n### {browser}\n")
        for name, rel in grouped[browser]:
            lines.append(f"- [{name}](./{rel})\n")

    with open(report_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    return report_path


def main():
    import argparse
    parser = argparse.ArgumentParser(description="AI Timeline Creator 全面测试")
    parser.add_argument(
        "--browser",
        choices=["all", "chromium", "firefox", "webkit"],
        default="all",
        help="选择跑哪个浏览器（默认 all）",
    )
    args, _ = parser.parse_known_args()

    print("=" * 60)
    print(f"AI Timeline Creator 全面测试（browser={args.browser}）")
    print("=" * 60)

    ensure_dir(SHOT_BASE)
    issues = []
    shots_index = []
    browser_info = []

    server_proc = None
    backend_proc = None
    try:
        if not wait_for_server(BACKEND_PORT, timeout=3):
            backend_proc = start_dev_backend()
        else:
            print(f"[server] {BACKEND_URL} 已运行")

        if not wait_for_server(SERVER_PORT, timeout=3):
            server_proc = start_dev_server()
        else:
            print(f"[server] {BASE_URL} 已运行")

        with sync_playwright() as p:
            all_browsers = {
                "chromium": p.chromium,
                "firefox": p.firefox,
                "webkit": p.webkit,
            }
            if args.browser == "all":
                browsers = list(all_browsers.values())
            else:
                browsers = [all_browsers[args.browser]]

            for bt in browsers:
                try:
                    b = bt.launch(headless=True)
                    ver = b.version
                    browser_info.append(f"{bt.name}: {ver}")
                    b.close()
                except Exception as e:
                    browser_info.append(f"{bt.name}: 未可用 ({e})")

            for bt in browsers:
                run_browser_tests(bt, p, issues, shots_index)

            run_responsive_tests(p, issues, shots_index)

    finally:
        stop_process(server_proc)
        stop_process(backend_proc)

    report_path = write_report(issues, shots_index, browser_info)
    print(f"\n[report] {report_path}")
    print(f"[summary] 高:{len([i for i in issues if i.priority=='高'])} 中:{len([i for i in issues if i.priority=='中'])} 低:{len([i for i in issues if i.priority=='低'])}")

    for i in issues:
        print(f"[issue] {i}")

    has_high = any(i.priority == "高" for i in issues)
    sys.exit(1 if has_high else 0)


if __name__ == "__main__":
    main()
