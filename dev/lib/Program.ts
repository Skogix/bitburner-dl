import { NS } from '@ns';
import { name } from '@skogix';

export type program = (ns: NS) => void;
export type programs = (name: name) => program;
