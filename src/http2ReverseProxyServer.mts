#!/usr/bin/env node

// External Imports
import fs from 'node:fs';
import { createSecureServer } from 'node:http2';
import { parseArgs, styleText } from 'node:util';

// Parse CLI arguments
const { values } = parseArgs({
  allowPositionals: true,
  args: process.argv,
  options: {
    'hostname-log-override': { type: 'string' },
    port: { type: 'string' },
    'route-to': { type: 'string' },
    'tls-cert': { type: 'string' },
    'tls-key': { type: 'string' },
  },
});

// Ensure required arguments are provided
const routeUrl = values['route-to'];
if (!routeUrl) {
  throw new TypeError('--route-to is required');
}
const tlsCertificatePath = values['tls-cert'];
if (!tlsCertificatePath) {
  throw new TypeError('--tls-cert is required');
}
const tlsKeyPath = values['tls-key'];
if (!tlsKeyPath) {
  throw new TypeError('--tls-key is required');
}

// Validate parameter formatting
const port = Number.parseInt(values.port ?? '443', 10);
if (Number.isNaN(port)) {
  throw new TypeError('--port must be a number');
}
if (!URL.canParse(routeUrl)) {
  throw new Error('Invalid URL passed to "route-to" CLI parameter', {
    cause: { 'route-to': routeUrl },
  });
}

// Start a secure server using HTTP2 and TLS
const serverOptions = {
  allowHTTP1: false,
  cert: fs.readFileSync(tlsCertificatePath),
  key: fs.readFileSync(tlsKeyPath),
};

// eslint-disable-next-line @typescript-eslint/no-misused-promises -- void returns are likely ignored, so returning a promise will have no effect
createSecureServer(serverOptions, async (request, response) => {
  const forwardedHeaders = {
    'X-Forwarded-Proto': 'https',
    ...(request.headers.accept && { accept: request.headers.accept }),
    ...(request.headers['accept-encoding'] && {
      'accept-encoding': Array.isArray(request.headers['accept-encoding'])
        ? request.headers['accept-encoding'].join(',')
        : request.headers['accept-encoding'],
    }),
    ...(request.headers['accept-language'] && {
      'accept-language': request.headers['accept-language'],
    }),
    ...(request.headers['cache-control'] && { 'cache-control': request.headers['cache-control'] }),
    ...(request.socket.localAddress && { 'X-Forwarded-For': request.socket.localAddress }),
    ...(request.headers[':authority'] && {
      'X-Forwarded-Host': request.headers[':authority'].split(':')[0],
    }),
    ...(request.socket.localPort && { 'X-Forwarded-Port': String(request.socket.localPort) }),
    ...(request.headers['user-agent'] && { 'user-agent': request.headers['user-agent'] }),
  };

  const url = new URL(request.url, routeUrl);
  const proxyResponse = await fetch(url, {
    headers: forwardedHeaders,
    method: request.method,
  });

  for (const [key, value] of proxyResponse.headers.entries()) {
    if (['cache-control', 'content-type'].includes(key)) {
      response.setHeader(key, value);
    }
  }
  const responseContentType = proxyResponse.headers.get('content-type');
  if (!responseContentType) {
    throw new TypeError('Missing Content-Type response header for proxy request', {
      cause: { proxyUrl: url.href },
    });
  }
  const responseBody = responseContentType.startsWith('text/')
    ? await proxyResponse.text()
    : // @ts-expect-error -- Response.prototype.bytes() exists in the runtime environment, missing from type definition
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Response.prototype.bytes() exists in the runtime environment, missing from type definition
      ((await proxyResponse.bytes()) as Uint8Array);
  response.writeHead(proxyResponse.status, proxyResponse.statusText);
  response.end(responseBody);
}).listen(port, () => {
  const serverUrl = new URL('https://localhost');
  serverUrl.hostname = values['hostname-log-override'] ?? 'localhost';
  serverUrl.port = String(port);
  console.log(styleText('magenta', `Listening on ${serverUrl.href}`));
});
