"""Native OpenCascade STEP reader for `npm run cad` (showcases with mesher: 'native').

occt-import-js runs OpenCascade in WebAssembly, which has a memory ceiling. A
large assembly (say, one carrying several detailed PCB exports) can come back
with every part meshed to zero triangles. This reads the same STEP with native
OpenCascade (the cadquery-ocp wheel) and writes the result in occt-import-js's
own shape, so scripts/cad/stepToGlb.ts builds the GLB the same way from either.

  python occt_native.py <in.step> <out-dir> <linear-ratio> <angular-deflection>

Writes <out-dir>/mesh.json (the product tree, plus each mesh's name, color and
where its arrays sit in mesh.bin) and <out-dir>/mesh.bin (float32 positions,
float32 normals, uint32 indices, back to back). Positions are in the
assembly's coordinates, in millimetres, as the STEP saved them.

Setup, once: python3 -m venv .cad-venv && .cad-venv/bin/pip install cadquery-ocp==8.0.1.1.0
"""

import json
import os
import sys
from array import array

from OCP.BRep import BRep_Tool
from OCP.BRepBndLib import BRepBndLib
from OCP.BRepLib import BRepLib_ToolTriangulatedShape
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.Bnd import Bnd_Box
from OCP.IFSelect import IFSelect_RetDone
from OCP.OCP.collections import Sequence_TDF_Label
from OCP.Quantity import Quantity_Color
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TCollection import TCollection_ExtendedString
from OCP.TDF import TDF_Label
from OCP.TDataStd import TDataStd_Name
from OCP.TDocStd import TDocStd_Document
from OCP.TopAbs import TopAbs_FACE, TopAbs_REVERSED
from OCP.TopExp import TopExp_Explorer
from OCP.TopLoc import TopLoc_Location
from OCP.TopoDS import TopoDS
from OCP.XCAFDoc import XCAFDoc_ColorGen, XCAFDoc_ColorSurf, XCAFDoc_DocumentTool


def main() -> None:
    src, out_dir, linear_ratio, angular = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])

    doc = TDocStd_Document(TCollection_ExtendedString("cad"))
    reader = STEPCAFControl_Reader()
    reader.SetNameMode(True)
    reader.SetColorMode(True)
    if reader.ReadFile(src) != IFSelect_RetDone:
        sys.exit(f"OpenCascade could not read {src}")
    reader.Transfer(doc)
    shapes = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())
    colors = XCAFDoc_DocumentTool.ColorTool_s(doc.Main())

    roots = Sequence_TDF_Label()
    shapes.GetFreeShapes(roots)
    root_labels = [roots.Value(i) for i in range(1, roots.Length() + 1)]

    # Linear deflection as a share of the model's average size, the way
    # occt-import-js reads 'bounding_box_ratio'. Every distinct part is
    # meshed once; instances share it.
    box = Bnd_Box()
    for label in root_labels:
        BRepBndLib.Add_s(shapes.GetShape_s(label), box)
    lo, hi = box.CornerMin(), box.CornerMax()
    size = ((hi.X() - lo.X()) + (hi.Y() - lo.Y()) + (hi.Z() - lo.Z())) / 3
    for label in root_labels:
        BRepMesh_IncrementalMesh(shapes.GetShape_s(label), size * linear_ratio, False, angular, True)

    def name_of(label: TDF_Label) -> str:
        attr = TDataStd_Name()
        if label.FindAttribute(TDataStd_Name.GetID_s(), attr):
            return attr.Get().ToExtString()
        return ""

    def color_of(*labels: TDF_Label):
        c = Quantity_Color()
        for label in labels:
            for kind in (XCAFDoc_ColorSurf, XCAFDoc_ColorGen):
                if colors.GetColor_s(label, kind, c):
                    return [Quantity_Color.Convert_LinearRGB_To_sRGB_s(v) for v in (c.Red(), c.Green(), c.Blue())]
        return None

    blob = bytearray()
    meshes = []

    def put(values: array) -> list:
        offset = len(blob)
        blob.extend(values.tobytes())
        return [offset, len(values)]

    def mesh_of(shape, location: TopLoc_Location, name: str, color):
        positions, normals, indices = array("f"), array("f"), array("I")
        explorer = TopExp_Explorer(shape.Moved(location), TopAbs_FACE)
        while explorer.More():
            face = TopoDS.Face(explorer.Current())
            explorer.Next()
            face_loc = TopLoc_Location()
            tri = BRep_Tool.Triangulation_s(face, face_loc)
            if tri is None or tri.NbTriangles() == 0:
                continue
            if not tri.HasNormals():
                BRepLib_ToolTriangulatedShape.ComputeNormals_s(face, tri)
            trsf = face_loc.Transformation()
            flip = face.Orientation() == TopAbs_REVERSED
            base = len(positions) // 3
            for i in range(1, tri.NbNodes() + 1):
                p = tri.Node(i).Transformed(trsf)
                positions.extend((p.X(), p.Y(), p.Z()))
                n = tri.Normal(i).Transformed(trsf)
                if flip:
                    normals.extend((-n.X(), -n.Y(), -n.Z()))
                else:
                    normals.extend((n.X(), n.Y(), n.Z()))
            for t in range(1, tri.NbTriangles() + 1):
                a, b, c = tri.Triangle(t).Get()
                if flip:
                    b, c = c, b
                indices.extend((base + a - 1, base + b - 1, base + c - 1))
        if not indices:
            return None
        meshes.append(
            {"name": name, "color": color, "position": put(positions), "normal": put(normals), "index": put(indices)}
        )
        return len(meshes) - 1

    def walk(label: TDF_Label, location: TopLoc_Location, name: str, color) -> dict:
        node = {"name": name, "meshes": [], "children": []}
        if shapes.IsAssembly_s(label):
            comps = Sequence_TDF_Label()
            shapes.GetComponents_s(label, comps, False)
            for i in range(1, comps.Length() + 1):
                comp = comps.Value(i)
                ref = TDF_Label()
                shapes.GetReferredShape_s(comp, ref)
                child_loc = location.Multiplied(shapes.GetLocation_s(comp))
                child_name = name_of(ref) or name_of(comp)
                node["children"].append(walk(ref, child_loc, child_name, color_of(comp, ref) or color))
        else:
            index = mesh_of(shapes.GetShape_s(label), location, name, color)
            if index is not None:
                node["meshes"].append(index)
        return node

    root = {
        "name": "",
        "meshes": [],
        "children": [walk(label, TopLoc_Location(), name_of(label), color_of(label)) for label in root_labels],
    }

    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "mesh.bin"), "wb") as f:
        f.write(blob)
    with open(os.path.join(out_dir, "mesh.json"), "w") as f:
        json.dump({"root": root, "meshes": meshes}, f)


if __name__ == "__main__":
    main()
