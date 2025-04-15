declare module '*.css' {
  const css: string;
  export default css;
}

declare module '*.css?inline' {
  const content: string;
  export default content;
}
