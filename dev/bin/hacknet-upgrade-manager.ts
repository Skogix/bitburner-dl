import { NS, AutocompleteData } from '@ns';
import { getConfiguration, disableLogs, formatDuration, formatMoney } from '@/lib/helpers.js';

let haveHacknetServers = true; // Cached flag after detecting whether we do (or don't) have hacknet servers
const argsSchema = [
  ['max-payoff-time', '1h'], // Controls how far to upgrade hacknets. Can be a number of seconds, or an expression of minutes/hours (e.g. '123m', '4h')
  ['time', null], // alias for max-payoff-time
  ['c', false], // Set to true to run continuously, otherwise, it runs once
  ['continuous', false],
  ['interval', 1000], // Rate at which the program purchases upgrades when running continuously
  ['max-spend', Number.MAX_VALUE], // The maximum amount of money to spend on upgrades
  ['toast', false], // Set to true to toast purchases
  ['reserve', null], // Reserve this much cash (defaults to contents of reserve.txt if not specified)
];

export function autocomplete(str[], data:AutocompleteData):[] {
  //data.flags(argsSchema);
  let huhu = data.flags(argsSchema)
  return str[];
}

/** @param {NS} ns **/
export async function main(ns: NS) {
  const options = getConfiguration(argsSchema,ns: NS, );
  if (!options) return; // Invalid options, or ran in --help mode.
  const continuous = options.c || options.continuous;
  const interval = options.interval;
  let maxSpend = options['max-spend'];
  let maxPayoffTime = options['time'] || options['max-payoff-time'];
  // A little string parsing to be more user friendly
  if (maxPayoffTime && String(maxPayoffTime).endsWith('m'))
    maxPayoffTime = Number.parseFloat(maxPayoffTime.replace('m', '')) * 60;
  else if (maxPayoffTime && String(maxPayoffTime).endsWith('h'))
    maxPayoffTime = Number.parseFloat(maxPayoffTime.replace('h', '')) * 3600;
  else maxPayoffTime = Number.parseFloat(maxPayoffTime);
  disableLogs(ns, ['sleep', 'getServerUsedRam', 'getServerMoneyAvailable']);
  setStatus(
    ns,
    `Starting hacknet-upgrade-manager with purchase payoff time limit of ${formatDuration(maxPayoffTime * 1000)} and ` +
      (maxSpend == Number.MAX_VALUE ? 'no spending limit' : `a spend limit of ${formatMoney(maxSpend)}`) +
      `. Current fleet: ${ns.hacknet.numNodes()} nodes...`,
  );
  do {
    try {
      const moneySpent: Promise<boolean> = upgradeHacknet(ns, maxSpend, maxPayoffTime, options);
      // Using this method, we cannot know for sure that we don't have hacknet servers until we have purchased one
      if (haveHacknetServers && ns.hacknet.numNodes() > 0 && ns.hacknet.hashCapacity() == 0) haveHacknetServers = false;
      if (maxSpend && moneySpent === false) {
        setStatus(ns, `Spending limit reached. Breaking...`);
        break; // Hack, but we return a non-number (false) when we've bought all we can for the current config
      }
      maxSpend -= moneySpent;
    } catch (err) {
      setStatus(
        ns,
        `WARNING: hacknet-upgrade-manager.js Caught (and suppressed) an unexpected error in the main loop:\n` +
          (typeof err === 'string' ? err : err.message || JSON.stringify(err)),
        false,
        'warning',
      );
    }
    if (continuous) await ns.sleep(interval);
  } while (continuous);
}

let lastUpgradeLog = '';
function setStatus(ns: NS, logMessage: string) {
  if (logMessage != lastUpgradeLog) ns.print((lastUpgradeLog = logMessage));
}

