import { Type } from 'ts-morph';

export const typesEqual = (t0: Type, t1: Type) => {
  return t0.isAssignableTo(t1) && t1.isAssignableTo(t0);
};
