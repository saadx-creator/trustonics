import { spawn } from "node:child_process";
// Accept standard Next flags and the managed preview runner's equivalent flags.
const input = process.argv.slice(2),
  args = [];
for (let i = 0; i < input.length; i++) {
  if (input[i] === "--strictPort") continue;
  args.push(input[i] === "--host" ? "--hostname" : input[i]);
}
if (!args.includes("--hostname")) args.push("--hostname", "0.0.0.0");
const portIndex = args.indexOf("--port");
const preview = portIndex >= 0 && args[portIndex + 1] === "4173";
const env = {
  ...process.env,
  ...(preview
    ? {
        APP_URL: "http://terminal.local:4173",
        AUTH_URL: "http://terminal.local:4173",
      }
    : {}),
};
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--webpack", ...args],
  { stdio: "inherit", env },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));
