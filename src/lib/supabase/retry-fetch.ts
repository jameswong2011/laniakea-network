const RETRY_DELAYS_MS = [800, 2000, 4000];

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function issuedInTheFuture(response: Response) {
  if (response.status !== 401 && response.status !== 403) {
    return false;
  }

  const body = await response.clone().text();
  return body.includes("JWT issued at future") || body.includes("PGRST303");
}

/**
 * Supabase's gateway sometimes mints a short-lived JWT a moment ahead of
 * PostgREST's clock. That request fails once, then succeeds. Retry only that case.
 */
export async function fetchRetryingFutureJwt(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    const response = await fetch(input instanceof Request ? input.clone() : input, input instanceof Request ? undefined : init);

    if (attempt === RETRY_DELAYS_MS.length || !(await issuedInTheFuture(response))) {
      return response;
    }

    await sleep(RETRY_DELAYS_MS[attempt]);
  }

  return fetch(input instanceof Request ? input.clone() : input, input instanceof Request ? undefined : init);
}
