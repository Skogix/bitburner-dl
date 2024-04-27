import { Message, NULL_PORT_DATA, Payload } from "/Orchestrator/MessageManager/class.js";
import { Action, ChannelName } from "/Orchestrator/MessageManager/enum.js";
import { dprint } from "/Orchestrator/Common/Dprint.js";
export async function main(ns) {
  ns.disableLog("sleep");
  emptyPorts();
  let messageQueue = [];
  while (true) {
    await receiveMessage();
    await checkMessageRequest();
    await checkConsoleCall();
    await checkClearMessage();
    await ns.sleep(10);
  }
  async function checkConsoleCall() {
    const dumpQueue = extractMessage((m) => m.payload.action === Action.dumpQueue);
    if (dumpQueue.length > 0) {
      for (const message of messageQueue) {
        ns.tprint("From: " + message.origin + ":" + message.originId + " -> To:" + message.destination + ":" + message.destinationId + " > Payload: " + JSON.stringify(message.payload));
      }
    }
  }
  async function checkClearMessage() {
    const messages = extractMessage((m) => m.payload.action === Action.clearMyMessage);
    for (const message of messages) {
      messageQueue = messageQueue.filter((m) => m.destinationId !== message.originId && m.destination !== message.origin);
    }
  }
  function extractMessage(filter) {
    const extractedMessage = messageQueue.filter(filter);
    messageQueue = messageQueue.filter((m) => !filter(m));
    return extractedMessage;
  }
  async function checkMessageRequest() {
    const requests = extractMessage((m) => m.payload.action === Action.messageRequest);
    for (const request of requests) {
      const port = request.comPort;
      const requesterFilter = (m) => m.destination === request.origin && m.destinationId === request.originId;
      let extraFilter = (m) => true;
      if (request.payload.info) {
        extraFilter = eval(request.payload.info);
      }
      const messageForRequester = extractMessage(requesterFilter);
      const messageToSend = messageForRequester.filter(extraFilter);
      const messageToKeep = messageForRequester.filter((m) => !extraFilter(m));
      messageQueue.push(...messageToKeep);
      if (messageToSend.length > 0) {
        await dispatchMessage(messageToSend, port);
      }
      await dispatchMessage([new Message(request.comPort, ChannelName.messageManager, request.origin, new Payload(Action.noMessage), null, request.originId)], port);
    }
  }
  async function dispatchMessage(messageToSend2, port2) {
    for (const message of messageToSend2) {
      message.dispatchedTime = Date.now();
      message.comPort = port2;
      const writtenMessage = await ns.tryWritePort(
        message.comPort,
        message.string
      );
      if (!writtenMessage) {
        dprint(ns, "Sending failed: " + message.destination + ":" + message.destinationId + "(Port: " + message.comPort + "). Readded to queue.");
        messageQueue.push(message);
      }
    }
  }
  async function receiveMessage() {
    for (let port2 = 1; port2 < 21; port2++) {
      const response = ns.peek(port2);
      if (response !== NULL_PORT_DATA) {
        let parsedResponse = Message.fromJSON(response);
        if (parsedResponse.dispatchedTime && Date.now() - parsedResponse.dispatchedTime > 1e3) {
          if (Date.now() - parsedResponse.dispatchedTime > 1e3) {
            ns.readPort(port2);
            await dispatchMessage([parsedResponse], parsedResponse.comPort);
            dprint(ns, "Stale to: " + parsedResponse.destination + ":" + parsedResponse.destinationId + " Action: " + parsedResponse.payload.action);
          } else if (Date.now() - parsedResponse.dispatchedTime > 6e4) {
            ns.readPort(port2);
            dprint(ns, "Discarded to: " + parsedResponse.destination + ":" + parsedResponse.destinationId + " Action: " + parsedResponse.payload.action);
          }
        } else if (!parsedResponse.dispatchedTime) {
          ns.readPort(port2);
          messageQueue.push(parsedResponse);
        }
      }
    }
  }
  function emptyPorts() {
    for (let i = 1; i < 21; i++) {
      while (true) {
        if (ns.readPort(i) === NULL_PORT_DATA) {
          break;
        }
      }
    }
  }
}
