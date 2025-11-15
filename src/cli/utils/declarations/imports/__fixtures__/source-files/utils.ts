export const formatString = (str: string): string => {
  return str.trim().toLowerCase();
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export default function defaultUtilFunction(input: string): string {
  return `Processed: ${input}`;
}
