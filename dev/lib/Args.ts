import type { NS } from '@ns';
import { AcceptedArg, KArgs, MainFunc } from '@skogix';

export const getArgHelp = (acceptedArgs: AcceptedArg[]) => {
  const parsedArgs = acceptedArgs.map((acceptedArg) => {
    const { fullKeyword, shortKeyword, type, required, default: defaultVal, description } = acceptedArg;

    const title = fullKeyword.toUpperCase().replace('-', ' ');
    const exampleText = type !== 'flag' ? `<${type}>` : '';

    return `
${title}
  Usage:
      --${fullKeyword} ${exampleText}
      -${shortKeyword} ${exampleText}
  Type:
      <${type}>
  Required:
      ${required && type !== 'flag' ? 'Yes' : 'No'}
  Default:
      ${defaultVal ? (type === 'flag' ? 'false' : defaultVal) : 'None'}
  Description:
      ${description}`;
  });

  return parsedArgs.join('');
};

export const parseKArgs = (args: string[], acceptedArgs: AcceptedArg[]) => {
  const kargs: KArgs = {};

  const shortformRegex = /^-[\S]+/gm;
  const longformRegex = /^--[\S]+/gm;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    const isShortform = shortformRegex.test(arg);
    const isLongform = longformRegex.test(arg);

    const getAcceptedArgVal = (formattedArg: string) => {
      acceptedArgs.forEach((acceptedArg) => {
        if (formattedArg === acceptedArg.shortKeyword || formattedArg === acceptedArg.fullKeyword) {
          switch (acceptedArg.type) {
            case 'flag':
              kargs[acceptedArg.fullKeyword] = true;
              break;
            case 'number':
              kargs[acceptedArg.fullKeyword] = +args[i + 1];
              break;
            default:
              kargs[acceptedArg.fullKeyword] = args[i + 1];
          }
        }
      });
    };

    if (isShortform && !isLongform) {
      // -=- Short Form Arg -=-
      const formattedArg = arg.substr(1);
      getAcceptedArgVal(formattedArg);
    } else if (isLongform) {
      // -=- Long Form Arg -=-
      const formattedArg = arg.substr(2);
      getAcceptedArgVal(formattedArg);
    }
  }

  return kargs;
};

/**
 * Parses command line arguments and runs the main program. Supports `--help` and `-h` flags.
 */
export const argParser = async (ns: NS, args: string[], argSchema: AcceptedArg[], mainFunc: MainFunc) => {
  // -=- Help Flag -=-
  if (args.includes('--help') || args.includes('-h')) {
    ns.tprint(getArgHelp(argSchema));
    return;
  }

  // -=- Key Args -=-
  const kargs: KArgs = parseKArgs(args, argSchema);

  // -=- Required Args -=-
  const missingArgs = argSchema.filter((arg) => {
    return arg.required && kargs[arg.fullKeyword] === undefined;
  });

  if (missingArgs.length > 0) {
    ns.tprint(`Missing required args: ${missingArgs.map((arg) => arg.fullKeyword).join(', ')}\n`);
    ns.tprint(getArgHelp(argSchema));
    return;
  }

  argSchema.forEach((arg) => {
    if (kargs[arg.fullKeyword] === undefined && arg.default !== undefined) {
      kargs[arg.fullKeyword] = arg.default;
    }
  });

  // -=- Main Program -=-
  await mainFunc(ns, kargs);
};
