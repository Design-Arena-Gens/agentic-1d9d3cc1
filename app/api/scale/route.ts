import { NextRequest } from 'next/server';
import { scaleDeployment } from '@/lib/k8s';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { kubeconfig, namespace, name, replicas } = (await req.json()) as {
      kubeconfig: string; namespace: string; name: string; replicas: number;
    };
    if (!kubeconfig || !namespace || !name || typeof replicas !== 'number') {
      return new Response(JSON.stringify({ error: 'kubeconfig, namespace, name, replicas required' }), { status: 400 });
    }
    const desired = await scaleDeployment(kubeconfig, namespace, name, replicas);
    return Response.json({ replicas: desired });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Unknown error' }), { status: 500 });
  }
}
