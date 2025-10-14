import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const ctype = req.headers.get('content-type') || '';
    let slug:string|undefined, titleFr:string|undefined, titleEn:string|undefined, descFr:string|undefined, descEn:string|undefined, timeFr:string|undefined, timeEn:string|undefined, imageUrl:string|undefined;
    if(ctype.includes('multipart/form-data') || ctype.includes('application/x-www-form-urlencoded')){
      const data = await req.formData();
      slug = String(data.get('slug')||'').trim();
      titleFr = String(data.get('titleFr')||'').trim();
      titleEn = String(data.get('titleEn')||'').trim();
      descFr = String(data.get('descFr')||'').trim();
      descEn = String(data.get('descEn')||'').trim();
      timeFr = String(data.get('timeFr')||'').trim()||undefined;
      timeEn = String(data.get('timeEn')||'').trim()||undefined;
      imageUrl = String(data.get('imageUrl')||'').trim()||undefined;
      const imageFile = data.get('imageFile') as File | null;
      if(imageFile && (imageFile as any).arrayBuffer){
        const fs = await import('fs');
        const path = await import('path');
        const uploadsDir = path.join(process.cwd(),'public','uploads');
        if(!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir,{ recursive:true });
        const buf = Buffer.from(await imageFile.arrayBuffer());
        const ext = (imageFile.name.split('.').pop()||'jpg').toLowerCase();
        const fname = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
        fs.writeFileSync(path.join(uploadsDir,fname), buf);
        imageUrl = `/uploads/${fname}`;
      }
    } else {
      const body = await req.json().catch(() => null);
      if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
      ({ slug, titleFr, titleEn, descFr, descEn, timeFr, timeEn, imageUrl } = body || {});
    }

    if (!slug || !titleFr || !titleEn) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

    const created = await (prisma as any).experience.create({
      data: { slug, titleFr, titleEn, descFr: descFr ?? "", descEn: descEn ?? "", timeFr: timeFr ?? null, timeEn: timeEn ?? null, imageUrl: imageUrl ?? null },
    });
    // Si formulaire -> redirection vers la liste
    if(ctype.includes('multipart/form-data') || ctype.includes('application/x-www-form-urlencoded')){
      const url = new URL(`/admin/experiences?created=${created.id}`, req.url);
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "slug_unique" }, { status: 409 });
    return NextResponse.json({ error: "server_error", details:e?.message }, { status: 500 });
  }
}
