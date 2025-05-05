// services/uploadPhoto.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');

const client = new S3Client({
  region: process.env.SPACES_REGION || 'sgp1',
  endpoint: process.env.SPACES_ENDPOINT,
  credentials: {
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  },
});


async function uploadBuffer(buffer, key) {
  const contentType = mime.lookup(key) || 'application/octet-stream';
  await client.send(new PutObjectCommand({
    Bucket: 'telegram-photos',
    Key: key,
    Body: buffer,
    ACL: 'public-read',
    ContentType: contentType,
  }));
  return `https://${process.env.SPACES_ENDPOINT}/telegram-photos/${key}`;
}

module.exports = uploadBuffer;
