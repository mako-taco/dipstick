import { dip } from '../../../../../lib/index';

export type ModuleA = dip.Module<{}>;

export type ModuleB = dip.Module<{ dependencies: DepsB }>;

export type ModuleC = dip.Module<{
  dependencies: DepsC;
}>;

export type ModuleD = dip.Module<{
  dependencies: DepsD;
}>;

export type DepsB = [ModuleA];
export type DepsC = [ModuleA, ModuleB];
export type DepsD = [ModuleA, ModuleB, ModuleC];
