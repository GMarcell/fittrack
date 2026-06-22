import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { updateSessionSchema } from "@/validation/session";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  const existing = await prisma.session.findFirst({
    where: { id: id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deletedSession = await prisma.session.delete({
    where: { id: id },
  });

  return NextResponse.json(deletedSession, {
    status: 200,
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const user = await getCurrentUser();

  const parsed = updateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.session.findFirst({
    where: { id: id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { sessionExercises, ...sessionData } = parsed.data;

  const session = await prisma.session.update({
    where: { id: id },
    data: {
      ...sessionData,
      ...(sessionExercises
        ? { sessionExercises: { deleteMany: {}, create: sessionExercises } }
        : {}),
    },
    include: { sessionExercises: true },
  });

  return NextResponse.json(session);
}
