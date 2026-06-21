; ============================================================================
; Storyloom · 织叙 — 自定义 NSIS 安装脚本
; 基于 Tauri 2.x NSIS 模板深度定制
; 非模板化设计：自定义欢迎页、进度文字、完成页按钮
; ============================================================================

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include " nsDialogs.nsh"

; === Tauri 注入变量（由构建时替换） ===
!define PRODUCT_NAME "{{product_name}}"
!define VERSION "{{version}}"
!define SHORT_VERSION "{{version}}"
!define PRODUCT_IDENTIFIER "{{identifier}}"
!define INSTALLER_ICON "{{installer_icon}}"
!define SIDEBAR_IMAGE "{{sidebar_image}}"
!define HEADER_IMAGE "{{header_image}}"
!define LICENSE_PATH "{{license}}"
!define MAIN_BINARY_NAME "{{main_binary_name}}"
!define MAIN_BINARY_PATH "{{main_binary_path}}"
!define OUT_FILE "{{out_file}}"
!define INSTALL_MODE "{{install_mode}}"
!define START_MENU_FOLDER "{{start_menu_folder}}"
!define BUNDLE_ID "{{bundle_id}}"
!define APPDATA_FOLDER "{{appdata_folder}}"
!define LOCALAPPDATA_FOLDER "{{localappdata_folder}}"

; === 常量 ===
!define MUI_PRODUCT "Storyloom"
!define MUI_BRANDTEXT "织叙 — 用一根时间线，把故事织成宇宙"

; === 安装模式 ===
!if "${INSTALL_MODE}" == "both"
  !define MULTIUSER_MUI
  !define MULTIUSER_INSTALLMODE_ALLOW_BOTH_INSTALLATION_MODES
  !define MULTIUSER_INSTALLMODE_DEFAULT_CURRENTUSER
!else if "${INSTALL_MODE}" == "perMachine"
  RequestExecutionLevel admin
!else
  RequestExecutionLevel user
!endif

; === 压缩 ===
SetCompressor /SOLID lzma
SetCompressorDictSize 64

; === 元数据 ===
Name "${PRODUCT_NAME}"
OutFile "${OUT_FILE}"
BrandingText "${MUI_BRANDTEXT}"
Icon "${INSTALLER_ICON}"
Caption "$(^Name) 安装程序"

; === 页面大小 ===
!define MUI_PAGE_CUSTOMFUNCTION_SHOW WelcomePageShow
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE WelcomePageLeave

; === MUI 设置 ===
!define MUI_ABORTWARNING
!define MUI_ABORTWARNING_TEXT "你确定要退出织叙安装程序吗？"

; 欢迎页
!define MUI_WELCOMEFINISHPAGE_BITMAP "${SIDEBAR_IMAGE}"
!define MUI_WELCOMEFINISHPAGE_BITMAP_STRETCH NoStretch
!define MUI_WELCOMEPAGE_TITLE "欢迎来到织叙"
!define MUI_WELCOMEPAGE_TEXT "\
        用一根时间线，把故事织成宇宙。$
$
        织叙（Storyloom）是面向小说作者、编剧和游戏叙事设计师的\
        全功能创作工具。它将时间轴、角色、世界观与 AI 助手编织在一起，\
        为你的叙事宇宙提供完整的创作工作台。$
$
        安装程序将引导你在几分钟内完成安装。"

; 头部图片
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${HEADER_IMAGE}"
!define MUI_HEADERIMAGE_BITMAP_STRETCH NoStretch

; 图标
!define MUI_ICON "${INSTALLER_ICON}"
!define MUI_UNICON "${INSTALLER_ICON}"

; 许可页
!ifdef LICENSE_PATH
  !define MUI_LICENSEPAGE_TEXT_TOP "在安装织叙之前，请阅读以下许可协议。"
  !define MUI_LICENSEPAGE_TEXT_BOTTOM "如果你接受协议中的条款，请单击「我同意」继续安装。"
  !define MUI_LICENSEPAGE_CHECKBOX
  !define MUI_LICENSEPAGE_CHECKBOX_TEXT "我同意上述许可协议 (I Agree)"
!endif

; 目录页
!define MUI_DIRECTORYPAGE_TEXT_TOP "选择织叙的安装文件夹。建议保持默认位置。"
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "安装文件夹"

; 进度页 — 自定义文字
!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "安装完成"
!define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "你的故事工作台已准备就绪。"
!define MUI_INSTFILESPAGE_ABORTHEADER_TEXT "安装已取消"
!define MUI_INSTFILESPAGE_ABORTHEADER_SUBTEXT "安装未完成。"

; 完成页 — 品牌定制
!define MUI_FINISHPAGE_TITLE "安装完成"
!define MUI_FINISHPAGE_TEXT "\
        织叙已成功安装到你的计算机。$
$
        现在，你可以开始编织属于你的故事宇宙了。"
!define MUI_FINISHPAGE_RUN "$INSTDIR\\${MAIN_BINARY_NAME}.exe"
!define MUI_FINISHPAGE_RUN_TEXT "立即启动织叙"
!define MUI_FINISHPAGE_RUN_NOTCHECKED
!define MUI_FINISHPAGE_LINK "访问织叙官网"
!define MUI_FINISHPAGE_LINK_LOCATION "https://github.com/YJLZSL/Storyloom"
!define MUI_FINISHPAGE_NOREBOOTSUPPORT

