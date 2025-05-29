const palette = {
    0: '#8B8B7A',  // Non-Forest

    1: '#2F4F4F',  // Non-Forest
    11: '#2F4F4F', // Pinus densiflora (소나무)

    2: '#3D9970',
    12: '#3D9970', // Pinus koraiensis (잣나무)

    3: '#FF8C00',
    13: '#FF8C00', // Larix kaempferi (낙엽송)

    4: '#9B1C1C',
    32: '#9B1C1C', // Quercus mongolica (신갈나무)

    5: '#C2B280',
    33: '#C2B280', // Quercus variabilis (굴참나무)
    6: '#ffffff',
    30: '#ffffff', // 기타 침엽수류
    40: '#000000', // 기타 활엽수류
    77: '#ffffff', // 침활혼효림
}

function hexToRgba(idx) {


    if (palette[idx] == undefined){
        const result = { r: 0, g: 0, b: 0, a: 0 };
        return result;
    }

    const hex = palette[idx].replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const result = { r, g, b, a: 255 };
    return result;
}
let cachedRasters = null;
const color_sample = {
    'DBH': { r: 255, g: 255, b: 255, a: 255 },
    'height': { r: 0, g: 0, b: 0, a: 255 },
    'carbon': { r: 125, g: 125, b: 125, a: 255 },
    // 'species':{ r: 50*intensity/255, g: 125*intensity/255, b: intensity, a: 255 }
}

// worker.js
self.onmessage = async function(e) {
    const { rasters,tifType, width, height, startY, endY  } = e.data;

    const chunkHeight = endY - startY;
    const imageData = new Uint8ClampedArray(width * chunkHeight * 4);
    console.log('rasters[0][i]', rasters[0][0]);
    
    // 할당된 영역만 처리
    for (let y = startY; y < endY; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const chunkI = (y - startY) * width + x;
            let rgba = { r: 0, g: 0, b: 0, a: 0 };
            
            if (tifType === 'species'){
                rgba = hexToRgba(rasters[0][i]);
            } else if (tifType === 'DBH'){
                let intensity = (rasters[0][i] / 50);
                //intensity = intensity > 255 ? 255 : intensity;
                rgba = { r: 255*intensity, g: 255*intensity, b: 0, a: 255 };
            } else if (tifType === 'height'){
                let intensity = (rasters[0][i] / 25);
                //intensity = intensity > 255 ? 255 : intensity;
                rgba = { r: 0, g: 255*intensity, b: 0, a: 255 };
            } else if( tifType === 'carbon'){
                let intensity = (rasters[0][i] / 300);
                //intensity = intensity > 255 ? 255 : intensity;
                rgba = { r: 255*intensity, g: 0, b: 0, a: 255 };
                //
            }

            imageData[chunkI * 4] = rgba.r;
            imageData[chunkI * 4 + 1] = rgba.g;
            imageData[chunkI * 4 + 2] = rgba.b;
            imageData[chunkI * 4 + 3] = rgba.a;
        }
    }
    
    self.postMessage({ 
        imageData,
        startY
    });
};