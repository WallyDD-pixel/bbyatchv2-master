import { writeFileSync } from "fs";
import sharp from "sharp";

/** Logo jaune / emblème blanc (fichier fourni par le client) */
const source = "public/brand-favicon-source.png";

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
  .resize(32, 32, { fit: "cover" })
  .png()
  .toBuffer();

const square180 = await sharp(source)
  .resize(180, 180, { fit: "cover" })
  .png()
  .toBuffer();

const ico = pngBufferToIco(square32);

writeFileSync("src/app/favicon.ico", ico);
writeFileSync("public/favicon.ico", ico);
writeFileSync("src/app/icon.png", square32);
writeFileSync("src/app/apple-icon.png", square180);
writeFileSync("public/favicon-32.png", square32);
writeFileSync("public/favicon.png", square32);
writeFileSync("public/apple-icon.png", square180);

console.log("Favicon OK —", ico.length, "octets (source:", source, ")");
