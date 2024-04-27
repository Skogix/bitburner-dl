export async function main(ns) {
  let money = ns.args[0] || ns.getServerMoneyAvailable("home");
  for (; ; ) {
    let cost = await UpgradeRound(ns, money);
    money -= cost;
    if (cost == 0 || money <= 0)
      break;
    await ns.sleep(20);
  }
}
async function UpgradeRound(ns, money) {
  const con = ns.formulas.hacknetServers.constants();
  let budget = money;
  let actions = [
    ns.hacknet.purchaseNode,
    ns.hacknet.upgradeLevel,
    ns.hacknet.upgradeRam,
    ns.hacknet.upgradeCore,
    ns.hacknet.upgradeCache
  ];
  let possibleUpgrades = [];
  let count = ns.hacknet.numNodes();
  for (let i = 0; i < ns.hacknet.maxNumNodes(); i++) {
    if (i >= count) {
      let cost = ns.hacknet.getPurchaseNodeCost();
      let hashGain = ns.formulas.hacknetServers.hashGainRate(1, 0, 1, 1, ns.getBitNodeMultipliers().HacknetNodeMoney);
      if (cost <= money) {
        possibleUpgrades.push({
          index: i,
          description: "NewNode",
          action: 0,
          cost,
          hashGain,
          netGain: hashGain / cost
        });
      }
      continue;
    }
    let stats = ns.hacknet.getNodeStats(i);
    let level = stats.level + 1;
    if (level <= con.MaxLevel) {
      let cost = ns.hacknet.getLevelUpgradeCost(i, 1);
      let hashGain = ns.formulas.hacknetServers.hashGainRate(level, 0, stats.ram, stats.cores, ns.getBitNodeMultipliers().HacknetNodeMoney);
      if (cost <= money) {
        possibleUpgrades.push({
          index: i,
          description: "LevelUp",
          action: 1,
          cost,
          hashGain,
          netGain: hashGain / cost
        });
      }
    }
    let ram = stats.ram;
    if (ram * 2 <= con.MaxRam) {
      let cost = ns.hacknet.getRamUpgradeCost(i, 1);
      let hashGain = ns.formulas.hacknetServers.hashGainRate(stats.level, 0, ram * 2, stats.cores, ns.getBitNodeMultipliers().HacknetNodeMoney);
      if (cost <= money) {
        possibleUpgrades.push({
          index: i,
          description: "RamUp",
          action: 2,
          cost,
          hashGain,
          netGain: hashGain / cost,
          amount: 1
        });
      }
    }
    let cores = stats.cores + 1;
    if (cores <= con.MaxCores) {
      let cost = ns.hacknet.getCoreUpgradeCost(i, 1);
      let hashGain = ns.formulas.hacknetServers.hashGainRate(stats.level, 0, stats.ram, cores, ns.getBitNodeMultipliers().HacknetNodeMoney);
      if (cost <= money) {
        possibleUpgrades.push({
          index: i,
          description: "CoresUp",
          action: 3,
          cost,
          hashGain,
          netGain: hashGain / cost
        });
      }
    }
  }
  possibleUpgrades.sort((a, b) => b.netGain - a.netGain);
  let lastNetGain = 0;
  let skip = false;
  for (let upg of possibleUpgrades) {
    if ((lastNetGain == 0 || lastNetGain == upg.netGain) && !skip) {
      if (money < upg.cost) {
        ns.tprint("WARN: Budget limit hit! Aborting");
        break;
      }
      ns.tprint("INFO: Upgrading node " + upg.index + " upgradeType: " + upg.action);
      actions[upg.action](upg.index, upg.amount || 1);
      money -= upg.cost;
    } else {
      ns.tprint("WARN: Skipping " + upg);
      skip = true;
      break;
    }
    lastNetGain = upg.netGain;
  }
  return budget - money;
}
