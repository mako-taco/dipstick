/**
 * Given a string with complex characters, encode it to a string that can be used as an identifier in
 * JavaScript.
 * @param text
 */
export const encodeJsIdentifier = (text: string) => {
  // Replace any characters that aren't valid in JS identifiers with underscores
  return uncapitalize(text)
    .replace(/^[0-9]/, "_") // Replace leading number
    .replace(/[^a-zA-Z0-9_$]/g, "_"); // Replace invalid chars with underscore
};

function uncapitalize(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}
