import React, { Component, useState, useEffect } from 'react';
import fs from 'fs';
import { join, resolve } from 'path';
import { EventEmitter } from 'events';

export const useExternalModules = () => {
  const [state, setState] = useState('initial');

  useEffect(() => {
    const filePath = resolve(join(__dirname, 'test.txt'));
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      setState(content);
    }

    const emitter = new EventEmitter();
    emitter.on('test', () => console.log('Event fired'));
  }, []);

  class TestComponent extends Component {
    render() {
      return React.createElement('div', null, state);
    }
  }

  return { TestComponent, state };
};
