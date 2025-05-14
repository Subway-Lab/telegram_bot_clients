// uploadPhoto.js - загрузка фото в DigitalOcean Spaces с метаданными
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

/**
 * Загружает буфер в DigitalOcean Spaces и возвращает URL.
 * Добавляет метаданные type="firstRequest" для идентификации.
 *
 * @param {Buffer} buffer - содержимое файла
 * @param {string} filename - имя файла в бакете
 * @param {string} mimeType - MIME-тип файла
 * @returns {Promise<string>} публичный URL загруженного файла
 */
const uploadPhoto = async (buffer, filename, mimeType) => {
  const command = new PutObjectCommand({
    Bucket: SPACES_BUCKET,
    Key: filename,
    Body: buffer,
    ContentType: mimeType,
    ACL: 'public-read', // необходимо для публичного доступа
    Metadata: {
      type: 'firstRequest', // метаданное поле для идентификации
    },
  });

  await s3.send(command);
  return `https://${SPACES_BUCKET}.${SPACES_REGION}.digitaloceanspaces.com/${filename}`;
};

module.exports = uploadPhoto;

