const Scene = require("Scene");
const FaceTracking = require("FaceTracking");
const Reactive = require("Reactive");
const Materials = require("Materials");
const Textures = require("Textures");
const Shaders = require("Shaders");
const Time = require("Time");
const Diagnostics = require("Diagnostics");
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

async function createMeshes(amountOfMeshes) {
  const faceTrackingTex = await Textures.findFirst("faceTracker0 Texture");
  let materials = await Materials.findUsingPattern("mask-material*");
  materials.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  let transform = FaceTracking.face(0).cameraTransform;
  let maxSmooth = 350;
  let maxDelay = 0.8;

  const uvs = Shaders.vertexAttribute({
    variableName: Shaders.VertexAttribute.TEX_COORDS,
  });
  const color = Shaders.textureSampler(faceTrackingTex.signal, uvs);
  const textureSlot = Shaders.DefaultMaterialTextures.DIFFUSE;

  Diagnostics.log("create");
  let createdMeshes = [];
  for (let i = 0; i < amountOfMeshes; i++) {
    Diagnostics.log("createLoop");
    let newMesh = await Scene.create("FaceMesh", {
      name: "mesh" + i,
    });
    createdMeshes.push(newMesh);
    let materialIndex = Math.round(
      (i / amountOfMeshes) * (materials.length - 1)
    );
    let meshesParent = await Scene.root.findFirst("meshesNullObj");

    let material = materials[materialIndex].setTextureSlot(textureSlot, color);
    materials[materialIndex].opacity = (1 / amountOfMeshes) * i;
    newMesh.material = materials[materialIndex];
    let smoothBy = (maxSmooth / amountOfMeshes) * (i + 1);
    let delayBy = (maxDelay / amountOfMeshes) * (i + 1);
    animateMesh(newMesh, smoothBy, delayBy, transform);
    addToParent(newMesh, meshesParent);
  }
  return createdMeshes;
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
async function cycleTroughMeshes(loopIndex) {}
async function main() {
  let amountOfMeshes = 8;
  let meshesParent = await Scene.root.findFirst("meshesNullObj");
  let allMeshes = await createMeshes(amountOfMeshes);

  let loopIndex = 0;
  Time.setInterval(async () => {
    Diagnostics.log("firstInterval");
    const first = [];
    for (let i = 0; i < amountOfMeshes; i++) {
      Diagnostics.log("remove");
      const currentMesh = allMeshes[i];
      first.push(await removeFromParent(currentMesh, meshesParent));
    }
    Promise.all(first).then(async () => {
      Diagnostics.log("secondInterval");
      allMeshes = await createMeshes(amountOfMeshes);
    });
  }, 4000);
  // Time.setInterval(
  //   async () => {
  //     Diagnostics.log("intervalLoop");
  //     Diagnostics.watch("intervalLoop", loopIndex);
  //     const currentMesh = allMeshes[loopIndex];
  //     await removeFromParent(currentMesh, meshesParent)
  //       .then(await addToParent(currentMesh, meshesParent))
  //       .then(() => {
  //         loopIndex >= amountOfMeshes - 1 ? (loopIndex = 0) : loopIndex++;
  //       });
  //   },

  //   1000
  // );
  // allMeshes.forEach((mesh) => {
  //   // await meshesParent
  //   //   .removeFromParent(mesh)
  //   //   .then(() => addToParentAndAnimate(mesh));
  // });
}

main();
