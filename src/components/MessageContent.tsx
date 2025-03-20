import React from 'react';
import Linkify from 'linkify-react';

interface MessageContentProps {
  text: string;
}

export function MessageContent({ text }: MessageContentProps) {
  return (
    <Linkify
      options={{
        target: '_blank',
        className: 'text-blue-400 hover:text-blue-500 underline',
        rel: 'noopener noreferrer'
      }}
    >
      {text}
    </Linkify>
  );
}