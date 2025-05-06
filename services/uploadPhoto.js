const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { SPACES_KEY, SPACES_SECRET, SPACES_ENDPOINT, SPACES_BUCKET, SPACES_REGION } = process.env;

const s3 = new S3Client({
  region: SPACES_REGION,
  endpoint: SPACES_ENDPOINT,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
});

const uploadPhoto = async (buffer, filename, mimeType) => {
  const command = new PutObjectCommand({
    Bucket: SPACES_BUCKET,
    Key: filename,
    Body: buffer,
    ContentType: mimeType,
    ACL: 'public-read', // 👈 критично, иначе ChatGPT не увидит фото
  });

  await s3.send(command);
  return `https://${SPACES_BUCKET}.${SPACES_REGION}.digitaloceanspaces.com/${filename}`;
};

module.exports = uploadPhoto;
