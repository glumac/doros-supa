import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export function linkify(text: string): React.ReactNode[] {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 break-all" onClick={e => e.stopPropagation()}>
        {part}
      </a>
    ) : (
      part
    )
  );
}
