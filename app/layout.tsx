import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'On-Prem Kubernetes Manager',
  description: 'Web UI to manage on-prem Kubernetes clusters via kubeconfig',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-7xl p-4">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">On?Prem Kubernetes Manager</h1>
            <a
              href="https://kubernetes.io/docs/"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Docs
            </a>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
