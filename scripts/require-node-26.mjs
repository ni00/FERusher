const requiredMajor = 26;
const currentMajor = Number.parseInt(process.versions.node.split(".")[0], 10);

if (currentMajor !== requiredMajor) {
  const vercelHint = process.env.VERCEL
    ? " Set the Vercel project's Framework Preset to Services so Dockerfile.vercel handles the build."
    : "";

  console.error(
    `DevRusher requires Node.js ${requiredMajor}.x; current runtime is ${process.version}.${vercelHint}`
  );
  process.exit(1);
}
