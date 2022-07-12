const Scene = require("Scene");
const FaceTracking = require("FaceTracking");
const Reactive = require("Reactive");
const Materials = require("Materials");
const Textures = require("Textures");
const Shaders = require("Shaders");
const Time = require("Time");
const Diagnostics = require("Diagnostics");
const TouchGestures = require("TouchGestures");

async function main() {
  const amountOfMeshes = 80;
  const maxSmooth = 350;
  const maxDelay = 0.8;
  const [meshesParent, faceTrackingTex, materials, canvas] = await Promise.all([
    Scene.root.findFirst("meshesNullObj"),
    Textures.findFirst("faceTracker0 Texture"),
    Materials.findUsingPattern("mask-material*"),
    Scene.root.findFirst("canvas0"),
  ]);
  const sortedMaterials = materials.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });
  let allMeshes = null;

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
  function createSmooth(index) {
    return (maxSmooth / amountOfMeshes) * (index + 1);
  }
  function createDelay(index, base) {
    return Math.pow((0 - (1 / amountOfMeshes) * (index + 1)) * base, 2);
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
    const smoothBy = createSmooth(index);
    // const delayBy = (maxDelay / amountOfMeshes) * (index + 1);
    // a * b ^x /a<0
    const delayBy = createDelay(index, 20);

    // Diagnostics.log(delayBy);
    const color = await createColor(faceTrackingTex, materialIndex);
    const opacity = (1 / amountOfMeshes) * index;
    const material = await setMaterial(
      materials,
      color,
      opacity,
      materialIndex
    );
    const transform = FaceTracking.face(0).cameraTransform;
    // Diagnostics.log("create");

    let newMesh = await Scene.create("FaceMesh", {
      name: "mesh" + index,
    });
    newMesh.material = material;
    animateMesh(newMesh, smoothBy, delayBy, transform);
    addToParent(newMesh, meshesParent);
    return newMesh;
  }

  async function removeFromParent(mesh, meshesParent) {
    return await Scene.destroy(mesh);
  }

  async function addToParent(mesh, meshesParent) {
    return await meshesParent.addChild(mesh);
    // Diagnostics.log("added");
  }
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
  // async function createAndDestroyMeshes() {
  //   // Diagnostics.log("firstInterval");
  //   const first = [];
  //   for (let i = 0; i < amountOfMeshes; i++) {
  //     // Diagnostics.log("remove");
  //     const currentMesh = allMeshes[i];
  //     first.push(await removeFromParent(currentMesh, meshesParent));
  //   }
  //   Promise.all(first)
  //     .then(async () => {
  //       // Diagnostics.log("secondInterval");
  //       const meshes = [];
  //       for (let i = 0; i < amountOfMeshes; i++) {
  //         meshes.push(
  //           await createMeshes(
  //             i,
  //             amountOfMeshes,
  //             sortedMaterials,
  //             meshesParent,
  //             faceTrackingTex,
  //             maxSmooth,
  //             maxDelay
  //           )
  //         );
  //       }
  //       allMeshes = meshes;
  //     })
  //     .then(() => (touchActive = true));
  // }

  async function gameLoop() {
    let tapActiveOnMesh = false;
    Diagnostics.log("loop");
    let delayBase = 1;
    const transform = FaceTracking.face(0).cameraTransform;

    const topMesh = allMeshes[amountOfMeshes.length - 1];
    // const topMesh = await Scene.root.meshesNullObj.findFirst("mesh35");
    let delayTracker = 1;
    TouchGestures.onPan().subscribe((gesture) => {
      Diagnostics.log("rotStart");
      const delayMax = 50;
      const relativeStep = delayMax / canvas.width.pinLastValue();
      const Distance = gesture.translation.x.div(canvas.width);

      gesture.state.monitor().subscribe((state) => {
        if (state.newValue == "ENDED") {
          delayTracker = (() => {
            const newDelay =
              delayTracker +
              (delayMax / canvas.width.pinLastValue()) *
                Distance.pinLastValue() *
                100;
            const sanitizedDelay = (() => {
              if (newDelay > delayMax) return delayMax;
              else if (newDelay < 1) return 1;
              else return newDelay;
            })();
            return sanitizedDelay;
          })();
          for (let i = 0; i < amountOfMeshes; i++) {
            const delayBy = createDelay(i, delayTracker);
            const smoothBy = createSmooth(i);
            const currentMesh = allMeshes[i];
            animateMesh(currentMesh, smoothBy, delayBy, transform);
          }
        }
      });
    });
    // TouchGestures.onLongPress().subscribe((gestures) => {
    //   Diagnostics.log("longPress");
    // });
    // TouchGestures.onLongPress(topMesh).subscribe((gesture) => {
    //   Diagnostics.log("long");
    //   Diagnostics.log("beforeMonitor");
    //   Diagnostics.log(tapActiveOnMesh);

    //   const startTime = Time.ms.pinLastValue();

    //   if (!tapActiveOnMesh) {
    //     Diagnostics.log("singleTap");
    //     gesture.state.monitor().subscribe((state) => {
    //       if (state.newValue == "ENDED") {
    //         const endTime = Time.ms.pinLastValue();
    //         delayBase += (endTime - startTime) * 0.01;
    //         for (let i = 0; i < amountOfMeshes; i++) {
    //           const delayBy = createDelay(i, delayBase);
    //           const smoothBy = createSmooth(i);
    //           const currentMesh = allMeshes[i];
    //           animateMesh(currentMesh, smoothBy, delayBy, transform);
    //         }
    //       }
    //     });
    //   }
    //   if (tapActiveOnMesh) {
    //     Diagnostics.log("doubleTap");
    //     gesture.state.monitor().subscribe((state) => {
    //       if (state.newValue == "ENDED") {
    //         Diagnostics.log("end");

    //         const endTime = Time.ms.pinLastValue();
    //         const timePassed = (endTime - startTime) * 0.01;
    //         delayBase = delayBase - timePassed < 1 ? 1 : delayBase - timePassed;
    //         for (let i = 0; i < amountOfMeshes; i++) {
    //           const delayBy = createDelay(i, delayBase);
    //           const smoothBy = createSmooth(i);
    //           const currentMesh = allMeshes[i];
    //           animateMesh(currentMesh, smoothBy, delayBy, transform);
    //         }
    //       }
    //     });
    //   }
    // });
    // TouchGestures.onTap(testFace).subscribe((gesture) => {
    //   Diagnostics.log("insideTap");
    //   function activate() {
    //     tapActiveOnMesh = !tapActiveOnMesh;
    //   }
    //   activate();
    //   Diagnostics.log(tapActiveOnMesh);
    //   Time.setTimeout(activate, 1000);
    // });
    // TouchGestures.onTap().subscribe((gesture) => {
    //   // Diagnostics.log(gesture);
    //   function activate() {
    //     tapActiveOnMesh = !tapActiveOnMesh;
    //   }
    //   // activate();
    //   Diagnostics.log("outsideTap");
    //   // Time.setTimeout(activate, 1000);
    // });
  }
}

main();
