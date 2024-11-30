# Changelog

## 1.0.4

- Remove false positive `@ts-expect-error` from `./src/http2ReverseProxyServer.mts` because upgraded Node.js types now contain correct definitions for `Response.prototype.bytes()`
- Raise Node.js minimum runtime version to LTS `22.11.0`
- Upgrade Bun package manager version from `1.1.27` to `1.1.37`
- Upgrade dependency versions to latest

## 1.0.3

- Publish code transpiled from TypeScript to JavaScript for easier consumption

## 1.0.2

- Rename package from `http2-secure-reverse-proxy-nodejs` to `@mangs/http2-secure-reverse-proxy-nodejs`
- Add NPM package link to readme

## 1.0.1

- Fix publish workflow

## 1.0.0

- First public release
