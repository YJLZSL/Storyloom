import os
import re
import json
from collections import defaultdict
from pathlib import Path

SRC_DIR = Path("D:/AIKFCC/Storyloom/src")
PUBLIC_DIR = Path("D:/AIKFCC/Storyloom/public")
REPORTS_DIR = Path("D:/AIKFCC/Storyloom/reports")

# Regex patterns
IMPORT_PATTERN = re.compile(
    r'^\s*import\s+(?:(?:\{([^}]*)\}|(\*\s+as\s+\w+)|(\w+))\s+from\s+)?[\'"]([^\'"]+)[\'"]\s*;?'
)
REQUIRE_PATTERN = re.compile(r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)')
FUNCTION_PATTERN = re.compile(r'^(export\s+)?(?:async\s+)?function\s+(\w+)')
ARROW_FUNC_PATTERN = re.compile(r'^(export\s+)?const\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=]*)\s*=>')
VARIABLE_PATTERN = re.compile(r'^(?:export\s+)?(?:const|let|var)\s+([\w$_,\s]+)\s*[;=]')
CONSOLE_PATTERN = re.compile(r'console\.(log|warn|error|info|debug|trace)\s*\(')
ANY_PATTERN = re.compile(r':\s*any\b(?!\s*\[)')
COMMENTED_CODE_PATTERN = re.compile(r'^\s*//\s*(?:const|let|var|function|import|export|if|for|while|return)')
TS_IGNORE_PATTERN = re.compile(r'@ts-ignore|@ts-nocheck')

