import type { Instrumentation } from 'next';

const TRANSFORM_STREAM_RACE =
  /controller\[kState\]\.transformAlgorithm is not a function/;

function isTransformStreamRace(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return TRANSFORM_STREAM_RACE.test(err.message);
}

/** Contexte de route quand Next.js capture la race TransformStream (Node #62036). */
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  if (!isTransformStreamRace(err)) return;

  const digest =
    typeof err === 'object' && err !== null && 'digest' in err
      ? String((err as { digest?: unknown }).digest ?? '')
      : '';

  console.warn(
    `[stream-race] ${request.method} ${request.path} route=${context.routePath || 'n/a'} type=${context.routeType} source=${context.renderSource ?? 'n/a'} digest=${digest}`
  );
};
