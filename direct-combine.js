// PNG File Combiner
// This script combines PNG images into a single seamless image without borders
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const sharp = require('sharp');

// Path to your PNG files
const PNG_FILES_PATH = 'C:/Path/to/folder';

// Function to combine images side by side without borders
async function combineImages(inputPattern, outputFile, bgColor = '#000000') {
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
      const metadata = await sharp(file).metadata();
      return {
        path: file,
        width: metadata.width,
        height: metadata.height,
        name: path.basename(file)
      };
    })
  );

  // Sort images by name to ensure consistent layout
  imageMeta.sort((a, b) => a.name.localeCompare(b.name));
  
  console.log(`Processed metadata for ${imageMeta.length} images`);

  // Define a standard cell size based on the first image
  // This helps maintain uniformity
  const cellWidth = imageMeta[0].width;
  const cellHeight = imageMeta[0].height;
  
  // Use 8 columns for layout (based on your image)
  const columns = 8;
  const rows = Math.ceil(imageMeta.length / columns);
  
  console.log(`Creating layout with ${columns} columns and ${rows} rows`);
  
  // Calculate final dimensions
  const finalWidth = columns * cellWidth;
  const finalHeight = rows * cellHeight;
  
  console.log(`Final dimensions: ${finalWidth}x${finalHeight}`);
  
  // Calculate positions for layout
  const positions = [];
  let index = 0;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      if (index < imageMeta.length) {
        positions.push({
          file: imageMeta[index].path,
          left: col * cellWidth,
          top: row * cellHeight
        });
        index++;
      }
    }
  }

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
  } catch (err) {
    console.error('Error creating combined image:', err.message);
  }
}

// Main execution
async function main() {
  try {
    // Update pattern to match PNG files
    const pattern = `${PNG_FILES_PATH}/*.[pP][nN][gG]`;
    console.log('Using pattern:', pattern);
    
    await combineImages(
      pattern,
      'seamless-background.png',
      '#000000' // Pure black background
    );
    
    console.log('Processing complete!');
  } catch (err) {
    console.error('Error in main process:', err.message);
  }
}

// Run the main function
main();