// UTM 좌표계 정의 (EPSG:32652)
const utm52N = new L.Proj.CRS('EPSG:32652',
    '+proj=utm +zone=52 +datum=WGS84 +units=m +no_defs',
    {
        resolutions: [8192, 4096, 2048, 1024, 512, 256, 128,80, 64,48, 32, 16, 8, 4, 2, 1, 0.5]
    }
);

// proj4 초기화 및 좌표계 정의
proj4.defs("EPSG:32652", "+proj=utm +zone=52 +datum=WGS84 +units=m +no_defs");

// 지도 초기화 (WGS84 좌표계 사용)
const map = L.map("map").setView([37.5665, 126.978], 13);

// OpenStreetMap 타일 레이어 추가
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Esri WorldImagery 타일 레이어 추가
L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        attribution:
            "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    }
).addTo(map);

let jiriPolyline = null;
let sobaekPolyline = null;
let jiriPoints = null;
let sobaekPoints = null;
let jiri_1Points = null;
let jiri_2Points = null;

// GeoJSON 데이터 로드 및 표시 함수
async function loadGeoJSON(option) {
    try {
        if (option === "On") {
            const response_jiri = await fetch(geojson_jiri);
            const response_sobaek = await fetch(geojson_sobaek);

            const data_jiri = await response_jiri.json();
            const data_sobaek = await response_sobaek.json();

            // UTM 좌표를 WGS84로 변환하는 함수
            function utmToWgs84(coords) {
                const easting = coords[0];
                const northing = coords[1];
                const wgs84 = proj4("EPSG:32652", "EPSG:4326", [easting, northing]);
                return [wgs84[0], wgs84[1]]; // [위도, 경도] 순서로 반환
            }

            // 각 GeoJSON의 좌표를 변환
            const jiri_coords = data_jiri.features[0].geometry.coordinates[0].map(utmToWgs84);
            const sobaek_coords = data_sobaek.features[0].geometry.coordinates[0].map(utmToWgs84);
            jiriPoints = jiri_coords.map(coord => L.latLng(coord[1], coord[0]));
            sobaekPoints = sobaek_coords.map(coord => L.latLng(coord[1], coord[0]));
           
            // 지리산 영역을 선으로 표시
            jiriPolyline = L.polyline(
                jiriPoints,
                {color: 'red', weight: 2}
            ).addTo(map);

            // 소백산 영역을 선으로 표시
            sobaekPolyline = L.polyline(
                sobaekPoints,
                {color: 'blue', weight: 2}
            ).addTo(map);

            // 모든 점을 포함하는 경계 설정
                        // jiriPoints를 좌우로 나누기
            // jiriPoints의 경계를 구하고 좌우로 나누기
            
            jiri_1Points = [jiriPoints[0],
                            L.latLng( (jiriPoints[0].lat+jiriPoints[1].lat)/2, (jiriPoints[0].lng+jiriPoints[1].lng)/2),
                            L.latLng( (jiriPoints[2].lat+jiriPoints[3].lat)/2, (jiriPoints[2].lng+jiriPoints[3].lng)/2),
                            jiriPoints[3],
                            jiriPoints[0]];
            jiri_2Points = [L.latLng( (jiriPoints[0].lat+jiriPoints[1].lat)/2, (jiriPoints[0].lng+jiriPoints[1].lng)/2),
                            jiriPoints[1],
                            jiriPoints[2],
                            L.latLng( (jiriPoints[2].lat+jiriPoints[3].lat)/2, (jiriPoints[2].lng+jiriPoints[3].lng)/2),
                            L.latLng( (jiriPoints[0].lat+jiriPoints[1].lat)/2, (jiriPoints[0].lng+jiriPoints[1].lng)/2)];

            console.log('jiri_1Points',jiri_1Points);
            console.log('jiri_2Points',jiri_2Points);
            console.log('jiriPoints',jiriPoints);
            const bounds = L.latLngBounds([...jiriPoints, ...sobaekPoints]);
            map.fitBounds(bounds);

        } else {
            if (jiriPolyline) map.removeLayer(jiriPolyline);
            if (sobaekPolyline) map.removeLayer(sobaekPolyline);
        }
    } catch (error) {
        console.error("GeoJSON 로드 중 오류 발생:", error);
    }
}

document.querySelectorAll('input[name="jsonLayer"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
        if (e.target.checked) {
            loadGeoJSON(e.target.value);
        }
    });
});
document.querySelector('input[name="jsonLayer"][id="jsonOn"]').checked = true;

