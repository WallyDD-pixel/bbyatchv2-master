import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.settings.findFirst({ select: { logoUrl: true } });
    return NextResponse.json({ logoUrl: settings?.logoUrl || null });
  } catch {
    return NextResponse.json({ logoUrl: null });
  }
}

