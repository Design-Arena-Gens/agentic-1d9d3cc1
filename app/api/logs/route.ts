import { NextRequest } from 'next/server';
import { getPodLogs } from '@/lib/k8s';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { kubeconfig, namespace, pod, container } = (await req.json()) as {
      kubeconfig: string; namespace: string; pod: string; container?: string;
    };
    if (!kubeconfig || !namespace || !pod) {
      return new Response(JSON.stringify({ error: 'kubeconfig, namespace and pod are required' }), { status: 400 });
    }
    const logs = await getPodLogs(kubeconfig, namespace, pod, container);
    return new Response(logs, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Unknown error' }), { status: 500 });
  }
}
