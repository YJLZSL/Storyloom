/// <reference types="vite/client" />

import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Tutorial {
  key: string;
  title: string;
  content: string;
}

const TUTORIAL_ORDER = [
  'getting-started',
  'timeline-view',
  'outline-view',
  'tree-view',
  'relationship-graph',
  'script-editor',
  'branch-map',
  'ai-panel',
  'command-palette',
  'themes-and-focus',
  'auto-backup-and-export-webgal',
];

const tutorialModules = import.meta.glob('/public/tutorials/*.md', {
  eager: true,
  as: 'raw',
}) as Record<string, string>;

function useTutorials(): Tutorial[] {
  return useMemo(() => {
    const items = Object.entries(tutorialModules).map(([path, content]) => {
      const key = path.replace(/^\/public\/tutorials\//, '').replace(/\.md$/, '');
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1].trim() ?? key;
      return { key, title, content };
    });

    return items.sort((a, b) => {
      const indexA = TUTORIAL_ORDER.indexOf(a.key);
      const indexB = TUTORIAL_ORDER.indexOf(b.key);
      return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
    });
  }, []);
}

export function TutorialTab() {
  const tutorials = useTutorials();
  const [currentKey, setCurrentKey] = useState('getting-started');
  const current = tutorials.find((t) => t.key === currentKey) ?? tutorials[0];

  return (
    <div className="flex h-full gap-4">
      <ScrollArea className="h-full w-52 shrink-0 border-r pr-3">
        <div className="flex flex-col gap-0.5 py-1">
          {tutorials.map((tutorial) => (
            <button
              key={tutorial.key}
              type="button"
              onClick={() => setCurrentKey(tutorial.key)}
              className={cn(
                'text-left px-3 py-2 rounded-md text-sm transition-colors',
                currentKey === tutorial.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              {tutorial.title}
            </button>
          ))}
        </div>
      </ScrollArea>

      <ScrollArea className="h-full flex-1">
        <div className="px-2 pb-6">
          <div className="tutorial-markdown">
            {current ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ ...props }) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    />
                  ),
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code
                          className="px-1 py-0.5 rounded bg-muted text-foreground text-[0.85em]"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children, ...props }) => (
                    <pre
                      className="my-3 p-3 rounded-md bg-muted/80 border border-border overflow-x-auto text-[0.85em] leading-relaxed"
                      {...props}
                    >
                      {children}
                    </pre>
                  ),
                  ul: ({ children, ...props }) => (
                    <ul className="my-2 pl-5 list-disc space-y-1" {...props}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children, ...props }) => (
                    <ol className="my-2 pl-5 list-decimal space-y-1" {...props}>
                      {children}
                    </ol>
                  ),
                  li: ({ children, ...props }) => (
                    <li className="leading-relaxed" {...props}>
                      {children}
                    </li>
                  ),
                  h1: ({ children, ...props }) => (
                    <h1
                      className="text-xl font-semibold mt-4 mb-3 first:mt-0"
                      {...props}
                    >
                      {children}
                    </h1>
                  ),
                  h2: ({ children, ...props }) => (
                    <h2
                      className="text-lg font-semibold mt-4 mb-2 first:mt-0"
                      {...props}
                    >
                      {children}
                    </h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3
                      className="text-base font-medium mt-3 mb-1 first:mt-0"
                      {...props}
                    >
                      {children}
                    </h3>
                  ),
                  p: ({ children, ...props }) => (
                    <p className="my-2 first:mt-0 last:mb-0 leading-relaxed" {...props}>
                      {children}
                    </p>
                  ),
                  blockquote: ({ children, ...props }) => (
                    <blockquote
                      className="my-3 pl-3 border-l-2 border-border text-muted-foreground"
                      {...props}
                    >
                      {children}
                    </blockquote>
                  ),
                  img: ({ src, alt, ...props }) => (
                    <img
                      src={src}
                      alt={alt}
                      className="rounded-md border border-border my-3 max-w-full h-auto"
                      {...props}
                    />
                  ),
                  hr: ({ ...props }) => <hr className="my-4 border-border" {...props} />,
                  table: ({ children, ...props }) => (
                    <div className="my-3 overflow-x-auto">
                      <table
                        className="min-w-full text-sm border border-border rounded"
                        {...props}
                      >
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children, ...props }) => (
                    <th
                      className="px-2 py-1 border border-border bg-muted/50 font-medium text-left"
                      {...props}
                    >
                      {children}
                    </th>
                  ),
                  td: ({ children, ...props }) => (
                    <td className="px-2 py-1 border border-border" {...props}>
                      {children}
                    </td>
                  ),
                }}
              >
                {current.content}
              </ReactMarkdown>
            ) : (
              <p className="text-sm text-muted-foreground">暂无教程内容。</p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
