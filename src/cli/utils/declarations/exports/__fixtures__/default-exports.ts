interface Config {
  apiUrl: string;
  timeout: number;
}

const defaultConfig: Config = {
  apiUrl: 'https://api.example.com',
  timeout: 3000,
};

export default defaultConfig;
