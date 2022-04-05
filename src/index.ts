import './index.css';

const findMediaDevices = async (label: string) => {
  const devices = await navigator.mediaDevices.enumerateDevices() as MediaDeviceInfo[];
  const findDevices = devices.filter((device) => device.label.toLowerCase().indexOf(label.toLowerCase()) !== -1);
  if (!findDevices) return null;
  else return findDevices.reduce((acc: any, val: MediaDeviceInfo) => {
    const group = acc.find(({groupId}: {groupId: string}) => groupId === val.groupId) || (acc.push({groupId: val.groupId, devices: []}), acc[acc.length - 1]);
    group.devices.push(val);
    return acc;
  }, []) as {groupId: string; devices: MediaDeviceInfo[]}[];
}

const webcamLoaded = async (label: string) => {
  const mediaDevices = await findMediaDevices(label) as {groupId: string; devices: MediaDeviceInfo[]}[];
  if (!mediaDevices.length) console.error(`Not Found Media: ${label}`);
  if (mediaDevices.length > 1) console.error('To Many Media Group!');
  
  const device = mediaDevices[0]
  const videoDevice = device.devices.find(({kind}) => kind === 'videoinput');
  if (videoDevice) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: {min: 640, ideal: 1920},
        height: {min: 400, ideal: 1080},
        frameRate: {min: 30, max: 60},
        deviceId: {exact: videoDevice.deviceId}
      }
    });
    const video = document.createElement('video');
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    return video;
  } else {
    console.error('No video device!');
    const img = await new Promise<HTMLImageElement>(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.src = 'https://dummyimage.com/600x100/666666/ffffff&text=Webcam+not+connected';
    });
    return img;
  }
}

const raf = new class RAF extends Set<Function> {
  playing: boolean = true;
  constructor() {
    super();

    const self = this;
    requestAnimationFrame(function draw(t) {
      self.playing && self.forEach(f => f());
      requestAnimationFrame(draw);
    });
  }
  stop() {
    this.playing = false;
  }
  play() {
    this.playing = true;
  }
}

const drawContain = (ctx: CanvasRenderingContext2D, source: HTMLImageElement|HTMLCanvasElement|HTMLVideoElement) => {
  const canvas = ctx.canvas ;
  const cw = canvas.width;
  const ch = canvas.height;
  const iw = source.width || (source as any).videoWidth;
  const ih = source.height || (source as any).videoHeight;
  const hRatio = cw / iw;
  const vRatio =  ch / ih;
  const ratio = Math.min(hRatio, vRatio);
  const sx = (cw - iw*ratio) / 2;
  const sy = (ch - ih*ratio) / 2;  
  ctx.drawImage(source, 0, 0, iw, ih, sx, sy, iw*ratio, ih*ratio);  
}

const drawCover = (
  ctx: CanvasRenderingContext2D, 
  source: HTMLVideoElement|HTMLImageElement|HTMLCanvasElement,
  x: number = 0, 
  y: number = 0, 
  w: number = ctx.canvas.width, 
  h: number = ctx.canvas.height,
  offsetX = 0.5, 
  offsetY = 0.5
) => {
  offsetX = typeof offsetX === 'number' ? offsetX : 0.5
  offsetY = typeof offsetY === 'number' ? offsetY : 0.5

  if (offsetX < 0) offsetX = 0
  if (offsetY < 0) offsetY = 0
  if (offsetX > 1) offsetX = 1
  if (offsetY > 1) offsetY = 1

  let iw = source.width || (source as HTMLVideoElement).videoWidth;
  let ih = source.height || (source as HTMLVideoElement).videoHeight;
  let r = Math.min(w / iw, h / ih)
  let nw = iw * r
  let nh = ih * r
  let cx = 1
  let cy = 1
  let cw = 1
  let ch = 1
  let ar = 1

  if (nw < w) ar = w / nw                             
  if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh
  nw *= ar
  nh *= ar

  cw = iw / (nw / w)
  ch = ih / (nh / h)

  cx = (iw - cw) * offsetX
  cy = (ih - ch) * offsetY

  if (cx < 0) cx = 0
  if (cy < 0) cy = 0
  if (cw > iw) cw = iw
  if (ch > ih) ch = ih

  ctx.drawImage(source, cx, cy, cw, ch,  x, y, w, h)
};

