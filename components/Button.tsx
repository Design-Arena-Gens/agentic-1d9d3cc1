import { ButtonHTMLAttributes } from 'react';

export function Button({ variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  const styles =
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-gray-200 text-gray-900 hover:bg-gray-300';
  return (
    <button
      {...props}
      className={`rounded-md px-3 py-2 text-sm font-medium ${styles} disabled:opacity-50 ${props.className ?? ''}`}
    />
  );
}
