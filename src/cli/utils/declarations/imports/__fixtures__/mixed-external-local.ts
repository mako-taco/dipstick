import React from 'react';
import { readFileSync } from 'fs';
import { Logger } from './source-files/logger';
import defaultUtil from './source-files/utils';

export const useMixedExternalAndLocal = () => {
  const logger: Logger = {
    log: (msg: string) => console.log(msg),
    error: (msg: string) => console.error(msg),
  };

  const processedData = defaultUtil('test data');

  // This would use external modules in real code
  const fileContent = readFileSync('./test.txt', 'utf-8');

  logger.log(`Processed: ${processedData}, Content: ${fileContent}`);

  return React.createElement('div', null, 'Mixed imports example');
};