const flipX = (ctx: CanvasRenderingContext2D) => {
  ctx.save();
  ctx.translate(ctx.canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.restore();
};

const colorsize = (ctx: CanvasRenderingContext2D, {r, g, b}: {r: number; g: number; b: number;}) => {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const percent = data[i] / 255;
    data[i] = r + (255 - r) * percent;
    data[i + 1] = g + (255 - g) * percent;
    data[i + 2] = b + (255 - b) * percent;
    data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}

const grayscale = document.getElementsByName('grayscale')[0] as HTMLInputElement;
const blur = document.getElementsByName('blur')[0] as HTMLInputElement;
const brightness = document.getElementsByName('brightness')[0] as HTMLInputElement;
const contrast = document.getElementsByName('contrast')[0] as HTMLInputElement;

const grayscaleText = document.getElementById('grayscale') as HTMLSpanElement;
const blurText = document.getElementById('blur') as HTMLSpanElement;
const brightnessText = document.getElementById('brightness') as HTMLSpanElement;
const contrastText = document.getElementById('contrast') as HTMLSpanElement;

const MEDIA_LABEL = 'Logitech BRIO';
const isFlipX = true;
const isColorsize = false;

// 투미 필터값
// const hueValue = 20;
// const brightnessValue = 228.814;
// const blurValue = 0.89;
// const contrastValue = 3000;

// 까르띠에
// const grayscaleValue = 100;
// const hueValue = 20;
// const blurValue = 0.7;
// const brightnessValue = 1.2;
// const contrastValue = 1.2;

const main = async () => { try {
  const urlQuery = location.search;
  const mediaLabel = urlQuery.split('label=')[1] ?? 'Logitech BRIO';

  const filter = {
    grayscale: 100,
    blur: 0.7,
    brightness: 1.2,
    contrast: 1.15,
  }
  
  const setLocalStorage = (value: any) => localStorage.setItem('filters', JSON.stringify(value));
  const storage = JSON.parse(localStorage.getItem('filters') as string) ?? filter;
  setLocalStorage(storage);

  const webcam = await webcamLoaded(mediaLabel) as HTMLVideoElement | HTMLImageElement;
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  canvas.width = 1920;
  canvas.height = 1080;

  raf.clear();
  raf.add(() => {
    ctx.filter = `grayscale(${grayscaleValue}%) blur(${ blurValue }px) brightness(${ brightnessValue }) contrast(${ contrastValue })`;
    // ctx.filter = `grayscale(100%) hue-rotate(${hueValue}deg) blur(${ blurValue }px) brightness(${ brightnessValue }%) contrast(${ contrastValue }%)`
    drawCover(ctx, webcam);
    isFlipX && flipX(ctx);
    isColorsize && colorsize(ctx, {r: 245, g: 27, b: 58});
  });

  let grayscaleValue = storage.grayscale;
  let blurValue = storage.blur;
  let brightnessValue = storage.brightness;
  let contrastValue = storage.contrast;

  grayscale.value = grayscaleValue;
  blur.value = blurValue;
  brightness.value = brightnessValue;
  contrast.value = contrastValue;

  grayscaleText.innerText = grayscaleValue;
  blurText.innerText = blurValue;
  brightnessText.innerText = brightnessValue;
  contrastText.innerText = contrastValue;

  grayscale.oninput = (ev: any) => {
    const target = ev.target as HTMLInputElement
    grayscaleValue = target.value;
    grayscaleText.innerText = grayscaleValue;

    storage.grayscale = Number(grayscaleValue);
    setLocalStorage(storage);
  }
  blur.oninput = (ev: any) => {
    const target = ev.target as HTMLInputElement
    blurValue = target.value;
    blurText.innerText = blurValue;

    storage.blur = Number(blurValue);
    setLocalStorage(storage);
  }
  brightness.oninput = (ev: any) => {
    const target = ev.target as HTMLInputElement
    brightnessValue = target.value;
    brightnessText.innerText = brightnessValue;

    storage.brightness = Number(brightnessValue);
    setLocalStorage(storage);
  }
  contrast.oninput = (ev: any) => {
    const target = ev.target as HTMLInputElement
    contrastValue = target.value;
    contrastText.innerText = contrastValue;

    storage.contrast = Number(contrastValue);
    setLocalStorage(storage);
  }
} catch (error: any) {
  throw new Error(error)
}}

main();