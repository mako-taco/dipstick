import { Container } from '../../../../../lib/index';

export type ContainerA = Container<{}>;

export type ContainerB = Container<{ dependencies: DepsB }>;

export type ContainerC = Container<{
  dependencies: DepsC;
}>;

export type ContainerD = Container<{
  dependencies: DepsD;
}>;

export type DepsB = [ContainerA];
export type DepsC = [ContainerA, ContainerB];
export type DepsD = [ContainerA, ContainerB, ContainerC];
