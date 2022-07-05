const Scene = require("Scene");
const FaceTracking = require("FaceTracking");
const Reactive = require("Reactive");
const Materials = require("Materials");
const Textures = require("Textures");
const Shaders = require("Shaders");
const Time = require("Time");
const Diagnostics = require("Diagnostics");
const TouchGestures = require("TouchGestures");
function animateMesh(newMesh, smoothBy, delayBy, transform) {
  let xValue = Reactive.expSmooth(
    transform.x.delayBy({
      milliseconds: delayBy,
    }),
    smoothBy
  );
  let yValue = Reactive.expSmooth(
    transform.y.delayBy({
      milliseconds: delayBy,
    }),
    smoothBy
  );
  let zValue = Reactive.expSmooth(
    transform.z.delayBy({
      milliseconds: delayBy,
    }),
    smoothBy
  );

  let xRotation = Reactive.expSmooth(
    transform.rotationX.delayBy({
      milliseconds: delayBy,
    }),
    smoothBy
  );
  let yRotation = Reactive.expSmooth(
    transform.rotationY.delayBy({
      milliseconds: delayBy,
    }),
    smoothBy
  );
  let zRotation = Reactive.expSmooth(
    transform.rotationZ.delayBy({
      milliseconds: delayBy,
    }),
    smoothBy
  );

  newMesh.transform.x = xValue;
  newMesh.transform.y = yValue;
  newMesh.transform.z = zValue;

  newMesh.transform.rotationX = xRotation;
  newMesh.transform.rotationY = yRotation;
  newMesh.transform.rotationZ = zRotation;
}

async function setMaterial(materials, color, opacity, materialIndex) {
  const textureSlot = Shaders.DefaultMaterialTextures.DIFFUSE;
  const material = materials[materialIndex];

  material.setTextureSlot(textureSlot, color);
  material.opacity = opacity;

  Diagnostics.log("afterSlot");

  return material;
}
async function createColor(faceTrackingTex, materialIndex) {
  const uvs = Shaders.vertexAttribute({
    variableName: Shaders.VertexAttribute.TEX_COORDS,
  });
  const color = Shaders.textureSampler(faceTrackingTex.signal, uvs);
  return color;
}

async function createMeshes(
  index,
  amountOfMeshes,
  materials,
  meshesParent,
  faceTrackingTex,
  maxSmooth,
  maxDelay
) {
  const materialIndex = Math.round(
    (index / amountOfMeshes) * (materials.length - 1)
  );
  const smoothBy = (maxSmooth / amountOfMeshes) * (index + 1);
  const delayBy = (maxDelay / amountOfMeshes) * (index + 1);
  const color = await createColor(faceTrackingTex, materialIndex);
  const opacity = (1 / amountOfMeshes) * index;
  const material = await setMaterial(materials, color, opacity, materialIndex);
  let transform = FaceTracking.face(0).cameraTransform;
  Diagnostics.log("create");
  let newMesh = await Scene.create("FaceMesh", {
    name: "mesh" + index,
  });
  newMesh.material = material;
  animateMesh(newMesh, smoothBy, delayBy, transform);
  addToParent(newMesh, meshesParent);
  return newMesh;
}

async function removeFromParent(mesh, meshesParent) {
  // Diagnostics.log("removed");
  //
  // return await meshesParent.removeChild(mesh);
  return await Scene.destroy(mesh);
}

async function addToParent(mesh, meshesParent) {
  return await meshesParent.addChild(mesh);
  // Diagnostics.log("added");
}

async function main() {
  const amountOfMeshes = 8;
  const maxSmooth = 350;
  const maxDelay = 0.8;
  const [meshesParent, faceTrackingTex, materials] = await Promise.all([
    Scene.root.findFirst("meshesNullObj"),
    Textures.findFirst("faceTracker0 Texture"),
    Materials.findUsingPattern("mask-material*"),
  ]);
  const sortedMaterials = materials.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  let allMeshes = null;
  async function initialiseMeshes() {
    const meshes = [];
    for (let i = 0; i < amountOfMeshes; i++) {
      meshes.push(
        await createMeshes(
          i,
          amountOfMeshes,
          sortedMaterials,
          meshesParent,
          faceTrackingTex,
          maxSmooth,
          maxDelay
        )
      );
    }
    allMeshes = meshes;
  }
  await initialiseMeshes().then(() => gameLoop());
  // await initialisation
  let touchActive = true;
  async function createAndDestroyMeshes() {
    Diagnostics.log("firstInterval");
    const first = [];
    for (let i = 0; i < amountOfMeshes; i++) {
      Diagnostics.log("remove");
      const currentMesh = allMeshes[i];
      first.push(await removeFromParent(currentMesh, meshesParent));
    }
    Promise.all(first)
      .then(async () => {
        Diagnostics.log("secondInterval");
        const meshes = [];
        for (let i = 0; i < amountOfMeshes; i++) {
          meshes.push(
            await createMeshes(
              i,
              amountOfMeshes,
              sortedMaterials,
              meshesParent,
              faceTrackingTex,
              maxSmooth,
              maxDelay
            )
          );
        }
        allMeshes = meshes;
      })
      .then(() => (touchActive = true));
  }

  async function gameLoop() {
    TouchGestures.onTap().subscribe(async (gesture) => {
      if (touchActive) {
        Diagnostics.log("tap");
        touchActive = false;
        Diagnostics.log("deactivated");
        createAndDestroyMeshes();

        Diagnostics.log("activated");
      } else {
        Diagnostics.log("inactiveTape");
      }
    });
  }
}

main();
