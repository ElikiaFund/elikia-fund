// Transparent relay from Elikia Fund's Laravel backend to the Yabeto Pay live API.
//
// Exists purely as a network workaround: the production API server (hosted at LWS) cannot
// establish a TCP connection to Yabeto's live API (hosted at Hostinger, 195.35.48.240) since
// 2026-08-08 — confirmed via curl/traceroute from the LWS server, confirmed clean on both LWS's
// and Yabeto's own ends, root cause still under investigation with Yabeto/Hostinger (see
// yabeto.md). A request from an unrelated network (this Worker, running on Cloudflare's edge)
// reaches Yabeto normally, so Laravel routes through here instead of calling Yabeto directly
// until the underlying routing issue is resolved.
//
// Holds no Yabeto credentials — forwards whatever Authorization header the caller (Laravel)
// already sends. The only thing this Worker owns is RELAY_SECRET, which exists solely to stop
// this from being an open relay to Yabeto's API for anyone who discovers the Worker's URL.

const YABETO_LIVE_ORIGIN = 'https://pay.api.yabetoopay.com';

export default {
  async fetch(request, env) {
    if (request.headers.get('X-Relay-Secret') !== env.RELAY_SECRET) {
      return new Response('Forbidden', { status: 403 });
    }

    const incoming = new URL(request.url);
    const target = YABETO_LIVE_ORIGIN + incoming.pathname + incoming.search;

    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.delete('x-relay-secret');
    forwardHeaders.delete('host');

    const upstream = await fetch(target, {
      method: request.method,
      headers: forwardHeaders,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: upstream.headers,
    });
  },
};
