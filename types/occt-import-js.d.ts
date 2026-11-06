// occt-import-js ships no types. Adapted from Enport's types/occt-import-js.d.ts,
// with the product tree (names, children) that the CAD pipeline relies on.
declare module 'occt-import-js' {
  interface OcctMesh {
    name: string;
    attributes: {
      position: { array: number[] | Float32Array };
      normal?: { array: number[] | Float32Array };
    };
    index?: { array: number[] | Uint32Array };
    /** sRGB, 0..1 */
    color?: [number, number, number];
  }

  interface OcctNode {
    name: string;
    meshes: number[];
    children: OcctNode[];
  }

  interface OcctResult {
    success: boolean;
    root: OcctNode;
    meshes: OcctMesh[];
  }

  interface OcctParams {
    linearDeflection?: number;
    linearDeflectionType?: 'bounding_box_ratio' | 'absolute_value';
    angularDeflection?: number;
  }

  interface OcctModule {
    ReadStepFile(buffer: Uint8Array, params?: OcctParams | null): OcctResult;
    ReadIgesFile(buffer: Uint8Array, params?: OcctParams | null): OcctResult;
  }

  function occtimportjs(options?: { locateFile?: (filename: string) => string }): Promise<OcctModule>;
  export default occtimportjs;
  export type { OcctMesh, OcctNode, OcctResult, OcctParams, OcctModule };
}
