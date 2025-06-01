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



    //랜덤.
    10: '#D93240', // 기타침엽수
    14: '#D98A32', // 리기다소나무
    15: '#C8D932', // 곰솔
    16: '#75D932', // 잔나무
    18: '#32D94D', // 삼나무
    19: '#32D9A1', // 가분비나무
    20: '#32B4D9', // 비자나무
    21: '#325AD9', // 은행나무
    31: '#8A32D9', // 상수리나무
    34: '#D932C8', // 기타 참나무류
    35: '#D93275', // 오리나무
    36: '#C14554', // 고로쇠나무
    37: '#C18C45', // 자작나무
    38: '#AEC145', // 박달나무
    39: '#6AC145', // 밤나무
    41: '#45C161', // 서어나무
    42: '#45C1A8', // 때죽나무
    43: '#45AEC1', // 호두나무
    44: '#456AC1', // 백합나무
    45: '#8C45C1', // 포플러
    46: '#C145AE', // 벚나무
    47: '#C1456A', // 느티나무
    48: '#A85863', // 층층나무
    49: '#A88F58', // 아까시나무
    60: '#97A858', // 기타상록활엽수
    61: '#60A858', // 가시나무
    62: '#58A872', // 구실잣밤나무
    63: '#58A89F', // 녹나무
    64: '#5897A8', // 굴거리나무
    65: '#5860A8', // 황칠나무
    66: '#8F58A8', // 사스레피나무
    67: '#A85897', // 후박나무
    68: '#A85860', // 새덕이
    78: '#8E6B74', // 죽림
    81: '#8E896B', // 미립목지
    82: '#7D8E6B', // 제지
    83: '#5D8E6B', // 관목덤불
    91: '#6B8E7D', // 주거지
    92: '#6B8E8E', // 초지
    93: '#6B7D8E', // 경작지
    94: '#6B5D8E', // 수체
    95: '#896B8E', // 과수원
    99: '#8E6B7D'  // 기타
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