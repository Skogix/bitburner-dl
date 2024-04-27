import { MessageHandler, Payload } from "/Orchestrator/MessageManager/class.js";
import { Action, ChannelName } from "/Orchestrator/MessageManager/enum.js";
import { HACKING_SCRIPTS, TIMEOUT_THRESHOLD } from "/Orchestrator/Config/Config.js";
import { Hack } from "/Orchestrator/HackManager/hack.js";
import { executeScript } from "/Orchestrator/Common/GenericFunctions.js";
import { freeThreads, getThreads } from "/Orchestrator/ThreadManager/common.js";
import { dprint } from "/Orchestrator/Common/Dprint.js";
export async function main(ns) {
  ns.disableLog("sleep");
  ns.disableLog("exec");
  const myId = ns.args[1];
  const mySelf = ChannelName.hackConductor;
  const messageHandler = new MessageHandler(ns, mySelf, myId);
  const hack = Hack.fromJSON(ns.args[0]);
  dprint(ns, "Starting hack: " + myId);
  const allocatedThreads = await getThreads(ns, hack.growThreads + hack.weakenThreads, messageHandler, {
    time: Math.max(hack.weakenTime, hack.growTime)
  });
  const numOfHost = Object.keys(allocatedThreads).length;
  if (!numOfHost) {
    dprint(ns, "Hack lack required threads");
    await freeThreads(ns, allocatedThreads, messageHandler);
    return messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady, -1));
  }
  const growAllocatedThreads = {};
  let growThreadsAmountRequired = hack.growThreads;
  for (const host of Object.keys(allocatedThreads)) {
    if (growThreadsAmountRequired === 0) {
      break;
    } else if (allocatedThreads[host] <= growThreadsAmountRequired) {
      growAllocatedThreads[host] = allocatedThreads[host];
      growThreadsAmountRequired -= allocatedThreads[host];
      delete allocatedThreads[host];
    } else if (allocatedThreads[host] > growThreadsAmountRequired) {
      growAllocatedThreads[host] = growThreadsAmountRequired;
      allocatedThreads[host] -= growThreadsAmountRequired;
      growThreadsAmountRequired = 0;
    }
  }
  const weakenAllocatedThreads = { ...allocatedThreads };
  let growResponseReceived = 0;
  let weakenResponseReceived = 0;
  dprint(ns, "Hack ready");
  await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackReady));
  dprint(ns, "Starting weaken script");
  dprint(ns, "Starting grow script");
  const numOfWeakenHost = await executeScript(
    ns,
    HACKING_SCRIPTS.weaken,
    weakenAllocatedThreads,
    hack,
    messageHandler,
    myId
  );
  const numOfGrowHost = await executeScript(ns, HACKING_SCRIPTS.grow, growAllocatedThreads, hack, messageHandler, myId);
  const hackStartTime = Date.now();
  const timeOutTime = hackStartTime + hack.hackTime + TIMEOUT_THRESHOLD;
  const timeOutHour = new Date(timeOutTime).getHours();
  const timeOutMinute = new Date(timeOutTime).getMinutes();
  const timeOutSecond = new Date(timeOutTime).getSeconds();
  dprint(ns, "Awaiting grow/weaken confirmation");
  dprint(ns, "Hack will timeout at: " + timeOutHour + ":" + timeOutMinute + ":" + timeOutSecond);
  while (timeOutTime > Date.now()) {
    const responses = await messageHandler.getMessagesInQueue();
    for (const response of responses) {
      switch (response.payload.action) {
        case Action.growScriptDone:
          growResponseReceived++;
          dprint(ns, "Received " + growResponseReceived + "/" + numOfGrowHost + " grow results");
          break;
        case Action.weakenScriptDone:
          weakenResponseReceived++;
          dprint(ns, "Received " + weakenResponseReceived + "/" + numOfWeakenHost + " weaken results");
          break;
        default:
          break;
      }
    }
    if (weakenResponseReceived >= numOfWeakenHost && growResponseReceived >= numOfGrowHost) {
      break;
    }
    await ns.sleep(100);
  }
  dprint(ns, "Weaken and grow completed.");
  await freeThreads(ns, growAllocatedThreads, messageHandler);
  await freeThreads(ns, weakenAllocatedThreads, messageHandler);
  const results = "$: " + Math.round(ns.getServerMoneyAvailable(hack.host) / ns.getServerMaxMoney(hack.host) * 1e5) / 1e3 + "%, Sec: " + Math.round((ns.getServerSecurityLevel(hack.host) / ns.getServerMinSecurityLevel(hack.host) - 1) * 1e5) / 1e3;
  await messageHandler.sendMessage(ChannelName.hackManager, new Payload(Action.hackDone, results));
  await messageHandler.clearMyMessage();
  dprint(ns, "Exiting");
}
