import { NS, NetscriptPort } from '@ns';
import { port } from '@skogix';
/** @param {NS} ns */
export async function main(ns: NS) {
  // Arbitrary port number here, you'll want to use one port per target server
  const target = ns.getServer('n00dles');
  const port: port = 0

  // We start with bogus values which will force an update on the port value
  let oldMessage = '';
  ns.tail();
  ns.disableLog('ALL');
  while (true) {
    // Get current security level and hacking level, both of which are the main factors in batch times
    // In endgame, you'd want to include some other values as well

    // If there was a change clear and broadcast the new value
    const message = JSON.stringify({ target: target });
    if (message.toString() != oldMessage.toString()) {
      ns.clearPort(port);

      // Write a JSON object to the port that includes the current security level of our target
      // and the current hacking level of the player
      const result = ns.writePort(port, message);
      // ns.print(timestamp: ${Date.now()})
      ns.print(`\nport full?: ${ns.getPortHandle(port).full()}\nport: ${port}\ndata: ${message}\nresult: ${result}`);
      // Update our "last" values for the next iteration
      oldMessage = message;
    }

    await ns.sleep(1 * 1000);
  }
}
