const fs = require('fs-extra');
const archiver = require('archiver');
const unzipper = require('unzipper');
const fs = require('fs-extra');

function createSIP(resourceId, resourceFiles) {
    const outputPath = `./sips/${resourceId}.zip`;
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
  
    return new Promise((resolve, reject) => {
      output.on('close', () => {
        resolve(outputPath);
      });
  
      archive.on('error', (err) => {
        reject(err);
      });
  
      archive.pipe(output);
  
      // Add metadata files
      archive.append('BagIt-Version: 0.97\nTag-File-Character-Encoding: UTF-8\n', { name: 'bagit.txt' });
      archive.append(`Bag-Size: TBD\nBagging-Date: ${new Date().toISOString()}\n`, { name: 'bag-info.txt' });
  
      // Add manifest file
      let manifestContent = '';
      resourceFiles.forEach(file => {
        const filePath = `data/${file.name}`;
        const fileBuffer = fs.readFileSync(file.path);
        const fileHash = require('crypto').createHash('md5').update(fileBuffer).digest('hex');
        manifestContent += `${fileHash}  ${filePath}\n`;
        archive.file(file.path, { name: filePath });
      });
      archive.append(manifestContent, { name: 'manifest-md5.txt' });
  
      // Finalize the archive
      archive.finalize();
    });
  }
module.exports = createSIP;


async function importSIP(sipPath) {
    const directory = await unzipper.Open.file(sipPath);
    const files = directory.files;
  
    files.forEach(file => {
      const filePath = `./aips/${file.path}`;
      file.stream().pipe(fs.createWriteStream(filePath));
    });
  
    // Process metadata and store it in the database if needed
    // Convert SIP to AIP logic can be added here
  }
  
  module.exports = importSIP;
