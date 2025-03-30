// TARGA File Handler with Format Conversion
// This script first converts TARGA files to PNG, then combines them
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const sharp = require('sharp');

// Path to your TARGA files
const TARGA_FILES_PATH = 'D:/SteamLibrary/steamapps/common/Half-Life/fdabm/resource/Background';
// Temporary directory for converted files
const TEMP_DIR = './temp_images';

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  console.log(`Created temporary directory: ${TEMP_DIR}`);
}

// Function to convert a single TARGA file to PNG
async function convertTgaToPng(tgaFile, outputFile) {
  try {
    // Sharp sometimes has issues with TGA files, we'll add explicit options
    await sharp(tgaFile, { failOnError: false })
      .toFormat('png')
      .toFile(outputFile);
    return true;
  } catch (err) {
    console.error(`Error converting ${tgaFile} to PNG:`, err.message);
    return false;
  }
}

// Function to combine PNG images
async function combineImages(inputPattern, outputFile, layout = 'grid', padding = 0, bgColor = '#000000') {
  console.log(`Starting to combine images using pattern: ${inputPattern}`);
  
  // Get all matching files
  const files = glob.sync(inputPattern);
  
  if (files.length === 0) {
    console.error(`No files found matching the pattern: ${inputPattern}`);
    return;
  }

  console.log(`Found ${files.length} files to combine`);

  // Get metadata for all images
  const imageMeta = await Promise.all(
    files.map(async (file) => {
      try {
        const metadata = await sharp(file).metadata();
        return {
          path: file,
          width: metadata.width,
          height: metadata.height,
          name: path.basename(file)
        };
      } catch (err) {
        console.error(`Error getting metadata for ${file}:`, err.message);
        return null;
      }
    })
  );

  // Filter out any null entries from failed metadata
  const validImageMeta = imageMeta.filter(img => img !== null);
  console.log(`Got valid metadata for ${validImageMeta.length} images`);

  let finalWidth = 0;
  let finalHeight = 0;
  let positions = [];

  if (layout === 'grid') {
    // Calculate approximate dimensions for a balanced grid
    const numImages = validImageMeta.length;
    const columns = Math.ceil(Math.sqrt(numImages));
    const rows = Math.ceil(numImages / columns);
    
    console.log(`Creating grid layout with ${columns} columns and up to ${rows} rows`);
    
    // Calculate positions for a grid layout
    let currentX = 0;
    let currentY = 0;
    let maxHeightInRow = 0;
    let colIndex = 0;
    
    validImageMeta.forEach(img => {
      positions.push({
        file: img.path,
        left: currentX,
        top: currentY
      });
      
      maxHeightInRow = Math.max(maxHeightInRow, img.height);
      colIndex++;
      
      if (colIndex >= columns) {
        // Move to next row
        currentY += maxHeightInRow + padding;
        currentX = 0;
        colIndex = 0;
        maxHeightInRow = 0;
      } else {
        // Move to next column
        currentX += img.width + padding;
      }
      
      finalWidth = Math.max(finalWidth, currentX);
      finalHeight = currentY + maxHeightInRow;
    });
  }

  console.log(`Final dimensions: ${finalWidth}x${finalHeight}`);

  // Create compositing instructions
  const composite = positions.map(pos => ({
    input: pos.file,
    top: pos.top,
    left: pos.left
  }));

  // Create the final image
  try {
    await sharp({
      create: {
        width: finalWidth,
        height: finalHeight,
        channels: 4,
        background: bgColor
      }
    })
    .composite(composite)
    .toFile(outputFile);
    
    console.log(`Combined image saved to ${outputFile}`);
    return true;
  } catch (err) {
    console.error('Error creating combined image:', err.message);
    return false;
  }
}

// Main execution
async function main() {
  try {
    // Get all TARGA files
    const tgaPattern = `${TARGA_FILES_PATH}/*.[tT][gG][aA]`;
    const tgaFiles = glob.sync(tgaPattern);
    
    if (tgaFiles.length === 0) {
      console.error('No TARGA files found');
      return;
    }
    
    console.log(`Found ${tgaFiles.length} TARGA files to process`);
    
    // First convert all TARGA to PNG in temp directory
    console.log('Converting TARGA files to PNG...');
    
    const conversionPromises = tgaFiles.map(tgaFile => {
      const baseName = path.basename(tgaFile, path.extname(tgaFile));
      const pngFile = path.join(TEMP_DIR, `${baseName}.png`);
      return convertTgaToPng(tgaFile, pngFile);
    });
    
    const conversionResults = await Promise.all(conversionPromises);
    const successCount = conversionResults.filter(success => success).length;
    
    console.log(`Successfully converted ${successCount} of ${tgaFiles.length} files to PNG`);
    
    if (successCount === 0) {
      console.error('No files were successfully converted. Cannot continue.');
      return;
    }
    
    // Now combine the converted PNG files
    const pngPattern = `${TEMP_DIR}/*.png`;
    const success = await combineImages(
      pngPattern,
      'black-mesa-background.png',
      'grid',
      0,
      '#000000'
    );
    
    if (success) {
      console.log('Process completed successfully!');
    } else {
      console.error('Failed to create combined image.');
    }
    
  } catch (err) {
    console.error('Error in main process:', err.message);
  }
}

// Run the main function
main();