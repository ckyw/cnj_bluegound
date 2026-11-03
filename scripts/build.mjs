import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const out = resolve("dist");
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp("src", out, { recursive: true });
const html = await readFile("src/index.html", "utf8");
for (const route of [
  "locations",
  "rooms",
  "rooms/standard-double",
  "rooms/twin",
  "rooms/superior",
  "rooms/studio",
]) {
  await mkdir(resolve(out, route), { recursive: true });
  await writeFile(resolve(out, route, "index.html"), html);
}
await writeFile(
  resolve(out, "404.html"),
  html.replace('data-page="auto"', 'data-page="404"'),
);
console.log("Built 7 routes and a 404 page → dist/");
