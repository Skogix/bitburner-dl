import { MessageHandler, Payload } from "/Orchestrator/MessageManager/class.js";
import { DEFAULT_HACKING_MODE, HACK_MODE, HACKING_CONDUCTOR, HACKING_SERVER } from "/Orchestrator/Config/Config.js";
import { HackedHost, hackSorter } from "/Orchestrator/HackManager/hack.js";
import { GrowWeakenAlgorithm } from "/Orchestrator/HackManager/algorithm/GrowWeakenAlgorithm.js";
import { Action, ChannelName } from "/Orchestrator/MessageManager/enum.js";
import { HackMode, HackType } from "/Orchestrator/HackManager/enum.js";
import { XPHackAlgorithm } from "/Orchestrator/HackManager/algorithm/XpHackAlgorithm.js";
import { MoneyHackAlgorithm } from "/Orchestrator/HackManager/algorithm/MoneyHackAlgorithm.js";
import { dprint } from "/Orchestrator/Common/Dprint.js";
const HackAlgorithm = {
  [HackType.growWeakenHack]: GrowWeakenAlgorithm,
  [HackType.moneyHack]: MoneyHackAlgorithm,
  [HackType.xpHack]: XPHackAlgorithm
};
export async function main(ns) {
  ns.disableLog("sleep");
  ns.disableLog("exec");
  ns.disableLog("getHackTime");
  ns.disableLog("getServerGrowth");
  ns.disableLog("getServerMinSecurityLevel");
  ns.disableLog("getServerSecurityLevel");
  ns.disableLog("getServerMaxMoney");
  ns.disableLog("getServerMoneyAvailable");
  ns.disableLog("getServerMaxRam");
  ns.disableLog("getServerRequiredHackingLevel");
  ns.disableLog("getServerUsedRam");
  ns.disableLog("getHackingLevel");
  const mySelf = ChannelName.hackManager;
  const messageHandler = new MessageHandler(ns, mySelf);
  const messageActions = {
    [Action.hackDone]: hackDone,
    [Action.addHost]: addHost,
    [Action.pause]: requestPause,
    [Action.kill]: kill,
    [Action.printHacks]: printHacks,
    [Action.printRunningHacks]: printRunningHacks,
    [Action.switchHackMode]: switchHackRequest
  };
  const hackedHost = [];
  let currentHackMode = DEFAULT_HACKING_MODE;
  let currentHackId = 1;
  let currentHack = [];
  let pauseRequested = false;
  let killRequested = false;
  let switchRequested = false;
  while (true) {
    for (let i = 0; i < 10; i++) {
      const responses = await messageHandler.getMessagesInQueue();
      if (responses.length > 0) {
        for (const response of responses) {
          await messageActions[response.payload.action]?.(response);
        }
      }
      await ns.sleep(100);
    }
    if (!pauseRequested && !(currentHackMode === HackMode.xp && currentHack.length > 1)) {
      await pickHack();
    }
    if (currentHack.length === 0 && switchRequested) {
      switchHackMode();
    }
    if (currentHack.length < 1 && killRequested) {
      dprint(ns, "Manager kill");
      return;
    }
    await ns.sleep(100);
  }
  async function cleanup() {
    for (const hack of currentHack) {
      const maxTime = Math.max(hack.hackTime, hack.weakenTime, hack.growTime);
      const startTime = hack.startTime || 0;
      if (startTime + maxTime * 1.5 < Date.now()) {
        dprint(ns, "Orphan hack detected, killing hack id: " + hack.id);
        ns.kill(hack.pid);
      }
    }
  }
  async function switchHackRequest(message) {
    switchRequested = true;
    await requestPause();
  }
  function switchHackMode() {
    currentHackMode === HackMode.money ? currentHackMode = HackMode.xp : currentHackMode = HackMode.money;
    dprint(ns, "Hack switching hacking mode to " + currentHackMode);
    pauseRequested = false;
    switchRequested = false;
  }
  async function printHacks(message) {
    const availableThreads = await getAvailableThreads();
    if (availableThreads <= 0) {
      ns.tprint("No threads available, no hacks available.");
      return;
    }
    const potentialHack = [];
    for (const hackType of HACK_MODE[currentHackMode]) {
      potentialHack.push(...HackAlgorithm[hackType](ns, currentHack, hackedHost, availableThreads));
    }
    potentialHack.sort(hackSorter);
    if (potentialHack.length === 0) {
      ns.tprint("No hack available.");
    }
    let id = 0;
    for (const hack of potentialHack) {
      ns.tprint("Hack number " + id + ": ");
      ns.tprint(" - Target: " + hack.host);
      ns.tprint(" - Relative Value: " + hack.relativeValue);
      ns.tprint(" - Hack Type: " + hack.hackType);
      ns.tprint(" - Hack Threads: " + hack.hackThreads);
      ns.tprint(" - Weaken Threads: " + hack.weakenThreads);
      ns.tprint(" - Grow Threads: " + hack.growThreads);
      id++;
    }
    ns.tprint("Calculated hack total: " + potentialHack.length);
  }
  async function printRunningHacks(message) {
    if (currentHack.length === 0) {
      ns.tprint("No hack currently running.");
    }
    for (const hack of currentHack) {
      ns.tprint("Hack number " + hack.id + ": ");
      ns.tprint(" - Target: " + hack.host);
      ns.tprint(" - Relative Value: " + hack.relativeValue);
      ns.tprint(" - Hack Type: " + hack.hackType);
      ns.tprint(" - Hack Threads: " + hack.hackThreads);
      ns.tprint(" - Weaken Threads: " + hack.weakenThreads);
      ns.tprint(" - Grow Threads: " + hack.growThreads);
    }
    ns.tprint("Running hacks: " + currentHack.length);
  }
  async function hackDone(message) {
    const hack = currentHack.find((h) => h.id == message.originId);
    if (hack) {
      dprint(ns, "<= " + hack.hackType + " " + hack.id + " from " + hack.host + ": " + message.payload.info);
      currentHack = currentHack.filter((h) => h.id !== message.originId);
    } else {
      dprint(ns, "Finished hack cannot be found!");
    }
  }
  async function addHost(message) {
    const host = message.payload.info;
    dprint(ns, "Received new host: " + host);
    hackedHost.push(new HackedHost(ns, host));
  }
  function enoughRam(hackType) {
    return ns.getServerMaxRam(HACKING_SERVER) - ns.getServerUsedRam(HACKING_SERVER) - ns.getScriptRam(HACKING_CONDUCTOR[hackType], HACKING_SERVER) > 0;
  }
  async function pickHack() {
    dprint(ns, "Sending hacks.");
    for (let i = 0; i < 50; i++) {
      const availableThreads = await getAvailableThreads();
      let hackSentSuccess = false;
      if (availableThreads <= 0) {
        break;
      }
      const potentialHack = [];
      for (const hackType of HACK_MODE[currentHackMode]) {
        potentialHack.push(...HackAlgorithm[hackType](ns, currentHack, hackedHost, availableThreads));
      }
      potentialHack.sort(hackSorter);
      for (const topHack of potentialHack) {
        if (!enoughRam(topHack.hackType))
          continue;
        if (currentHack.filter((h) => h.host === topHack.host).length > 0)
          continue;
        if (await startHack(topHack)) {
          hackSentSuccess = true;
          break;
        }
      }
      if (!hackSentSuccess) {
        dprint(ns, "No more hack");
        break;
      }
      await ns.sleep(100);
    }
    dprint(ns, "Hack sending loop done.");
    if (currentHack.length < 1) {
      dprint(ns, "No hack successfully started");
    }
  }
  async function getAvailableThreads() {
    const messageFilter = (m) => m.payload.action === Action.threadsAvailable;
    const response = await messageHandler.sendAndWait(
      ChannelName.threadManager,
      new Payload(Action.getThreadsAvailable),
      null,
      true,
      messageFilter
    );
    return response[0].payload.info;
  }
  async function startHack(hack) {
    dprint(ns, "=> " + hack.hackType + " to " + hack.host + " (RV: " + Math.round(hack.relativeValue * 1e3) + ")");
    let executed = 0;
    currentHackId++;
    hack.id = currentHackId;
    for (let i = 0; i < 50; i++) {
      executed = ns.exec(HACKING_CONDUCTOR[hack.hackType], HACKING_SERVER, 1, JSON.stringify(hack), currentHackId);
      if (executed > 0) {
        hack.pid = executed;
        break;
      }
      await ns.sleep(100);
    }
    if (executed === 0) {
      dprint(ns, "Unable to start hack, process not starting.");
      return false;
    }
    const messageFilter = (m) => m.payload.action === Action.hackReady;
    const response = await messageHandler.waitForAnswer(messageFilter, 15e3);
    if (response.length === 0) {
      dprint(ns, "Hack got stuck somewhere.");
      return false;
    }
    if (response[0].payload.info === -1) {
      dprint(ns, "Unable to start hack, lack of threads");
      return false;
    }
    hack.startTime = Date.now();
    currentHack.push(hack);
    return true;
  }
  async function requestPause(message) {
    dprint(ns, "Pause requested");
    pauseRequested = true;
    for (const hack of currentHack) {
      await messageHandler.sendMessage(ChannelName.hackConductor, new Payload(Action.stop), hack.id);
    }
  }
  async function kill(message) {
    dprint(ns, "Kill requested");
    pauseRequested = true;
    killRequested = true;
    for (const hack of currentHack) {
      await messageHandler.sendMessage(ChannelName.hackConductor, new Payload(Action.kill), hack.id);
    }
  }
}
