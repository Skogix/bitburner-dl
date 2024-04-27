import { NS } from '@ns';
/** @param {NS} ns */
export async function main(
  ns: NS,
  target: string,
  delay: number,
  port: number,
  security: number,
  hackingLevel: number,
): Promise<void> {
  if (
    target == undefined ||
    delay == undefined ||
    port == undefined ||
    security == undefined ||
    hackingLevel == undefined
  ) {
    ns.tprint('FAIL: Missing some arguments?!');
    return;
  }

  // We wait the requested delay before starting our hack
  await ns.sleep(delay);

  // We make sure security and hacking level are where we want them to be
  const portData = JSON.parse(ns.peek(port));
  if (portData.security != security) {
    ns.tprint('FAIL: Security is ' + portData.security + ' expected ' + security + ' aborting!');
    return;
  }
  if (portData.hackLevel != hackingLevel) {
    ns.tprint('FAIL: Hack level is ' + portData.hackLevel + ' expected ' + hackingLevel + ' aborting!');
    return;
  }

  // Do the hack if we passed the checks!
  await ns.hack(target);
}

