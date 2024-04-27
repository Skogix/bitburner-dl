import { ChannelName } from "/Orchestrator/MessageManager/enum.js";
import { MessageHandler } from "/Orchestrator/MessageManager/class.js";
import { formatMoney } from "/Orchestrator/Common/GenericFunctions.js";
import { COMMIT_CRIME, PROGRAMS } from "/Orchestrator/Config/Singularity.js";
import { dprint } from "/Orchestrator/Common/Dprint.js";
export async function main(ns) {
  ns.disableLog("sleep");
  const mySelf = ChannelName.targetManager;
  const messageHandler = new MessageHandler(ns, mySelf);
  const currentHost = ns.getHostname();
  const backdooredHost = [];
  const stuffBough = [];
  let buyStuffSwitch = true;
  checkAlreadyBought();
  let checkedHost = [];
  while (true) {
    dprint(ns, "Scanning network");
    checkedHost = [];
    await scanAll(currentHost);
    ns.singularity.connect("home");
    dprint(ns, "Finshing scan. Waiting for next cycle.");
    buyStuffSwitch && await buyStuff();
    for (let i = 0; i < 4; i++) {
      ns.tprint(COMMIT_CRIME);
      if (COMMIT_CRIME) {
        ns.tprint("Criming!");
        await commitCrime();
      }
      await ns.sleep(250);
    }
    ns.tprint("Pausing crime for 10 seconds, now it is time to kill the script.");
    await ns.sleep(10 * 1e3);
  }
  function checkAlreadyBought() {
    if (ns.scan("home").includes("darkweb"))
      stuffBough.push("tor");
    for (const program of PROGRAMS) {
      if (ns.fileExists(program.name, "home"))
        stuffBough.push(program.name);
    }
    if (stuffBough.length === PROGRAMS.length + 1)
      buyStuffSwitch = false;
  }
  async function buyStuff() {
    for (const program of PROGRAMS) {
      if ((stuffBough.includes("tor") || program.name === "tor") && !stuffBough.includes(program.name)) {
        const moneyAvailable = ns.getServerMoneyAvailable("home");
        if (program.price <= moneyAvailable) {
          if (program.name === "tor") {
            ns.singularity.purchaseTor();
          } else {
            !ns.fileExists(program.name, "home") && ns.singularity.purchaseProgram(program.name);
          }
          dprint(ns, "Bought: " + program.name);
          stuffBough.push(program.name);
        }
      }
    }
  }
  async function scanAll(base_host) {
    const hostArray = ns.scan(base_host);
    for (const host of hostArray) {
      if (!checkedHost.includes(host) && !host.includes("pserv-")) {
        checkedHost.push(host);
        ns.singularity.connect(host);
        const required = ns.getServerRequiredHackingLevel(host);
        const playerHackingLevel = ns.getHackingLevel();
        if (!backdooredHost.includes(host) && ns.hasRootAccess(host) && playerHackingLevel > required && !ns.getServer(host).backdoorInstalled) {
          await ns.singularity.installBackdoor();
          ns.print("Backdoored: " + host);
          backdooredHost.push(host);
        }
        await ns.sleep(100);
        await scanAll(host);
        ns.singularity.connect(base_host);
      }
    }
  }
  async function commitCrime() {
    const crimes = [
      "heist",
      "assassination",
      "kidnap",
      "grand theft auto",
      "homicide",
      "larceny",
      "mug someone",
      "rob store",
      "shoplift"
    ];
    if (ns.singularity.isBusy())
      return;
    const choices = crimes.map((crime) => {
      const crimeStats = ns.singularity.getCrimeStats(crime);
      const crimeChance = ns.singularity.getCrimeChance(crime);
      const crimeValue = crimeStats.money * Math.log10(crimeChance / (1 - crimeChance + Number.EPSILON)) / crimeStats.time;
      return { crime, relativeValue: crimeValue, stats: crimeStats };
    });
    choices.sort(choiceSorter);
    ns.singularity.commitCrime(choices[0].crime);
    ns.print(
      "Crime: " + choices[0].crime + " (RV: " + choices[0].relativeValue.toPrecision(3) + "): " + formatMoney(choices[0].stats.money)
    );
  }
}
export const choiceSorter = (a, b) => {
  if (a.relativeValue < b.relativeValue) {
    return 1;
  }
  if (a.relativeValue > b.relativeValue) {
    return -1;
  }
  return 0;
};