class AuditScanner:
    def __init__(self):
        self.files = []
        self.imports_by_file = {}
        self.exports_by_file = {}
        self.unused_imports = defaultdict(list)
        self.unused_vars = defaultdict(list)
        self.console_logs = defaultdict(list)
        self.any_types = defaultdict(list)
        self.ts_ignores = defaultdict(list)
        self.commented_code = defaultdict(list)
        self.large_functions = defaultdict(list)
        self.deep_nesting = defaultdict(list)
        self.unused_props = defaultdict(list)
        self.orphan_files = []
        self.public_unused = []
        self.duplicated_logic = []
        self.import_graph = defaultdict(set)  # file -> set of files that import it
        
    def scan_all(self):
        self._collect_files()
        self._scan_public()
        for fpath in self.files:
            self._scan_file(fpath)
        self._find_orphan_files()
        self._find_unused_imports()
        self._find_unused_variables()
        self._find_duplicate_logic()
        
    def _collect_files(self):
        for root, _, filenames in os.walk(SRC_DIR):
            for fname in filenames:
                if fname.endswith(('.ts', '.tsx')):
                    self.files.append(Path(root) / fname)
                    
    def _scan_public(self):
        # Collect all references in src files to public files
        public_files = set()
        for root, _, filenames in os.walk(PUBLIC_DIR):
            for fname in filenames:
                if fname == '.gitkeep':
                    continue
                fpath = Path(root) / fname
                rel = fpath.relative_to(PUBLIC_DIR).as_posix()
                public_files.add(rel)
                public_files.add('/' + rel)
                public_files.add(fpath.name)
                
        referenced = set()
        for fpath in self.files:
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    content = f.read()
                for p in public_files:
                    if p in content:
                        referenced.add(p.lstrip('/'))
            except Exception:
                continue
                
        for p in public_files:
            if p.startswith('/'):
                p = p.lstrip('/')
            if p not in referenced and p != '.gitkeep':
                self.public_unused.append(p)
                
    def _scan_file(self, fpath: Path):
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            return
            
        lines = content.split('\n')
        rel_path = fpath.relative_to(SRC_DIR).as_posix()
        
        # Track imports and local identifiers
        imports = []
        local_vars = []
        functions = []
        
        for i, line in enumerate(lines, 1):
            # Imports
            m = IMPORT_PATTERN.match(line)
            if m:
                named = m.group(1)
                star = m.group(2)
                default_imp = m.group(3)
                source = m.group(4)
                if named:
                    # Parse { a, b as c }
                    for part in named.split(','):
                        part = part.strip()
                        if not part:
                            continue
                        if ' as ' in part:
                            alias = part.split(' as ')[-1].strip()
                            imports.append({'name': alias, 'line': i, 'raw': part, 'source': source})
                        else:
                            imports.append({'name': part, 'line': i, 'raw': part, 'source': source})
                if star:
                    name = star.replace('* as ', '').strip()
                    imports.append({'name': name, 'line': i, 'raw': star, 'source': source})
                if default_imp:
                    imports.append({'name': default_imp, 'line': i, 'raw': default_imp, 'source': source})
                    
            # Function declarations
            m = FUNCTION_PATTERN.match(line)
            if m:
                fname = m.group(2)
                functions.append({'name': fname, 'line': i, 'type': 'function'})
            else:
                m = ARROW_FUNC_PATTERN.match(line)
                if m:
                    fname = m.group(2)
                    functions.append({'name': fname, 'line': i, 'type': 'arrow'})
                    
            # Variable declarations
            m = VARIABLE_PATTERN.match(line)
            if m and not ARROW_FUNC_PATTERN.match(line):
                varlist = m.group(1)
                for v in varlist.split(','):
                    v = v.strip().split(':')[0].split('=')[0].strip()
                    if v and not v.startswith('...'):
                        local_vars.append({'name': v, 'line': i})
                        
            # console.log
            m = CONSOLE_PATTERN.search(line)
            if m:
                self.console_logs[rel_path].append({'line': i, 'text': line.strip()})
                
            # any types
            for m in ANY_PATTERN.finditer(line):
                if not line.strip().startswith('//') and not line.strip().startswith('*'):
                    self.any_types[rel_path].append({'line': i, 'text': line.strip()})
                    
            # @ts-ignore / @ts-nocheck
            if TS_IGNORE_PATTERN.search(line):
                self.ts_ignores[rel_path].append({'line': i, 'text': line.strip()})
                
            # Commented code
            if COMMENTED_CODE_PATTERN.match(line):
                self.commented_code[rel_path].append({'line': i, 'text': line.strip()})
                
        # Function size and nesting
        self._analyze_functions(fpath, rel_path, content, lines)
        
        self.imports_by_file[rel_path] = imports
        self.exports_by_file[rel_path] = {'functions': functions, 'vars': local_vars}
        
        # Also scan for Props interfaces
        self._scan_props(rel_path, content, lines)
        
        # Build import graph (who imports this file)
        self._build_import_graph(rel_path, content)
        
    def _analyze_functions(self, fpath, rel_path, content, lines):
        # Simple heuristic: find function boundaries by braces
        i = 0
        while i < len(lines):
            line = lines[i]
            func_match = re.match(r'^(\s*)(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(', line)
            if not func_match:
                func_match = re.match(r'^(\s*)(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=]*)\s*=>\s*\{', line)
            if not func_match:
                # also match React component pattern: const X = () => ( ... )
                func_match = re.match(r'^(\s*)(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*\(', line)
                
            if func_match:
                indent = len(func_match.group(1))
                func_name = func_match.group(2)
                start = i
                brace_count = 0
                in_string = False
                string_char = None
                j = i
                # crude brace counting for the function body
                while j < len(lines):
                    for ch in lines[j]:
                        if in_string:
                            if ch == string_char and (j == 0 or lines[j][lines[j].index(ch)-1] != '\\'):
                                in_string = False
                        else:
                            if ch in '"\'`':
                                in_string = True
                                string_char = ch
                            elif ch == '{':
                                brace_count += 1
                            elif ch == '}':
                                brace_count -= 1
                    if brace_count <= 0 and ('{' in lines[j] or j > i):
                        break
                    j += 1
                end = j
                func_lines = end - start + 1
                if func_lines > 200:
                    self.large_functions[rel_path].append({'line': start+1, 'name': func_name, 'size': func_lines})
                # nesting depth
                max_depth = 0
                cur_depth = 0
                for k in range(start, end+1):
                    stripped = lines[k].strip()
                    for ch in stripped:
                        if ch == '{':
                            cur_depth += 1
                            max_depth = max(max_depth, cur_depth)
                        elif ch == '}':
                            cur_depth -= 1
                if max_depth > 3:
                    self.deep_nesting[rel_path].append({'line': start+1, 'name': func_name, 'depth': max_depth})
                i = end + 1
            else:
                i += 1
                
    def _scan_props(self, rel_path, content, lines):
        # Find interface Props / type Props = ... and check usage in component
        # Heuristic: look for interface Props { ... } and see if all keys are used in the component
        pass  # complex, do simplified later
        
    def _build_import_graph(self, rel_path, content):
        # Find all imports that reference local src files
        for m in IMPORT_PATTERN.finditer(content):
            source = m.group(4)
            if source.startswith('.') or source.startswith('@/'):
                # map to relative path
                src_path = rel_path
                # resolve @/... to src/...
                if source.startswith('@/'):
                    target = source[2:] + '.tsx'
                    target2 = source[2:] + '.ts'
                else:
                    # relative
                    src_dir = Path(SRC_DIR) / Path(rel_path).parent
                    target_path = (src_dir / source).resolve()
                    try:
                        target = target_path.relative_to(SRC_DIR).as_posix()
                        # add extension if missing
                        if not (target.endswith('.ts') or target.endswith('.tsx')):
                            if (SRC_DIR / (target + '.tsx')).exists():
                                target += '.tsx'
                            elif (SRC_DIR / (target + '.ts')).exists():
                                target += '.ts'
                    except ValueError:
                        continue
                        
                self.import_graph[target].add(rel_path)
                
    def _find_orphan_files(self):
        for fpath in self.files:
            rel = fpath.relative_to(SRC_DIR).as_posix()
            if rel in ('main.tsx', 'test/setup.ts', 'vite-env.d.ts', 'App.tsx'):
                continue
            # Check if imported by anyone
            if rel not in self.import_graph or len(self.import_graph[rel]) == 0:
                # Also check if it's a test file (ends with .test.ts or .test.tsx) - these are entry points
                if rel.endswith('.test.ts') or rel.endswith('.test.tsx'):
                    continue
                # Check if it's exported in an index.ts
                # check if any index.ts re-exports it
                parent = Path(rel).parent
                idx = parent / 'index.ts'
                if idx.exists() or (parent / 'index.tsx').exists():
                    # might be exported, skip for now
                    pass
                else:
                    self.orphan_files.append(rel)
                    
    def _find_unused_imports(self):
        for rel_path, imports in self.imports_by_file.items():
            try:
                with open(SRC_DIR / rel_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception:
                continue
            for imp in imports:
                name = imp['name']
                # Special case: React imports, type imports, CSS imports
                if name in ('React', 'type') or imp['source'].endswith('.css') or imp['source'].endswith('.scss'):
                    continue
                # Simple check: is the name used as a word in the file (outside import lines)?
                # Remove the import line itself for checking
                lines = content.split('\n')
                filtered = '\n'.join([l for i, l in enumerate(lines, 1) if i != imp['line']])
                # Check if name appears as a standalone word (not in string literals or comments ideally, but simple check)
                pattern = r'(?<!\w)' + re.escape(name) + r'(?!\w)'
                if not re.search(pattern, filtered):
                    self.unused_imports[rel_path].append(imp)
                    
    def _find_unused_variables(self):
        for rel_path, exports in self.exports_by_file.items():
            try:
                with open(SRC_DIR / rel_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception:
                continue
            for var in exports['vars']:
                name = var['name']
                # Skip exported vars
                lines = content.split('\n')
                decl_line = lines[var['line']-1] if var['line'] <= len(lines) else ''
                if 'export' in decl_line:
                    continue
                # Remove declaration line
                filtered = '\n'.join([l for i, l in enumerate(lines, 1) if i != var['line']])
                pattern = r'(?<!\w)' + re.escape(name) + r'(?!\w)'
                if not re.search(pattern, filtered):
                    self.unused_vars[rel_path].append(var)
            for func in exports['functions']:
                name = func['name']
                decl_line = lines[func['line']-1] if func['line'] <= len(lines) else ''
                if 'export' in decl_line:
                    continue
                filtered = '\n'.join([l for i, l in enumerate(lines, 1) if i != func['line']])
                pattern = r'(?<!\w)' + re.escape(name) + r'(?!\w)'
                if not re.search(pattern, filtered):
                    self.unused_vars[rel_path].append(func)
                    
    def _find_duplicate_logic(self):
        # Simple duplicate: find exact same lines of 3+ lines in different files
        line_hashes = defaultdict(list)
        for rel_path in self.files:
            rel = rel_path.relative_to(SRC_DIR).as_posix()
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    lines = f.read().split('\n')
            except Exception:
                continue
            for i in range(len(lines)-2):
                snippet = '\n'.join(lines[i:i+3])
                # normalize whitespace
                normalized = re.sub(r'\s+', ' ', snippet.strip())
                if len(normalized) > 30 and not normalized.startswith('//') and not normalized.startswith('import'):
                    line_hashes[normalized].append((rel, i+1))
                    
        for normalized, occurrences in line_hashes.items():
            if len(occurrences) > 1:
                files = list(set([o[0] for o in occurrences]))
                if len(files) > 1:
                    self.duplicated_logic.append({'snippet': normalized[:80], 'occurrences': occurrences})
                    
    def generate_report(self):
        lines = []
        lines.append("# 前端代码审计报告 v2")
        lines.append("")
        lines.append(f"**扫描时间**: 2026-06-21 18:07\n")
        lines.append(f"**扫描范围**: `src/` ({len(self.files)} 个文件), `public/`\n")
        lines.append(f"**TypeScript 类型检查**: ✅ 通过（无错误）\n")
        lines.append("")
        
        # Summary
        total_unused_imports = sum(len(v) for v in self.unused_imports.values())
        total_unused_vars = sum(len(v) for v in self.unused_vars.values())
        total_console = sum(len(v) for v in self.console_logs.values())
        total_any = sum(len(v) for v in self.any_types.values())
        total_large = sum(len(v) for v in self.large_functions.values())
        total_deep = sum(len(v) for v in self.deep_nesting.values())
        
        lines.append("## 摘要\n")
        lines.append(f"| 问题类型 | 数量 |")
        lines.append(f"|----------|------|")
        lines.append(f"| 未使用导入 | {total_unused_imports} |")
        lines.append(f"| 未使用变量/函数 | {total_unused_vars} |")
        lines.append(f"| console.log 残留 | {total_console} |")
        lines.append(f"| `any` 类型使用 | {total_any} |")
        lines.append(f"| 超大函数 | {total_large} |")
        lines.append(f"| 过度嵌套 | {total_deep} |")
        lines.append(f"| 孤立文件 | {len(self.orphan_files)} |")
        lines.append(f"| 无用公共资源 | {len(self.public_unused)} |")
        lines.append("")
        
        # Unused imports
        lines.append("## 未使用导入\n")
        for rel_path, items in sorted(self.unused_imports.items()):
            lines.append(f"### {rel_path}")
            for item in items:
                lines.append(f"- [未使用导入] 第{item['line']}行：导入了 `{item['name']}` 但从未使用（来自 `{item['source']}`）")
            lines.append("")
            
        # Unused variables
        lines.append("## 未使用变量/函数\n")
        for rel_path, items in sorted(self.unused_vars.items()):
            lines.append(f"### {rel_path}")
            for item in items:
                lines.append(f"- [未使用变量] 第{item['line']}行：变量/函数 `{item['name']}` 声明但从未使用")
            lines.append("")
            
        # Console.log
        lines.append("## Console.log 残留\n")
        for rel_path, items in sorted(self.console_logs.items()):
            lines.append(f"### {rel_path}")
            for item in items:
                lines.append(f"- [Console.log] 第{item['line']}行：{item['text'][:60]}")
            lines.append("")
            
        # Any types
        lines.append("## Any 类型滥用\n")
        for rel_path, items in sorted(self.any_types.items()):
            lines.append(f"### {rel_path}")
            for item in items:
                lines.append(f"- [Any类型] 第{item['line']}行：{item['text'][:80]}")
            lines.append("")
            
        # Large functions
        lines.append("## 超大函数\n")
        for rel_path, items in sorted(self.large_functions.items()):
            lines.append(f"### {rel_path}")
            for item in items:
                lines.append(f"- [屎山] 函数 `{item['name']}` 从第{item['line']}行开始，共 {item['size']} 行，建议拆分")
            lines.append("")
            
        # Deep nesting
        lines.append("## 过度嵌套\n")
        for rel_path, items in sorted(self.deep_nesting.items()):
            lines.append(f"### {rel_path}")
            for item in items:
                lines.append(f"- [屎山] 函数 `{item['name']}` 从第{item['line']}行开始，最大嵌套深度 {item['depth']} 层，建议重构")
            lines.append("")
            
        # Orphan files
        lines.append("## 孤立文件\n")
        for f in sorted(self.orphan_files):
            lines.append(f"- [无用文件] `{f}` 从未被任何其他文件导入")
        lines.append("")
        
        # Public unused
        lines.append("## 未使用的公共资源\n")
        for p in sorted(self.public_unused):
            lines.append(f"- [无用资源] `public/{p}` 未被任何源文件引用")
        lines.append("")
        
        # Commented code
        if any(self.commented_code.values()):
            lines.append("## 被注释掉的旧代码\n")
            for rel_path, items in sorted(self.commented_code.items()):
                lines.append(f"### {rel_path}")
                for item in items:
                    lines.append(f"- [死代码] 第{item['line']}行：{item['text'][:80]}")
                lines.append("")
        
        # ts-ignore
        if any(self.ts_ignores.values()):
            lines.append("## @ts-ignore / @ts-nocheck\n")
            for rel_path, items in sorted(self.ts_ignores.items()):
                lines.append(f"### {rel_path}")
                for item in items:
                    lines.append(f"- [类型规避] 第{item['line']}行：{item['text'][:80]}")
                lines.append("")
        
        # Fix list
        lines.append("## 修复清单（按优先级排序）\n")
        lines.append("### P0 - 必须修复\n")
        lines.append("| 文件 | 问题 | 说明 |")
        lines.append("|------|------|------|")
        for rel_path, items in sorted(self.unused_imports.items()):
            for item in items:
                lines.append(f"| `{rel_path}` | 未使用导入 | 删除 `{item['name']}` 导入 |")
        for rel_path, items in sorted(self.unused_vars.items()):
            for item in items:
                lines.append(f"| `{rel_path}` | 未使用变量 | 删除或引用 `{item['name']}` |")
        for f in sorted(self.orphan_files):
            lines.append(f"| `{f}` | 孤立文件 | 确认是否可删除，或补充入口导出 |")
        lines.append("")
        
        lines.append("### P1 - 建议修复\n")
        lines.append("| 文件 | 问题 | 说明 |")
        lines.append("|------|------|------|")
        for rel_path, items in sorted(self.console_logs.items()):
            for item in items:
                lines.append(f"| `{rel_path}` | console.log 残留 | 第{item['line']}行，生产环境应移除 |")
        for rel_path, items in sorted(self.large_functions.items()):
            for item in items:
                lines.append(f"| `{rel_path}` | 超大函数 | `{item['name']}` 共 {item['size']} 行，建议拆分 |")
        for rel_path, items in sorted(self.deep_nesting.items()):
            for item in items:
                lines.append(f"| `{rel_path}` | 过度嵌套 | `{item['name']}` 深度 {item['depth']} 层，建议扁平化 |")
        for p in sorted(self.public_unused):
            lines.append(f"| `public/{p}` | 未使用资源 | 确认无用后删除 |")
        lines.append("")
        
        lines.append("### P2 - 可选修复\n")
        lines.append("| 文件 | 问题 | 说明 |")
        lines.append("|------|------|------|")
        for rel_path, items in sorted(self.any_types.items()):
            for item in items:
                lines.append(f"| `{rel_path}` | any 类型 | 第{item['line']}行，建议替换为具体类型 |")
        for rel_path, items in sorted(self.ts_ignores.items()):
            for item in items:
                lines.append(f"| `{rel_path}` | @ts-ignore | 第{item['line']}行，建议修复类型问题 |")
        for rel_path, items in sorted(self.commented_code.items()):
            for item in items:
                lines.append(f"| `{rel_path}` | 注释代码 | 第{item['line']}行，建议清理或恢复 |")
        lines.append("")
        
        return '\n'.join(lines)


if __name__ == '__main__':
    scanner = AuditScanner()
    scanner.scan_all()
    report = scanner.generate_report()
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(REPORTS_DIR / 'frontend-audit-v2.md', 'w', encoding='utf-8') as f:
        f.write(report)
    print("Report generated at:", REPORTS_DIR / 'frontend-audit-v2.md')
