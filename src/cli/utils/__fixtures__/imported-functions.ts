export function importedFunction(
  importedParam1: string,
  importedParam2: boolean
) {
  return importedParam1 + importedParam2;
}

export class ImportedClass {
  constructor(importedClassParam: number) {
    // constructor
  }
}

export const importedArrowFunction = (arrowParam: string) => {
  return arrowParam;
};
