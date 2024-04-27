/* eslint-disable @typescript-eslint/no-unused-vars */
import { NS } from '@ns';
import { command, name } from '@skogix';

const rootComputer = (ns: NS, name: name, command: command) => {
  if (ns.hasRootAccess(name)) return true;

  const numPortsReq = ns.getServerNumPortsRequired(name);
  const portOpeners = [
    {
      hackFunc: ns.brutessh,
      fileName: 'BruteSSH',
    },
    {
      hackFunc: ns.ftpcrack,
      fileName: 'FTPCrack',
    },
    {
      hackFunc: ns.relaysmtp,
      fileName: 'relaySMTP',
    },
    {
      hackFunc: ns.httpworm,
      fileName: 'HTTPWorm',
    },
    {
      hackFunc: ns.sqlinject,
      fileName: 'SQLInject',
    },
  ];

  for (let i = numPortsReq; i > 0; i--) {
    const portOpener = portOpeners[i - 1];

    if (!ns.fileExists(`${portOpener.fileName}.exe`)) {
      if (command) {
        ns.tprint(`WARNING: Unable to hack ${name}; research on ${portOpener.fileName} required`);
      }
      return false;
    }

    portOpener.hackFunc(name);
  }

  ns.nuke(name);
  return true;
};

export default rootComputer;
