import imagemin from 'imagemin';
import imageminWebp from 'imagemin-webp';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function convertImages() {
  try {
    // Convert images in public/img
    await imagemin(['./public/img/**/*.png', './public/**/*.png'], {
      destination: './public/img',
      plugins: [
        imageminWebp({
          quality: 75,
          alphaQuality: 100,
        }),
      ],
    });

    console.log('✓ WebP conversion complete');
  } catch (error) {
    console.error('Error converting images:', error);
  }
}

convertImages();
