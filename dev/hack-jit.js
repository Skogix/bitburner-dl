export async function main(ns, id, target, desc, type, duration, port) {
  const start = performance.now();
  await ns.hack(target);
  const end = performance.now();
  if (port != null)
    await ns.writePort(port, JSON.stringify({ id, desc, type, start, end }));
}
