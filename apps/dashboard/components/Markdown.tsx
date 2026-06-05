"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Render assistant markdown (GFM tables, bold, lists, code) styled to match the
 * dashboard. Used for chat replies so tables and emphasis render properly
 * instead of showing raw markdown text.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (props) => <p className="my-2" {...props} />,
          strong: (props) => <strong className="font-semibold" {...props} />,
          ul: (props) => <ul className="my-2 list-disc pl-5" {...props} />,
          ol: (props) => <ol className="my-2 list-decimal pl-5" {...props} />,
          li: (props) => <li className="my-0.5" {...props} />,
          h1: (props) => <h1 className="mb-2 mt-3 text-base font-bold" {...props} />,
          h2: (props) => <h2 className="mb-2 mt-3 text-sm font-bold" {...props} />,
          h3: (props) => <h3 className="mb-1 mt-3 text-sm font-semibold" {...props} />,
          a: (props) => (
            <a className="text-brand underline" target="_blank" rel="noreferrer" {...props} />
          ),
          code: ({ className, children, ...props }) => {
            const inline = !String(className ?? "").includes("language-");
            return inline ? (
              <code
                className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/10"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code className="font-mono text-xs" {...props}>
                {children}
              </code>
            );
          },
          pre: (props) => (
            <pre
              className="my-2 overflow-x-auto rounded-lg bg-black/5 p-3 text-xs dark:bg-white/5"
              {...props}
            />
          ),
          table: (props) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="min-w-full border-collapse text-sm" {...props} />
            </div>
          ),
          thead: (props) => (
            <thead className="bg-slate-100/80 dark:bg-slate-800/60" {...props} />
          ),
          th: (props) => (
            <th
              className="border-b border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700"
              {...props}
            />
          ),
          td: (props) => (
            <td
              className="border-b border-slate-100 px-3 py-1.5 align-top dark:border-slate-800"
              {...props}
            />
          ),
          tr: (props) => <tr className="last:[&>td]:border-0" {...props} />,
          blockquote: (props) => (
            <blockquote
              className="my-2 border-l-2 border-brand/40 pl-3 text-slate-500"
              {...props}
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
