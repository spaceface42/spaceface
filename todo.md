# TODO

- Refine SlidePlayer image transition/change behavior (smoother visual change between images).
- Add bullet indicators for SlidePlayer and keep them synced with the active slide.

Each dot has equal width and height and uses border-radius: 50% (or a very large value like 9999px) to create a circle.
When active, only the width increases (to 3× the height), while the border-radius remains unchanged, resulting in a capsule/pill shape.
- [ ] Router: cache-hit path in `RouteCoordinator.navigate()` builds a synthetic `nextDocument` from cached container HTML only. If future swap hooks read full-document fields (`nextDocument.title`, `<meta>`, `body` attrs), behavior can diverge between cache miss vs hit and cause subtle route bugs. Consider caching/parsing full HTML per route or enforcing hooks to use `url`/`nextContainer` only.
