import { NS } from '@ns';

/**
 * Recursively scans for all connected devices up to `maxDepth` using `ns.scan()`.
 */
const recursiveScan = (ns: NS, maxDepth: number, allowHome = false) => {
  const foundDevices: { [key: string]: boolean } = {};

  const scan = (uuid: string, currDepth: number) => {
    foundDevices[uuid] = true;

    if (currDepth >= maxDepth) return uuid;

    let connectedDevices = ns.scan(uuid || 'home').filter((deviceUUID: string) => {
      return foundDevices[deviceUUID] === undefined && deviceUUID !== 'home';
    });

    connectedDevices = connectedDevices.flatMap((deviceUUID) => {
      return scan(deviceUUID, currDepth + 1);
    });

    if (uuid !== '') {
      connectedDevices.push(uuid);
    }

    return connectedDevices;
  };

  const foundDevicesArray = scan('', 0);

  if (typeof foundDevicesArray === 'string') {
    ns.tprint('ERROR No computers found.');
    return [];
  }

  if (allowHome) foundDevicesArray.push('home');

  return foundDevicesArray;
};

export default recursiveScan;