// Will buy the most effective hacknet upgrade, so long as it will pay for itself in the next {payoffTimeSeconds} seconds.
/** @param {NS} ns **/
export function upgradeHacknet(
  ns: NS,
  maxSpend: number,
  maxPayoffTimeSeconds = 3600 /* 3600 sec == 1 hour */,
  options,
) {
  const currentHacknetMult = ns.getPlayer().mults.hacknet_node_money;
  // Get the lowest cache level, we do not consider upgrading the cache level of servers above this until all have the same cache level
  const minCacheLevel = [...Array(ns.hacknet.numNodes()).keys()].reduce((min, i) => {
    return Math.min(min, ns.hacknet.getNodeStats(i).cache);
  }, Number.MAX_VALUE);
  // Note: Formulas API has a hashGainRate which should agree with these calcs, but this way they're available even without the formulas API
  const upgrades = [
    { name: 'none', cost: 0 },
    {
      name: 'level',
      upgrade: ns.hacknet.upgradeLevel,
      cost: (i: number): number => ns.hacknet.getLevelUpgradeCost(i, 1),
      nextValue: (nodeStats): number => nodeStats.level + 1,
      addedProduction: (nodeStats): number => nodeStats.numbenumber * ((nodeStats.level + 1) / nodeStats.level - 1),
    },
    {
      name: 'ram',
      upgrade: ns.hacknet.upgradeRam,
      cost: (i: number): number => ns.hacknet.getRamUpgradeCost(i, 1),
      nextValue: (nodeStats: { ram: number }) => nodeStats.ram * 2,
      addedProduction: (nodeStats: { production: number }) => nodeStats.production * 0.07,
    },
    {
      name: 'cores',
      upgrade: ns.hacknet.upgradeCore,
      cost: function (i: number): number {
        return ns.hacknet.getCoreUpgradeCost(i, 1);
      },
      nextValue: (nodeStats: { cores: number }): number => nodeStats.cores + 1,
      addedProduction: (nodeStats: { production: number; cores: number }): number =>
        nodeStats.production * ((nodeStats.cores + 5) / (nodeStats.cores + 4) - 1),
    },
    {
      name: 'cache',
      upgrade: ns.hacknet.upgradeCache,
      cost: (i: number) => ns.hacknet.getCacheUpgradeCost(i, 1),
      nextValue: (nodeStats) => nodeStats.cache + 1,
      addedProduction: (nodeStats: { cache: number; production: number }): number =>
        nodeStats.cache > minCacheLevel || !haveHacknetServers ? 0 : (nodeStats.production * 0.01) / nodeStats.cache, // Note: Does not actually give production, but it has "worth" to us so we can buy more things
    },
  ];
  // Find the best upgrade we can make to an existing node
  let nodeToUpgrade = -1;
  let bestUpgrade = '';
  let bestUpgradePayoff = 0; // Hashes per second per dollar spent. Bigger is better.
  let cost = 0;
  let upgradedValue = 0;
  let worstNodeProduction = Number.MAX_VALUE; // Used to how productive a newly purchased node might be
  for (let i = 0; i < ns.hacknet.numNodes(); i++) {
    const nodeStats = ns.hacknet.getNodeStats(i);
    if (haveHacknetServers) {
      // When a hacknet server runs scripts, nodeStats.production lags behind what it should be for current ram usage. Get the "raw" rate
      try {
        nodeStats.production = ns.formulas.hacknetServers.hashGainRate(
          nodeStats.level,
          0,
          nodeStats.ram,
          nodeStats.cores,
          currentHacknetMult,
        );
      } catch {
        /* If we do not have the formulas API yet, we cannot account for this and must simply fall-back to using the production reported by the node */
      }
    }
    worstNodeProduction = Math.min(worstNodeProduction, nodeStats.production);
    for (let up = 1; up < upgrades.length; up++) {
      const currentUpgradeCost = upgrades[up].cost(i);
      const payoff = upgrades[up].addedProduction(nodeStats) / currentUpgradeCost; // Production (Hashes per second) per dollar spent
      if (payoff > bestUpgradePayoff) {
        nodeToUpgrade = i;
        bestUpgrade = upgrades[up];
        bestUpgradePayoff = payoff;
        cost = currentUpgradeCost;
        upgradedValue = upgrades[up].nextValue(nodeStats);
      }
    }
  }
  // Compare this to the cost of adding a new node. This is an imperfect science. We are paying to unlock the ability to buy all the same upgrades our
  // other nodes have - all of which have been deemed worthwhile. Not knowing the sum total that will have to be spent to reach that same production,
  // the "most optimistic" case is to treat "price" of all that production to be just the cost of this server, but this is **very** optimistic.
  // In practice, the cost of new hacknodes scales steeply enough that this should come close to being true (cost of server >> sum of cost of upgrades)
  const newNodeCost = ns.hacknet.getPurchaseNodeCost();
  const newNodePayoff = ns.hacknet.numNodes() == ns.hacknet.maxNumNodes() ? 0 : worstNodeProduction / newNodeCost;
  const shouldBuyNewNode = newNodePayoff > bestUpgradePayoff;
  if (newNodePayoff == 0 && bestUpgradePayoff == 0) {
    setStatus(ns, `All upgrades have no value (is hashNet income disabled in this BN?)`);
    return false; // As long as maxSpend doesn't change, we will never purchase another upgrade
  }
  // If specified, only buy upgrades that will pay for themselves in {payoffTimeSeconds}.
  const hashDollarValue = haveHacknetServers ? 2.5e5 : 1; // Dollar value of one hash-per-second (0.25m dollars per production).
  const payoffTimeSeconds = 1 / (hashDollarValue * (shouldBuyNewNode ? newNodePayoff : bestUpgradePayoff));
  if (shouldBuyNewNode) cost = newNodeCost;

  // Prepare info about the next uprade. Whether we end up purchasing or not, we will display this info.
  const strPurchase =
    (shouldBuyNewNode
      ? `a new node "hacknet-node-${ns.hacknet.numNodes()}"`
      : `hacknet-node-${nodeToUpgrade} ${bestUpgrade} ${upgradedValue}`) + ` for ${formatMoney(cost)}`;
  const strPayoff = `production ${((shouldBuyNewNode ? newNodePayoff : bestUpgradePayoff) * cost).toPrecision(
    3,
  )} payoff time: ${formatDuration(1000 * payoffTimeSeconds)}`;
  if (cost > maxSpend) {
    setStatus(
      ns,
      `The next best purchase would be ${strPurchase}, but the cost exceeds the spending limit (${formatMoney(
        maxSpend,
      )})`,
    );
    return false; // Shut-down. As long as maxSpend doesn't change, we will never purchase another upgrade
  }
  if (payoffTimeSeconds > maxPayoffTimeSeconds) {
    setStatus(
      ns,
      `The next best purchase would be ${strPurchase}, but the ${strPayoff} is worse than the limit (${formatDuration(
        1000 * maxPayoffTimeSeconds,
      )})`,
    );
    return false; // Shut-down. As long as maxPayoffTimeSeconds doesn't change, we will never purchase another upgrade
  }
  const reserve = options['reserve'] != null ? options['reserve'] : Number(ns.read('reserve.txt') || 0);
  const playerMoney = ns.getPlayer().money;
  if (cost > playerMoney - reserve) {
    setStatus(
      ns,
      `The next best purchase would be ${strPurchase}, but the cost exceeds the our ` +
        `current available funds` +
        (reserve == 0 ? '.' : ` (after reserving ${formatMoney(reserve)}).`),
    );
    return 0; //
  }
  const success = shouldBuyNewNode ? ns.hacknet.purchaseNode() !== -1 : null //ns.hacknet.bestUpgrade.upgrade(nodeToUpgrade, 1);
  ns.hacknet.numHashes
  if (success && options.toast) ns.toast(`Purchased ${strPurchase}`, 'success');
  setStatus(
    ns,
    success
      ? `Purchased ${strPurchase} with ${strPayoff}`
      : `Insufficient funds to purchase the next best upgrade: ${strPurchase}`,
  );
  return success ? cost : 0;
}
// interface NodeStats {
//   /** Node's name */
//   name: string;
//   /** Node's level */
//   level: number;
//   /** Node's RAM (GB) */
//   ram: number;
//   /** Node's used RAM (GB) */
//   ramUsed?: number;
//   /** Node's number of cores */
//   cores: number;
//   /** Cache level. Only applicable for Hacknet Servers */
//   cache?: number;
//   /** Hash Capacity provided by this Node. Only applicable for Hacknet Servers */
//   hashCapacity?: number;
//   /** Node's production per second */
//   production: number;
//   /** Number of seconds since Node has been purchased */
//   timeOnline: number;
//   /** Total number of money Node has produced */
//   totalProduction: number;
// }
//
