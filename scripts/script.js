const Scene = require("Scene");
const FaceTracking = require("FaceTracking");
const Reactive = require("Reactive");
const Materials = require("Materials");
const Textures = require("Textures");
const Shaders = require("Shaders");
const Time = require("Time");
const Diagnostics = require("Diagnostics");
const allMeshes = [];
async function createAndAnimateMeshes() {
  let amountOfMeshes = 5;
  let maxSmooth = 350;
  let maxDelay = 0.5;
  let meshesParent = await Scene.root.findFirst("meshesNullObj");
  const faceTrackingTex = await Textures.findFirst("faceTracker0 Texture");
  const cameraTexture = await Textures.findFirst("cameraTexture0");
  let materials = await Materials.findUsingPattern("mask-material*");

  materials.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  let transform = FaceTracking.face(0).cameraTransform;
  for (let index = 0; index < amountOfMeshes; index++) {
    let newMesh = await Scene.create("FaceMesh", {
      name: "mesh" + index,
    });

    await meshesParent.addChild(newMesh);
    let materialIndex = Math.round(
      (index / amountOfMeshes) * (materials.length - 1)
    );
    const uvs = Shaders.vertexAttribute({
      variableName: Shaders.VertexAttribute.TEX_COORDS,
    });
    allMeshes.push(newMesh);
    const color = Shaders.textureSampler(faceTrackingTex.signal, uvs);
    const multiplikator = Reactive.mul(index, 1 / (amountOfMeshes * 7));
    const finalColor = Reactive.add(color, multiplikator);
    const alphaColor = Reactive.mul(color, 1 / amountOfMeshes);
    const textureSlot = Shaders.DefaultMaterialTextures.DIFFUSE;
    let material = materials[materialIndex].setTextureSlot(textureSlot, color);
    materials[materialIndex].opacity = (1 / amountOfMeshes) * index;
    newMesh.material = materials[materialIndex];
    let smoothBy = (maxSmooth / amountOfMeshes) * (index + 1);
    let delayBy = (maxDelay / amountOfMeshes) * (index + 1);

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
}
createAndAnimateMeshes();

// async function removeMeshesFromParent() {
//   let meshesParent = await Scene.root.findFirst("meshesNullObj");
//   Diagnostics.log("start");

//   // const meshes = allMeshes.map(async (mesh) => {
//   //   return await meshesParent.removeChild(mesh);
//   // });
//   // const meshes = await meshesParent.removeChild(allMeshes[0]).then(() => {
//   //   Diagnostics.log("end");
//   //   allMeshes.shift();
//   //   Time.setTimeout(createAndAnimateMeshes(true, 1), 1000);
//   // });
//   // Diagnostics.log("between");
//   // Promise.all(meshes)
//   //   .then(() => {
//   //     Diagnostics.log("end");
//   //     allMeshes.shift();
//   //     Time.setTimeout(createAndAnimateMeshes(true, 1), 1000);
//   //   })
//   //   .catch((error) => Diagnostics.log(error));
// }
// Time.setInterval(removeMeshesFromParent, 1000);

// texturesampling = process of reading textures through the GPU
