import { Hack, hackSorter } from "/Orchestrator/HackManager/hack.js";
import { HackType } from "/Orchestrator/HackManager/enum.js";
export function XPHackAlgorithm(ns, currentHack, hackedHost) {
  let potentialHack = [];
  for (let host of hackedHost) {
    if (host.maxMoney === 0) {
      continue;
    }
    if (currentHack.find((h) => h.host === host.name)) {
      continue;
    }
    potentialHack.push(new Hack(
      host.name,
      1,
      100,
      0,
      0,
      -1,
      (3 + host.minSecurity * 0.3) / host.weakenTime,
      HackType.xpHack,
      0
    ));
  }
  potentialHack.sort(hackSorter);
  potentialHack = potentialHack[0] ? [potentialHack[0]] : [];
  return potentialHack;
}
