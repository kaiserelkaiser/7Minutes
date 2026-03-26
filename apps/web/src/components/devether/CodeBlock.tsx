import React from 'react';
import { cn } from '@/lib/utils';

export function CodeBlock({ code, color }: { code: string, color: string }) {
  return (
    <div 
      className="mt-2 mb-2 p-3 rounded-lg border bg-black/60 backdrop-blur-xl font-mono text-xs sm:text-sm overflow-x-auto"
      style={{ 
        borderColor: `${color}40`,
        boxShadow: `0 4px 20px ${color}15, inset 0 0 10px ${color}10`
      }}
    >
      <pre className="text-gray-200">
        <code>
          {code.split('\n').map((line, i) => (
            <div key={i} className="table-row">
              <span 
                className="table-cell text-right pr-4 select-none opacity-40 text-[10px]"
                style={{ color }}
              >
                {i + 1}
              </span>
              <span className="table-cell whitespace-pre">{line || ' '}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

export function parseMessageContent(content: string, color: string) {
  // Simple markdown-style code block parsing
  const parts = content.split(/(```[\s\S]*?```)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).replace(/^\w+\n/, ''); // remove language tag if present
      return <CodeBlock key={index} code={code} color={color} />;
    }
    return <span key={index} className="break-words leading-relaxed">{part}</span>;
  });
}
