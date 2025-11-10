import { NextRequest } from 'next/server';
import { listResources, type ResourceType } from '@/lib/k8s';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { kubeconfig, type, namespace } = (await req.json()) as {
      kubeconfig: string;
      type: ResourceType;
      namespace?: string;
    };
    if (!kubeconfig || !type) {
      return new Response(JSON.stringify({ error: 'kubeconfig and type are required' }), { status: 400 });
    }
    const data = await listResources(kubeconfig, type, namespace);
    return Response.json({ data });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Unknown error' }), { status: 500 });
  }
}
