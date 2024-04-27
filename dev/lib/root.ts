import { NS, Person, Player, Server } from '@ns';
import type { name } from '@skogix';

/** Object representing a port. A port is a serialized queue.
 * @public */
export class pc implements Server {
  public hostname: string;
  public ip: string;
  public sshPortOpen: boolean;
  public ftpPortOpen: boolean;
  public smtpPortOpen: boolean;
  public httpPortOpen: boolean;
  public sqlPortOpen: boolean;
  public requiredHackingSkill?: number | undefined;
  public hasAdminRights: boolean;
  public cpuCores: number;
  public isConnectedTo: boolean;
  public ramUsed: number;
  public maxRam: number;
  public organizationName: string;
  public purchasedByPlayer: boolean;
  public backdoorInstalled: boolean | undefined;
  public baseDifficulty: number | undefined;
  public hackDifficulty: number | undefined;
  public minDifficulty: number | undefined;
  public moneyAvailable: number | undefined;
  public moneyMax: number | undefined;
  public numOpenPortsRequired: number | undefined;
  public openPortCount: number | undefined;
  public serverGrowth: number | undefined;

  public constructor(server: Server) {
    this.hostname = server.hostname;
    this.ip = server.ip;
    this.sshPortOpen = server.sshPortOpen;
    this.ftpPortOpen = server.ftpPortOpen;
    this.smtpPortOpen = server.smtpPortOpen;
    this.httpPortOpen = server.httpPortOpen;
    this.sqlPortOpen = server.sqlPortOpen;
    this.hasAdminRights = server.hasAdminRights;
    this.cpuCores = server.cpuCores;
    this.isConnectedTo = server.isConnectedTo;
    this.ramUsed = server.ramUsed;
    this.maxRam = server.maxRam;
    this.organizationName = server.organizationName;
    this.purchasedByPlayer = server.purchasedByPlayer;
    this.backdoorInstalled = server.backdoorInstalled;
    this.baseDifficulty = server.baseDifficulty;
    this.hackDifficulty = server.hackDifficulty;
    this.minDifficulty = server.minDifficulty;
    this.moneyAvailable = server.moneyAvailable;
    this.moneyMax = server.moneyMax;
    this.numOpenPortsRequired = server.numOpenPortsRequired;
    this.openPortCount = server.openPortCount;
    this.serverGrowth = server.serverGrowth;
  }
}
export async function main(ns: NS): Promise<root> {
  return root.getInstance(ns);
}
/* @public */
export class root extends pc {
  private static ns: NS;
  private static instance: root;
  public static readonly PROGRAM = (ns: NS) => root.PROGRAMS(ns);
  public static readonly PROGRAMS = (ns: NS) => {
    return {
      BruteSSH: (name: name) => (ns ? ns.brutessh(name) : root.ns.brutessh(name)),
      FTPCrack: (name: name) => (ns ? ns.ftpcrack(name) : root.ns.ftpcrack(name)),
      relaySMTP: (name: name) => (ns ? ns.relaysmtp(name) : root.ns.relaysmtp(name)),
      HTTPWorm: (name: name) => (ns ? ns.httpworm(name) : root.ns.httpworm(name)),
      SQLInject: (name: name) => (ns ? ns.sqlinject(name) : root.ns.sqlinject(name)),
    };
  };
  public static hostname = root.ns.getServer('home').hostname;
  public static ip = root.ns.getServer('home').ip;
  public static sshPortOpen = root.ns.fileExists('BruteSSH.exe');
  public static ftpPortOpen = root.ns.fileExists('FtpCrack.exe');
  public static smtpPortOpen = root.ns.fileExists('relaySMTP.exe');
  public static httpPortOpen = root.ns.fileExists('HTTPWorm.exe');
  public static sqlPortOpen = root.ns.fileExists('SQLInject.exe');
  public static hasAdminRights = true;
  public static cpuCores = root.ns.getServer('home').cpuCores;
  public static isConnectedTo = root.ns.getServer('home').isConnectedTo;
  public static ramUsed = root.ns.getServer('home').ramUsed;
  public static maxRam = root.ns.getServer('home').maxRam;
  public static organizationName = root.ns.getServer('home').organizationName;
  public static purchasedByPlayer = root.ns.getServer('home').purchasedByPlayer;
  public static backdoorInstalled = root.ns.getServer('home').backdoorInstalled;
  public static baseDifficulty = root.ns.getServer('home').baseDifficulty;
  public static hackDifficulty = root.ns.getServer('home').hackDifficulty;
  public static minDifficulty = root.ns.getServer('home').minDifficulty;
  public static moneyAvailable = root.ns.getServer('home').moneyAvailable;
  public static moneyMax = root.ns.getServer('home').moneyMax;
  public static numOpenPortsRequired = root.ns.getServer('home').numOpenPortsRequired;
  public static openPortCount = root.ns.getServer('home').openPortCount;
  public static requiredHackingSkill = root.ns.getServer('home').requiredHackingSkill;
  public static serverGrowth = root.ns.getServer('home').serverGrowth;
  public static karma = root.ns.heart;
  public static player: Player;
  public static person: Person;
  public static purchasedServers = root.ns.getPurchasedServers().map((s) => root.ns.getServer(s));
  public static Player: Player;

  private constructor(ns: NS) {
    super(ns);
    const player = ns.getPlayer();
    root.ns = ns;
    root.player = player;
    root.person = player;
  }
  public static getInstance(ns: NS) {
    if (!ns) throw Error('root är en singleton så skicka initparams');
    if (root.instance) {
      return root.instance;
    } else {
      return new root(ns);
    }
  }
}
