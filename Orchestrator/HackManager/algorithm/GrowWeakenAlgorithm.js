import { MONEY_HACKING_TARGET_PERCENT } from "/Orchestrator/Config/Config.js";
import { Hack } from "/Orchestrator/HackManager/hack.js";
import { HackType } from "/Orchestrator/HackManager/enum.js";
import { calculateProbabilty, helpers } from "/Orchestrator/HackManager/algorithm/Common/helpers.js";
export function GrowWeakenAlgorithm(ns, currentHack, hackedHost, availableThreads) {
  let potentialHack = [];
  for (let host of hackedHost) {
    if (host.maxMoney === 0) {
      continue;
    }
    if (currentHack.find((h) => h.host == host.name)) {
      continue;
    }
    const hostCurMoney = ns.getServerMoneyAvailable(host.name);
    const hostCurSecurity = ns.getServerSecurityLevel(host.name);
    const baseHackChance = (1.75 * ns.getHackingLevel() - host.hackingRequired) / (1.75 * ns.getHackingLevel());
    const moneyToMax = host.maxMoney - hostCurMoney;
    const serverGrowth = Math.min(1 + 0.03 / hostCurSecurity, 1.0035);
    const growThreads = Math.ceil(Math.log(host.maxMoney / hostCurMoney) / Math.log(serverGrowth) * host.growRate);
    if (!Number.isFinite(growThreads)) {
      continue;
    }
    const weakenThread = Math.ceil((hostCurSecurity - host.minSecurity + growThreads * 4e-3) / 0.05);
    const threadsRatio = helpers(availableThreads, hostCurSecurity, host.minSecurity, growThreads, weakenThread);
    const percentGrown = growThreads ? threadsRatio.growThreads / growThreads : 1;
    const hackAmount = hostCurMoney + moneyToMax * percentGrown * MONEY_HACKING_TARGET_PERCENT;
    const hackTime = host.hackTime * 5;
    const percentHackedPerThread = ns.hackAnalyze(host.name);
    const hackingThreadRequired = MONEY_HACKING_TARGET_PERCENT / percentHackedPerThread;
    if (threadsRatio.weakenThreads <= 1 && threadsRatio.growThreads <= 1) {
      continue;
    }
    potentialHack.push(new Hack(
      host.name,
      hackTime,
      hackAmount,
      0,
      threadsRatio.growThreads,
      threadsRatio.weakenThreads,
      hackAmount * percentHackedPerThread / hackTime * calculateProbabilty(baseHackChance),
      HackType.growWeakenHack,
      baseHackChance
    ));
  }
  return potentialHack;
}
