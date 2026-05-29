import { writeFileSync } from "fs";
import sharp from "sharp";

const source = "public/cropped-LOGO-BB-yacht-ok_black-FEEL-THE-MEdierranean-247x82.png";

/** ICO Windows Vista+ : un PNG embarqué */
function pngBufferToIco(pngBuffer) {
  const offset = 6 + 16;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = 32;
  entry[1] = 32;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(offset, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

const square32 = await sharp(source)
  .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 1 } })
  .png()
  .toBuffer();

const square180 = await sharp(source)
  .resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 1 } })
  .png()
  .toBuffer();

const ico = pngBufferToIco(square32);

writeFileSync("src/app/favicon.ico", ico);
writeFileSync("public/favicon.ico", ico);
writeFileSync("src/app/icon.png", square32);
writeFileSync("src/app/apple-icon.png", square180);
writeFileSync("public/favicon-32.png", square32);

console.log("Favicon OK —", ico.length, "octets");
