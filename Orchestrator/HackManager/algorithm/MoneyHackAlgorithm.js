import { MONEY_HACKING_TARGET_PERCENT } from "/Orchestrator/Config/Config.js";
import { Hack } from "/Orchestrator/HackManager/hack.js";
import { HackType } from "/Orchestrator/HackManager/enum.js";
import { calculateProbabilty } from "/Orchestrator/HackManager/algorithm/Common/helpers.js";
export function MoneyHackAlgorithm(ns, currentHack, hackedHost, availableThreads) {
  let potentialHack = [];
  for (const host of hackedHost) {
    if (host.maxMoney === 0) {
      continue;
    }
    if (currentHack.find((h) => h.host == host.name)) {
      continue;
    }
    const hostCurMoney = ns.getServerMoneyAvailable(host.name);
    const hostCurSecurity = ns.getServerSecurityLevel(host.name);
    const maxHackAmount = hostCurMoney * MONEY_HACKING_TARGET_PERCENT;
    const hackThreads = Math.ceil(ns.hackAnalyzeThreads(host.name, maxHackAmount));
    const finalHackThreads = Math.min(hackThreads, availableThreads);
    const hackPercentage = hackThreads / availableThreads > 1 ? 1 : hackThreads / availableThreads;
    const hackAmount = maxHackAmount * hackPercentage;
    const baseHackChance = (1.75 * ns.getHackingLevel() - host.hackingRequired) / (1.75 * ns.getHackingLevel());
    const hackChance = (100 - hostCurSecurity) / 100 * baseHackChance;
    const hackPerThread = ns.hackAnalyze(host.name);
    if (Number.isFinite(finalHackThreads) && hackThreads > 0) {
      potentialHack.push(new Hack(
        host.name,
        host.hackTime,
        hackAmount,
        finalHackThreads,
        0,
        0,
        hackAmount * hackPerThread / host.hackTime * calculateProbabilty(hackChance),
        HackType.moneyHack,
        hackChance
      ));
    }
  }
  return potentialHack;
}
