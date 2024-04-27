export const repoParams = {
  baseUrl: "https://raw.githubusercontent.com/HtheChemist/BitBurnerCentralManager/master/build",
  // Build version
  //baseUrl: "http://localhost:9182", // Dev version
  manifest: "/resources/manifest.txt",
  helpers: "/lib/Helpers.js",
  pullFiles: "/Orchestrator/utils/pullFiles.js"
};
async function pullFile(ns, file) {
  const manifestUrl = `${repoParams.baseUrl}${file}`;
  ns.tprintf(`INFO   > Downloading ${manifestUrl} -> ${file}`);
  if (ns.fileExists(file))
    ns.rm(file);
  if (!await ns.wget(manifestUrl, file, "home")) {
    ns.tprintf(`ERROR  > ${manifestUrl} -> ${file} failed.`);
    ns.exit();
  }
}
export async function main(ns) {
  const files = [repoParams.helpers, repoParams.manifest, repoParams.pullFiles];
  for (const file of files) {
    await pullFile(ns, file);
  }
  ns.tprintf(`INFO   > Successfully pulled initial files!`);
  ns.tprintf(`INFO   > Running download script...`);
  await ns.sleep(250);
  ns.run(repoParams.pullFiles);
}
