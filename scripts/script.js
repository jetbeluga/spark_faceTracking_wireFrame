const Scene = require("Scene");
const FaceTracking = require("FaceTracking");
const Reactive = require("Reactive");
const Materials = require("Materials");
const Textures = require("Textures");
const Shaders = require("Shaders");
const Time = require("Time");
const Diagnostics = require("Diagnostics");
const Animation = require("Animation");
const TouchGestures = require("TouchGestures");

function animateMesh(newMesh, smoothBy, delayBy, transform, index) {
  function createSignal(transformArea, delayBy, index) {
    const signalId = "signal".concat(
      Time.ms
        .pinLastValue()
        .toString()
        .concat(transformArea + index.toString())
    );

    let newKey = Reactive.scalarSignalSource(signalId);
    newKey.set(
      transform[transformArea].delayBy({
        milliseconds: delayBy,
      })
    );
    return newKey;
  }

  const xDelaySource = createSignal("x", delayBy, index);
  const yDelaySource = createSignal("y", delayBy, index);
  const zDelaySource = createSignal("z", delayBy, index);
  const rxDelaySource = createSignal("rotationX", delayBy, index);
  const ryDelaySource = createSignal("rotationY", delayBy, index);
  const rzDelaySource = createSignal("rotationZ", delayBy, index);

  let xValue = Reactive.expSmooth(xDelaySource.signal, smoothBy);
  let yValue = Reactive.expSmooth(yDelaySource.signal, smoothBy);
  let zValue = Reactive.expSmooth(zDelaySource.signal, smoothBy);

  let xRotation = Reactive.expSmooth(rxDelaySource.signal, smoothBy);
  let yRotation = Reactive.expSmooth(ryDelaySource.signal, smoothBy);
  let zRotation = Reactive.expSmooth(rzDelaySource.signal, smoothBy);

  newMesh.transform.x = xValue;
  newMesh.transform.y = yValue;
  newMesh.transform.z = zValue;

  newMesh.transform.rotationX = xRotation;
  newMesh.transform.rotationY = yRotation;
  newMesh.transform.rotationZ = zRotation;
  const animMeshObj = {
    mesh: newMesh,
    delaySources: {
      xDelaySource,
      yDelaySource,
      zDelaySource,
      rxDelaySource,
      ryDelaySource,
      rzDelaySource,
    },
  };
  return animMeshObj;
}

async function setMaterial(materials, color, opacity, materialIndex) {
  const textureSlot = Shaders.DefaultMaterialTextures.DIFFUSE;
  const material = materials[materialIndex];

  material.setTextureSlot(textureSlot, color);
  material.opacity = opacity;

  // Diagnostics.log("afterSlot");

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
  delayBase,
  transform
) {
  const maxMeshes = 60;
  const materialIndex = Math.round(
    (index / amountOfMeshes) * (materials.length - 1)
  );
  const smoothBy = (maxSmooth / maxMeshes) * (index + 1);
  // const delayBy = (maxDelay / amountOfMeshes) * (index + 1);
  // a * b ^x /a<0
  const delayBy = Math.pow(
    (0 - (1 / amountOfMeshes) * (index + 1)) * delayBase,
    2
  );
  // Diagnostics.log(delayBy);
  const color = await createColor(faceTrackingTex, materialIndex);
  const opacity = (1 / amountOfMeshes) * index;
  const material = await setMaterial(materials, color, opacity, materialIndex);
  // let transform = FaceTracking.face(0).cameraTransform;
  // Diagnostics.log("create");
  let newMesh = await Scene.create("FaceMesh", {
    name: "mesh" + index,
  });

  newMesh.material = material;
  const animMeshObj = animateMesh(newMesh, smoothBy, delayBy, transform, index);
  addToParent(newMesh, meshesParent);
  return animMeshObj;
}

async function removeFromParent(mesh, meshesParent) {
  return await Scene.destroy(mesh);
}

async function addToParent(mesh, meshesParent) {
  return await meshesParent.addChild(mesh);
  // Diagnostics.log("added");
}

async function main() {
  const amountOfMeshes = 20;
  const maxSmooth = 350;
  const maxDelay = 0.8;
  let delayBase = 1;
  const transform = FaceTracking.face(0).cameraTransform;
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
          delayBase,
          transform
        )
      );
    }
    allMeshes = meshes;
  }
  await initialiseMeshes().then(() => gameLoop());

  // await initialisation
  let touchActive = true;
  async function createAndDestroyMeshes() {
    // Diagnostics.log("firstInterval");
    const first = [];
    for (let i = 0; i < amountOfMeshes; i++) {
      // Diagnostics.log("remove");
      const currentMesh = allMeshes[i];
      first.push(await removeFromParent(currentMesh, meshesParent));
    }
    Promise.all(first)
      .then(async () => {
        // Diagnostics.log("secondInterval");
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
              maxDelay,
              transform
            )
          );
        }
        allMeshes = meshes;
      })
      .then(() => (touchActive = true));
  }
  function delayF(amountOfMeshes, allMeshes) {
    const transform = FaceTracking.face(0).cameraTransform;
    let delayValue = 1;
    TouchGestures.onLongPress().subscribe((gesture) => {
      Diagnostics.log("tap");
      const time1 = Time.ms.pinLastValue();
      gesture.state.monitor().subscribe((state) => {
        Diagnostics.log("tap");
        if (state.newValue == "ENDED") {
          const time2 = Time.ms.pinLastValue();

          Diagnostics.log("Long press gesture has ended");

          const timePassed = time2 - time1;
          delayValue += timePassed;
          // Diagnostics.log(delayValue);
          const transitionAreas = [
            "x",
            "y",
            "z",
            "rotationX",
            "rotationY",
            "rotationZ",
          ];
          for (let i = 0; i < amountOfMeshes; i++) {
            const delayBase = Math.pow(
              0 - (1 / amountOfMeshes) * (i + 1) * delayValue * 0.01,
              2
            );
            Diagnostics.log(delayBase);
            Object.values(allMeshes[i].delaySources).forEach((key, index) => {
              // Diagnostics.log(key);
              const tArea = transitionAreas[index];
              key.set(
                transform[tArea].delayBy({
                  milliseconds: delayBase,
                })
              );
            });
          }
        }
      });
    });
  }

  async function gameLoop() {
    delayF(amountOfMeshes, allMeshes);
  }
}

main();