; 卸载页
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "${SIDEBAR_IMAGE}"
!define MUI_UNFINISHPAGE_TITLE "卸载完成"
!define MUI_UNFINISHPAGE_TEXT "\
        织叙已从你的计算机中移除。$
$
        期待与你的故事再次相遇。"

; === 语言 ===
!insertmacro MUI_LANGUAGE "SimpChinese"

; === 自定义字体/颜色（如果 NSIS 支持） ===
; 使用现代 UI 风格
!define MUI_UI "${NSISDIR}\\Contrib\\UIs\\modern.exe"

; ============================================================================
; 页面定义
; ============================================================================
!insertmacro MUI_PAGE_WELCOME

!ifdef LICENSE_PATH
  !insertmacro MUI_PAGE_LICENSE "${LICENSE_PATH}"
!endif

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; ============================================================================
; 安装区段
; ============================================================================
Section "织叙 (Storyloom)" SEC_MAIN
  SectionIn RO
  SetOutPath "$INSTDIR"

  ; 主二进制
  File /oname=${MAIN_BINARY_NAME}.exe "${MAIN_BINARY_PATH}"

  ; 资源文件
  ; {{#each resources}}
  ;   File /r "{{this}}"
  ; {{/each}}

  ; 卸载程序
  WriteUninstaller "$INSTDIR\\uninstall.exe"

  ; 注册表（用于安装目录追踪）
  WriteRegStr SHCTX "Software\\${PRODUCT_IDENTIFIER}" "InstallDir" "$INSTDIR"
  WriteRegStr SHCTX "Software\\${PRODUCT_IDENTIFIER}" "Version" "${VERSION}"

  ; 开始菜单
  !insertmacro MUI_STARTMENU_WRITE_BEGIN Application
    CreateDirectory "$SMPROGRAMS\\${START_MENU_FOLDER}"
    CreateShortcut "$SMPROGRAMS\\${START_MENU_FOLDER}\\织叙.lnk" "$INSTDIR\\${MAIN_BINARY_NAME}.exe"
    CreateShortcut "$SMPROGRAMS\\${START_MENU_FOLDER}\\卸载织叙.lnk" "$INSTDIR\\uninstall.exe"
  !insertmacro MUI_STARTMENU_WRITE_END

  ; 桌面快捷方式
  CreateShortcut "$DESKTOP\\织叙.lnk" "$INSTDIR\\${MAIN_BINARY_NAME}.exe"

  ; 安装信息注册表
  WriteRegStr SHCTX "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${PRODUCT_IDENTIFIER}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr SHCTX "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${PRODUCT_IDENTIFIER}" "DisplayIcon" "$INSTDIR\\${MAIN_BINARY_NAME}.exe"
  WriteRegStr SHCTX "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${PRODUCT_IDENTIFIER}" "UninstallString" "$INSTDIR\\uninstall.exe"
  WriteRegStr SHCTX "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${PRODUCT_IDENTIFIER}" "Publisher" "Storyloom Team"
  WriteRegStr SHCTX "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${PRODUCT_IDENTIFIER}" "DisplayVersion" "${VERSION}"
  WriteRegStr SHCTX "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${PRODUCT_IDENTIFIER}" "URLInfoAbout" "https://github.com/YJLZSL/Storyloom"
  WriteRegStr SHCTX "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${PRODUCT_IDENTIFIER}" "HelpLink" "https://github.com/YJLZSL/Storyloom/issues"

SectionEnd

; ============================================================================
; 卸载区段
; ============================================================================
Section "Uninstall"
  ; 删除主文件
  Delete "$INSTDIR\\${MAIN_BINARY_NAME}.exe"
  Delete "$INSTDIR\\uninstall.exe"

  ; 删除资源
  ; {{#each resources}}
  ;   RMDir /r "$INSTDIR\\{{this}}"
  ; {{/each}}

  ; 删除快捷方式
  !insertmacro MUI_STARTMENU_GETFOLDER Application $R0
  Delete "$SMPROGRAMS\\$R0\\织叙.lnk"
  Delete "$SMPROGRAMS\\$R0\\卸载织叙.lnk"
  RMDir "$SMPROGRAMS\\$R0"
  Delete "$DESKTOP\\织叙.lnk"

  ; 删除安装目录
  RMDir "$INSTDIR"

  ; 清理注册表
  DeleteRegKey SHCTX "Software\\${PRODUCT_IDENTIFIER}"
  DeleteRegKey SHCTX "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${PRODUCT_IDENTIFIER}"
SectionEnd

; ============================================================================
; 自定义函数
; ============================================================================
Function WelcomePageShow
  ; 欢迎页显示时触发的自定义逻辑
  ; 可以设置进度条颜色或自定义控件
FunctionEnd

Function WelcomePageLeave
  ; 离开欢迎页时的逻辑
FunctionEnd

; ============================================================================
; 安装进度回调 — 自定义文字
; ============================================================================
Function .onInit
  ; 初始化：设置进度页自定义文字
  ; 获取 Tauri 构建时注入的静默安装标志
  ; {{#if silent_installer}}
  ;   SetSilent silent
  ; {{/if}}
FunctionEnd

Function .onInstSuccess
  ; 安装成功后的回调
FunctionEnd

Function .onGUIEnd
  ; 安装程序退出时的清理
FunctionEnd
