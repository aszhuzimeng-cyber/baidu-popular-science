import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: true, stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await run("npm", ["run", "build"], path.join(root, "amblyopia"));
await run("npm", ["run", "build"], path.join(root, "shadow story"));

await cp(path.join(root, "site"), dist, { recursive: true });

await mkdir(path.join(dist, "amblyopia"), { recursive: true });
await cp(
  path.join(root, "amblyopia", "amblyopia-vision-demo.html"),
  path.join(dist, "amblyopia", "index.html"),
);
await cp(path.join(root, "amblyopia", "assets"), path.join(dist, "amblyopia", "assets"), {
  recursive: true,
});

await cp(
  path.join(root, "shadow story", "dist"),
  path.join(dist, "shadow-story"),
  { recursive: true },
);

await writeFile(path.join(dist, ".nojekyll"), "");
console.log(`\nPortfolio built at ${dist}`);
