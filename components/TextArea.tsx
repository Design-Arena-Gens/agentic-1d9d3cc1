import { TextareaHTMLAttributes } from 'react';

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={
        'w-full rounded-md border border-gray-300 p-2 font-mono text-sm focus:border-black focus:outline-none ' +
        (props.className ?? '')
      }
    />
  );
}
