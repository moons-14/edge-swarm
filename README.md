# Edge Swarm
A lightweight torrent client that runs entirely on Cloudflare.<br>
This project is research and development and does not guarantee operational stability or accuracy.

## How to use
```txt
pnpm i
pnpm run dev
```

### Deploy to Cloudflare Workers
```txt
pnpm run deploy
```

### Cloudflare Workers Types with Hono
[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
pnpm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
