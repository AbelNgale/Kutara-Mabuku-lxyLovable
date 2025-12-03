declare module 'pagedjs' {
  export class Previewer {
    preview(
      content: string,
      stylesheets: Array<{ styles: string }>,
      renderTo: HTMLElement
    ): Promise<void>;
  }
  
  export class Chunker {
    constructor();
  }
  
  export class Polisher {
    constructor();
  }
}
