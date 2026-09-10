import type { Area } from "react-easy-crop";

// Every cropped logo is normalized to this square size regardless of the
// source photo's resolution or how far a partner zoomed in — keeps output
// file size predictable and every listing's logo a consistent quality,
// rather than inheriting whatever a phone camera or a zoomed-in crop
// happens to produce.
const OUTPUT_SIZE = 512;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Loading a data: URL never touches the network, but a same-origin
    // <img> without this can still taint the canvas it's drawn to in some
    // browsers — harmless to set unconditionally.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the selected image."));
    image.src = url;
  });
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// The bounding box a `width`x`height` rectangle needs once rotated by
// `rotation` degrees — rotating first onto a canvas this size (see
// cropImage below) means the crop rectangle react-easy-crop reports
// (already in that rotated image's own coordinate space) lines up
// correctly, however the image is turned.
function rotatedBoundingBox(width: number, height: number, rotation: number): { width: number; height: number } {
  const radians = degreesToRadians(rotation);
  return {
    width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
    height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
  };
}

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't crop images (canvas unavailable).");
  return ctx;
}

// Renders the square region `cropPixels` (in the source image's own pixel
// coordinates, as react-easy-crop's onCropComplete reports them) out of
// `imageUrl`, rotated first by `rotationDegrees`, onto a fixed
// OUTPUT_SIZE-square canvas — the standard two-pass recipe for cropping a
// rotated image: rotate the whole image onto a big-enough canvas first,
// then cut the already-rotated crop rectangle out of that.
export async function cropImage(imageUrl: string, cropPixels: Area, rotationDegrees: number): Promise<string> {
  const image = await loadImage(imageUrl);

  const rotatedCanvas = document.createElement("canvas");
  const { width: rotatedWidth, height: rotatedHeight } = rotatedBoundingBox(image.width, image.height, rotationDegrees);
  rotatedCanvas.width = rotatedWidth;
  rotatedCanvas.height = rotatedHeight;
  const rotatedCtx = getContext(rotatedCanvas);
  rotatedCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
  rotatedCtx.rotate(degreesToRadians(rotationDegrees));
  rotatedCtx.translate(-image.width / 2, -image.height / 2);
  rotatedCtx.drawImage(image, 0, 0);

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = OUTPUT_SIZE;
  outputCanvas.height = OUTPUT_SIZE;
  const outputCtx = getContext(outputCanvas);
  outputCtx.drawImage(
    rotatedCanvas,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return outputCanvas.toDataURL("image/png");
}