// 페이지 로드 시 GeoJSON 데이터 로드
loadGeoJSON("On")
    .then(() => {
        console.log('성공',jiriPoints);
        console.log('성공',sobaekPoints);
    })
    .catch((error) => {
        console.error("GeoJSON 로드 중 오류 발생:", error);
    });

// 전역 변수로 현재 표시된 TIF 레이어를 추적
let currentTifLayer_sobaek = null;
let currentTifLayer_jiri_1 = null;
let currentTifLayer_jiri_2 = null;
let orig_tif = {
    jiri_1: null,
    jiri_2: null,
    sobaek: null
}
let pred_tif = {
    jiri_1: null,
    jiri_2: null,
    sobaek: null
}
// TIF 파일을 로드하고 표시하는 함수
async function loadTifFile(option,tif_types) {
    try {
        // 이전 레이어가 있다면 제거
        console.log('Start!! option',option);
        if (option === "On") {
            // Canvas를 이미지 URL로 변환
            console.log('Start!! CODE_CARBON',CODE_CARBON);
            console.time('MakeImageDataFromTif1');
            let imageUrl_jiri_1,imageUrl_jiri_2,imageUrl_sobaek;
            if (tif_types === "orig") {
                if (orig_tif.jiri_1 === null) {
                    
                console.log('HERE!! CODE_CARBON',CODE_CARBON);
                [imageUrl_jiri_1,imageUrl_jiri_2,imageUrl_sobaek] = await Promise.all([
                    MakeImageDataFromTif(orig_jiri_1,CODE_CARBON),
                    MakeImageDataFromTif(orig_jiri_2,CODE_CARBON),
                    MakeImageDataFromTif(orig_sobaek,CODE_CARBON)
                ]);
                orig_tif.jiri_1 = imageUrl_jiri_1;
                orig_tif.jiri_2 = imageUrl_jiri_2;
                orig_tif.sobaek = imageUrl_sobaek;
                }
                imageUrl_jiri_1 = orig_tif.jiri_1;
                imageUrl_jiri_2 = orig_tif.jiri_2;
                imageUrl_sobaek = orig_tif.sobaek;
            } else if (tif_types === "pred") {
                if (pred_tif.jiri_1 === null) {
                    console.log('HERE2!! CODE_CARBON',CODE_CARBON);
                    [imageUrl_jiri_1,imageUrl_jiri_2,imageUrl_sobaek] = await Promise.all([
                        MakeImageDataFromTif(pred_jiri_1, CODE_CARBON),
                        MakeImageDataFromTif(pred_jiri_2, CODE_CARBON),
                        MakeImageDataFromTif(pred_sobaek, CODE_CARBON)
                    ]);
                    pred_tif.jiri_1 = imageUrl_jiri_1;
                    pred_tif.jiri_2 = imageUrl_jiri_2;
                    pred_tif.sobaek = imageUrl_sobaek;
                }
                imageUrl_jiri_1 = pred_tif.jiri_1;
                imageUrl_jiri_2 = pred_tif.jiri_2;
                imageUrl_sobaek = pred_tif.sobaek;
            }
            console.timeEnd('MakeImageDataFromTif1');
            const imageBounds_jiri_1 = [
                [jiri_1Points[0].lat, jiri_1Points[0].lng],
                [jiri_1Points[1].lat, jiri_1Points[1].lng],
                [jiri_1Points[2].lat, jiri_1Points[2].lng],
                [jiri_1Points[3].lat, jiri_1Points[3].lng],
                [jiri_1Points[4].lat, jiri_1Points[4].lng]
            ];
            const imageBounds_jiri_2 = [
                [jiri_2Points[0].lat, jiri_2Points[0].lng],
                [jiri_2Points[1].lat, jiri_2Points[1].lng],
                [jiri_2Points[2].lat, jiri_2Points[2].lng],
                [jiri_2Points[3].lat, jiri_2Points[3].lng],
                [jiri_2Points[4].lat, jiri_2Points[4].lng]
            ];
            
            const imageBounds_sobaek = [
                [sobaekPoints[0].lat, sobaekPoints[0].lng],
                [sobaekPoints[1].lat, sobaekPoints[1].lng],
                [sobaekPoints[2].lat, sobaekPoints[2].lng],
                [sobaekPoints[3].lat, sobaekPoints[3].lng],
                [sobaekPoints[4].lat, sobaekPoints[4].lng]
            ];

            // 커스텀 이미지 오버레이 생성
            currentTifLayer_sobaek = L.distortableImageOverlay(imageUrl_sobaek, {
                corners: [
                    L.latLng(sobaekPoints[3].lat, sobaekPoints[3].lng),
                    L.latLng(sobaekPoints[2].lat, sobaekPoints[2].lng),
                    L.latLng(sobaekPoints[0].lat, sobaekPoints[0].lng),
                    L.latLng(sobaekPoints[1].lat, sobaekPoints[1].lng),
                ],
                opacity: 0.3,
            }).addTo(map);
            currentTifLayer_jiri_1 = L.distortableImageOverlay(imageUrl_jiri_1, {
                corners: [
                    L.latLng(jiri_1Points[3].lat, jiri_1Points[3].lng),
                    L.latLng(jiri_1Points[2].lat, jiri_1Points[2].lng),
                    L.latLng(jiri_1Points[0].lat, jiri_1Points[0].lng),
                    L.latLng(jiri_1Points[1].lat, jiri_1Points[1].lng),
                ],
                opacity: 0.3,
            }).addTo(map);
            currentTifLayer_jiri_2 = L.distortableImageOverlay(imageUrl_jiri_2, {
                corners: [
                    L.latLng(jiri_2Points[3].lat, jiri_2Points[3].lng),
                    L.latLng(jiri_2Points[2].lat, jiri_2Points[2].lng),
                    L.latLng(jiri_2Points[0].lat, jiri_2Points[0].lng),
                    L.latLng(jiri_2Points[1].lat, jiri_2Points[1].lng),
                ],  
                opacity: 0.3,
            }).addTo(map);
            //L.polygon(imageBounds_sobaek, {
            //    color: 'red',
            //    weight: 2,
            //    fillOpacity: 0.0
            //}).addTo(map);
            //L.polygon(imageBounds_jiri_1, {
            //    color: 'yellow',
            //    weight: 2,
            //    fillOpacity: 0.0
            //}).addTo(map);
            //L.polygon(imageBounds_jiri_2, {
            //    color: 'blue',
            //    weight: 2,
            //    fillOpacity: 0.0
            //}).addTo(map);
            // 지도 뷰를 TIF 이미지 영역으로 조정
            const bounds = L.latLngBounds([...jiriPoints, ...sobaekPoints]);
            map.fitBounds(bounds);

        }
        else {
            if ( map.hasLayer(currentTifLayer_sobaek)) 
                map.removeLayer(currentTifLayer_sobaek);
            if ( map.hasLayer(currentTifLayer_jiri_1)) 
                map.removeLayer(currentTifLayer_jiri_1);
            if ( map.hasLayer(currentTifLayer_jiri_2)) 
                map.removeLayer(currentTifLayer_jiri_2);
        }


    } catch (error) {
        console.error("TIF 파일 로드 중 오류 발생:", error);
    }
}

