const orig_jiri_1 = "./tif/carbon/jiri_1.tif";
const orig_jiri_2 = "./tif/carbon/jiri_2.tif";
const orig_sobaek = "./tif/carbon/sobaek.tif";
const pred_jiri_1 = "./tif/jiri_1_pred_all_masked.tif";
const pred_jiri_2 = "./tif/jiri_2_pred_all_masked.tif";
const pred_sobaek = "./tif/sobaek_pred_all_masked.tif";
const CODE_DBH = "DBH";
const CODE_HEIGHT = "height";
const CODE_CARBON = "carbon";
const CODE_SPECIES = "species";
const setting_tif_type = { 'orig':[orig_jiri_1, orig_jiri_2, orig_sobaek] };

const geojson_jiri = "./geojson/jiri_crop.geojson";
const geojson_sobaek = "./geojson/sobaek_crop.geojson";

const mapping_Index = {
    0: 0,
    1: 11,
    2: 12,
    3: 13,
    4: 32,
    5: 33,
    6: 30,
    6: 40,
    6: 77,
}
const tree_color_map = {
    "1": '소나무',
    "2": '잣나무',
    "3": '낙엽송',
    "14": '리기다소나무',
    "15": '곰솔',
    "16": '잔나무',  
    "18": '삼나무',
    "19": '가분비나무',
    "20": '비자나무',
    "21": '은행나무',
    "10": '기타침엽수',
    "31": '상수리나무',
    "4": '신갈나무',
    "5": '굴참나무',
    "34": '기타 참나무류',
    "35": '오리나무',
    "36": '고로쇠나무',
    "37": '자작나무',
    "38": '박달나무',
    "39": '밤나무',
    "40": '물푸레나무',
    "41": '서어나무',
    "42": '때죽나무',
    "43": '호두나무',
    "44": '백합나무',
    "45": '포플러',
    "46": '벚나무',
    "47": '느티나무',
    "48": '층층나무',
    "49": '아까시나무',
    "30": '기타활엽수',
    "61": '가시나무',
    "62": '구실잣밤나무',
    "63": '녹나무',
    "64": '굴거리나무',
    "65": '황칠나무',
    "66": '사스레피나무',
    "67": '후박나무',
    "68": '새덕이',
    "60": '기타상록활엽수',
    "77": '침활혼효림',
    "78": '죽림',
    "81": '미립목지',
    "82": '제지',
    "83": '관목덤불',
    "91": '주거지',
    "92": '초지',
    "93": '경작지',
    "94": '수체',
    "95": '과수원',
    "99": '기타'
}

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
const pred_palette = {
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
const colorCache = new Map();

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

async function MakeImageDataFromTif(tif_path, tif_type) {
    //const tif_path = setting_tif_type[tif_type];
    console.log('here!!tif_path', tif_path);
    console.log('tif_type', tif_type);
    const response_tif = await fetch(tif_path);
    const arrayBuffer_tif = await response_tif.arrayBuffer();
    const tiff_tif = await GeoTIFF.fromArrayBuffer(arrayBuffer_tif);
    const image_tif = await tiff_tif.getImage();
    const rasters_tif = await image_tif.readRasters();
    const width_tif = image_tif.getWidth();
    const height_tif = image_tif.getHeight();

    const workers = [
        new Worker('worker.js'),
        new Worker('worker.js'),
        new Worker('worker.js'),
        new Worker('worker.js')
    ];

    // 각 Worker가 처리할 영역 계산
    const chunkHeight = Math.ceil(height_tif / 4);
    const promises = workers.map((worker, index) => {
        return new Promise((resolve) => {
            worker.onmessage = function(e) {
                const { imageData, startY } = e.data;
                resolve({ imageData, startY });
            };

            const startY = index * chunkHeight;
            const endY = Math.min(startY + chunkHeight, height_tif);

            worker.postMessage({
                rasters: rasters_tif,
                tifType: tif_type,
                width: width_tif,
                height: height_tif,
                startY,
                endY,
            });
        });
    });

    // 모든 Worker의 작업 완료 대기
    const results = await Promise.all(promises);

    // 결과를 하나의 Canvas에 합치기
    const canvas_tif = document.createElement("canvas");
    canvas_tif.width = width_tif;
    canvas_tif.height = height_tif;
    const ctx_tif = canvas_tif.getContext("2d");
    ctx_tif.imageSmoothingEnabled = false;
    ctx_tif.mozImageSmoothingEnabled = false; // Firefox
    ctx_tif.webkitImageSmoothingEnabled = false; // Chrome, Safari
    ctx_tif.msImageSmoothingEnabled = false; // IE, Edge
    // 각 Worker의 결과를 Canvas에 그리기
    results.forEach(({ imageData, startY }) => {
        const imageDataObj = new ImageData(imageData, width_tif, imageData.length / (4 * width_tif));
        ctx_tif.putImageData(imageDataObj, 0, startY);
    });

    // Worker 정리
    workers.forEach(worker => worker.terminate());
    //console.log('canvas_tif', canvas_tif.toDataURL());
    return {"url":canvas_tif.toDataURL(), "raster":rasters_tif};
}


function getPerspectiveTransformMatrix(srcPoints, dstPoints) {
    if (srcPoints.length !== 4 || dstPoints.length !== 4) {
        console.error("Source and destination must both contain 4 points.");
        return null;
    }

    // Ax = b 형태의 방정식을 만듭니다. 여기서 x는 변환 행렬의 8개 요소입니다 (h33=1로 가정).
    // 각 점 쌍은 2개의 방정식을 제공합니다.
    // x_dst = (h11*x_src + h12*y_src + h13) / (h31*x_src + h32*y_src + 1)
    // y_dst = (h21*x_src + h22*y_src + h23) / (h31*x_src + h32*y_src + 1)
    // 이를 정리하면:
    // h11*x_src + h12*y_src + h13 - h31*x_src*x_dst - h32*y_src*x_dst = x_dst
    // h21*x_src + h22*y_src + h23 - h31*x_src*y_dst - h32*y_src*y_dst = y_dst

    const A = [];
    const b = [];

    for (let i = 0; i < 4; i++) {
        const src = srcPoints[i];
        const dst = dstPoints[i];

        A.push([src.x, src.y, 1, 0, 0, 0, -src.x * dst.x, -src.y * dst.x]);
        b.push(dst.x);

        A.push([0, 0, 0, src.x, src.y, 1, -src.x * dst.y, -src.y * dst.y]);
        b.push(dst.y);
    }

    try {
        // math.lusolve(A, b)는 Ax = b에서 x를 찾습니다.
        // 결과는 열 벡터이므로, 이를 배열로 변환합니다.
        const h_coeffs_matrix = math.lusolve(math.matrix(A), math.matrix(b));
        const h_coeffs = h_coeffs_matrix.toArray().flat();


        // 3x3 Homography 행렬 구성 (h33 = 1)
        const H = [
            [h_coeffs[0], h_coeffs[1], h_coeffs[2]],
            [h_coeffs[3], h_coeffs[4], h_coeffs[5]],
            [h_coeffs[6], h_coeffs[7], 1]
        ];
        return H;

    } catch (error) {
        console.error("Error solving for perspective transform matrix:", error);
        return null;
    }
}

/**
 * 주어진 점을 투시 변환 행렬을 사용해 변환합니다.
 * @param {{x: number, y: number}} point - 변환할 점 {x,y}
 * @param {Array<Array<number>>} H - 3x3 변환 행렬
 * @returns {{x: number, y: number}|null} 변환된 점 {x,y} 또는 오류 시 null
 */
function transformPoint(point, H) {
    if (!H || H.length !== 3 || H[0].length !== 3) {
        console.error("Invalid transformation matrix H.");
        return null;
    }

    const x = point.x;
    const y = point.y;

    // 동차 좌표계로 변환: [x, y, 1]^T
    // H * [x, y, 1]^T = [x', y', w']^T
    const w_prime = H[2][0] * x + H[2][1] * y + H[2][2];
    if (Math.abs(w_prime) < 1e-9) { // 0으로 나누는 것을 방지
        console.warn("w_prime is close to zero, transformation might be unstable.");
        // 이 경우, 무한대의 점으로 매핑될 수 있습니다.
        // 상황에 따라 다른 처리가 필요할 수 있습니다. (예: null 반환 또는 에러)
        return { x: Infinity, y: Infinity };
    }

    const x_prime = (H[0][0] * x + H[0][1] * y + H[0][2]) / w_prime;
    const y_prime = (H[1][0] * x + H[1][1] * y + H[1][2]) / w_prime;

    return { x: x_prime, y: y_prime };
}

// --- 예제 사용 ---
// 1. 원본 점 (source points) - 이 점들은 실제 이미지나 영역에서 가져와야 합니다.
// 예시: (시계방향 또는 반시계방향으로 순서대로)
const srcPoints = [
    { x: 100, y: 100 }, // Top-Left
    { x: 500, y: 150 }, // Top-Right
    { x: 450, y: 600 }, // Bottom-Right
    { x: 50,  y: 500 }  // Bottom-Left
];

// 2. 대상 점 (destination points) - 3600x3600 정사각형 영역
const dstPoints = [
    { x: 0,    y: 0 },    // Top-Left
    { x: 3600, y: 0 },    // Top-Right
    { x: 3600, y: 3600 }, // Bottom-Right
    { x: 0,    y: 3600 }  // Bottom-Left
];
/*
// 3. 변환 행렬 계산
const H_matrix = getPerspectiveTransformMatrix(srcPoints, dstPoints);

if (H_matrix) {
    console.log("계산된 투시 변환 행렬 H:");
    console.table(H_matrix);

    // 4. 원본 점 중 하나를 변환 테스트
    const testPointSrc = srcPoints[0]; // { x: 100, y: 100 }
    const transformedPoint = transformPoint(testPointSrc, H_matrix);

    if (transformedPoint) {
        console.log(`원본 점 (${testPointSrc.x}, ${testPointSrc.y}) -> 변환된 점 (${transformedPoint.x.toFixed(2)}, ${transformedPoint.y.toFixed(2)})`);
        // 예상 결과: (0.00, 0.00) 에 가깝게 나와야 합니다.

        const anotherTestPoint = { x: 300, y: 300 }; // srcPoints 내부의 임의의 점
        const transformedAnotherPoint = transformPoint(anotherTestPoint, H_matrix);
        if (transformedAnotherPoint) {
             console.log(`임의의 점 (${anotherTestPoint.x}, ${anotherTestPoint.y}) -> 변환된 점 (${transformedAnotherPoint.x.toFixed(2)}, ${transformedAnotherPoint.y.toFixed(2)})`);
        }
    }
}

// srcPoints의 네 점이 dstPoints의 네 점으로 정확히 매핑되는지 확인
console.log("\n--- 원본 점들을 변환하여 대상 점들과 비교 ---");
if (H_matrix) {
    for (let i = 0; i < 4; i++) {
        const p_src = srcPoints[i];
        const p_dst_expected = dstPoints[i];
        const p_dst_transformed = transformPoint(p_src, H_matrix);
        if (p_dst_transformed) {
            console.log(
                `Src(${p_src.x}, ${p_src.y}) -> Transformed(${p_dst_transformed.x.toFixed(2)}, ${p_dst_transformed.y.toFixed(2)}). Expected Dst(${p_dst_expected.x}, ${p_dst_expected.y})`
            );
        }
    }
}
    */