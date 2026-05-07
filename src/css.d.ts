// Allow importing CSS files as side-effect imports
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