// Radio button 이벤트 리스너 설정
let radio_orig_tif = document.querySelectorAll('input[name="origTifLayer"]');
let radio_pred_tif = document.querySelectorAll('input[name="predTifLayer"]');

radio_orig_tif.forEach((radio) => {
    radio.addEventListener("change", (e) => {
        if (e.target.checked) {
            loadTifFile("Off", "pred");
            radio_pred_tif.forEach((radio) => {
                if (radio.id === "predTifOff")
                    radio.checked = true;
            });
            loadTifFile(e.target.value, "orig");
        }
    });
});

radio_pred_tif.forEach((radio) => {
    radio.addEventListener("change", (e) => {
        if (e.target.checked) {
            loadTifFile("Off", "orig");
            radio_orig_tif.forEach((radio) => {
                if (radio.id === "origTifOff")
                    radio.checked = true;
            });
            loadTifFile(e.target.value, "pred");
        }
    });
});

// script.js에 추가
document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const id = e.target.id;
        const checked = e.target.checked;
        
        switch(id) {
            case 'showLegend':
                // 범례 표시/숨김 처리
                break;
            case 'showGrid':
                // 그리드 표시/숨김 처리
                break;
            case 'showLabels':
                // 레이블 표시/숨김 처리
                break;
        }
    });
});

// script.js에 추가
function toggleCheckboxContainer() {
    const header = document.querySelector('.checkbox-header');
    const content = document.querySelector('.checkbox-content');
    
    header.classList.toggle('active');
    content.classList.toggle('show');
}
