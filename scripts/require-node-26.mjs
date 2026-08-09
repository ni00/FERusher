const requiredMajor = 26;
const currentMajor = Number.parseInt(process.versions.node.split(".")[0], 10);

if (currentMajor !== requiredMajor) {
  console.error(
    `DevRusher requires Node.js ${requiredMajor}.x; current runtime is ${process.version}.`
  );
  process.exit(1);
}
