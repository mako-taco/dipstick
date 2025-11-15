import fs from 'fs';
import path from 'path';
import React, { useState, useEffect } from 'react';
import { join, resolve as pathResolve } from 'path';

export const useExternalImports = () => {
  const [data, setData] = useState('');

  useEffect(() => {
    const filePath = pathResolve(join(__dirname, 'test.txt'));
    const content = fs.readFileSync(filePath, 'utf-8');
    setData(content);
  }, []);

  return React.createElement('div', null, data);
};
