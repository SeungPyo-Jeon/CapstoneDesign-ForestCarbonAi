const utm52N = new L.Proj.CRS('EPSG:32652',
    '+proj=utm +zone=52 +datum=WGS84 +units=m +no_defs',
    {
        resolutions: [8192, 4096, 2048, 1024, 512, 256, 128,80, 64,48, 32, 16, 8, 4, 2, 1, 0.5]
    }
);
let isDrawTif = true;
let isDrawingMode = false; // 사각형 그리기 모드 상태
let firstClickLatLng = null; // 첫 번째 클릭 위치 저장
let drawnRectangle = null; // 그려진 사각형 저장
let mapInstances = {}; // 모든 맵 인스턴스를 저장할 객체 (전역으로 변경)

// proj4 초기화 및 좌표계 정의
proj4.defs("EPSG:32652", "+proj=utm +zone=52 +datum=WGS84 +units=m +no_defs");

// --- Homography 관련 함수들 (pos2pix.html에서 가져옴) ---
function solveLinearSystem(A, b) {
    // Solves Ax = b using Gaussian elimination
    const n = A.length;
    for (let i = 0; i < n; i++) {
        // Augment A with b
        A[i].push(b[i]);
    }

    for (let i = 0; i < n; i++) {
        // Pivot for A[i][i]
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
                maxRow = k;
            }
        }
        [A[i], A[maxRow]] = [A[maxRow], A[i]]; // Swap rows

        if (Math.abs(A[i][i]) < 1e-12) return null; // Singular matrix

        // Normalize row i
        for (let k = i + 1; k < n + 1; k++) {
            A[i][k] /= A[i][i];
        }
        A[i][i] = 1; // Set pivot to 1 (though already done by division)

        // Eliminate other rows
        for (let k = 0; k < n; k++) {
            if (k !== i) {
                const factor = A[k][i];
                for (let j = i; j < n + 1; j++) {
                    A[k][j] -= factor * A[i][j];
                }
            }
        }
    }

    const x = new Array(n);
    for (let i = 0; i < n; i++) {
        x[i] = A[i][n];
    }
    return x;
}

function computeHomographyMatrix(srcPoints, dstPoints) {
    if (srcPoints.length !== 4 || dstPoints.length !== 4) {
        throw new Error("Need 4 corresponding points for homography.");
    }

    const A = [];
    const b = [];

    for (let i = 0; i < 4; i++) {
        const x_map = srcPoints[i][0]; // lng
        const y_map = srcPoints[i][1]; // lat
        const x_img = dstPoints[i][0]; // col
        const y_img = dstPoints[i][1]; // row

        A.push([x_map, y_map, 1, 0, 0, 0, -x_img * x_map, -x_img * y_map]);
        b.push(x_img);

        A.push([0, 0, 0, x_map, y_map, 1, -y_img * x_map, -y_img * y_map]);
        b.push(y_img);
    }

    const h_vector = solveLinearSystem(A, b); // Solve Ah = b for h = [h11,h12,h13,h21,h22,h23,h31,h32]

    if (!h_vector || h_vector.length !== 8) {
        console.error("Failed to solve for homography parameters.", h_vector);
        return null;
    }

    // Reconstruct the 3x3 homography matrix (h33 = 1)
    const H = [
        [h_vector[0], h_vector[1], h_vector[2]],
        [h_vector[3], h_vector[4], h_vector[5]],
        [h_vector[6], h_vector[7], 1.0],
    ];
    return H;
}

async function loadGeoJSON() {
    try {
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
            )//.addTo(map);

            // 소백산 영역을 선으로 표시
            sobaekPolyline = L.polyline(
                sobaekPoints,
                {color: 'blue', weight: 2}
            )//.addTo(map);

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
            return {"jiri_1":jiri_1Points,"jiri_2":jiri_2Points,"sobaek":sobaekPoints};
            //const bounds = L.latLngBounds([...jiriPoints, ...sobaekPoints]);
            //map.fitBounds(bounds);
    } catch (error) {
        console.error("GeoJSON 로드 중 오류 발생:", error);
    }
}

class MapInstance {
    constructor(mapId, tifUrl, points) {
        this.mapId = mapId;
        this.tifUrl = tifUrl;
        this.map = null;
        this.imageUrl_jiri_1 = null;
        this.imageUrl_jiri_2 = null;
        this.imageUrl_sobaek = null;
        this.imageRaster_jiri_1 = null;
        this.imageRaster_jiri_2 = null;
        this.imageRaster_sobaek = null;

        this.imageBounds_jiri_1 = null;
        this.imageBounds_jiri_2 = null;
        this.imageBounds_sobaek = null;

        this.currentTifLayer_jiri_1 = null;
        this.currentTifLayer_jiri_2 = null;
        this.currentTifLayer_sobaek = null;

        this.points = points;
        this.buildingLayer = null;
        this.currentMarker = null;
        this.mapClickHandlerAttached = false; // 맵 클릭 핸들러 추가 여부 플래그
        this.drawnRectangle = null; // 각 맵 인스턴스에 그려진 사각형 저장
        this.outsideOverlay = null; // 선택 영역 바깥을 어둡게 처리하는 레이어

        // Homography 관련
        this.imagePixelWidth = 3600; // TIF 이미지의 픽셀 너비 (가정)
        this.imagePixelHeight = 3600; // TIF 이미지의 픽셀 높이 (가정)
        this.homographyMatrix_jiri_1 = null;
        this.homographyMatrix_jiri_2 = null;
        this.homographyMatrix_sobaek = null;

        this.invHomography_jiri_1 = null; // 역 Homography 행렬 추가
        this.invHomography_jiri_2 = null;
        this.invHomography_sobaek = null;

        this.initMap();
    }
    initMap() {
        this.map = L.map(this.mapId, {
            center: [37.5665, 126.9780], // 서울 중심 좌표
            zoom: 13,
            maxZoom: 22, // 최대 줌 레벨 증가
            zoomControl: false,
            attributionControl: false,
            offsetHeight: 1
        });
    
        // 기본 타일 레이어 추가
        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            { 
                //attribution: '© OpenStreetMap contributors'
                maxZoom: 22, // 타일 레이어의 최대 줌 레벨 증가
                maxNativeZoom: 19 // OSM의 일반적인 네이티브 최대 줌
          }).addTo(this.map);
        // Esri WorldImagery 타일 레이어 추가
        L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { 
            // attribution: '© Esri'
            maxZoom: 22 // 타일 레이어의 최대 줌 레벨 증가
         }).addTo(this.map);
        this.setImageBounds(this.points);
        //if (this.tifUrl == 'height'){
        //    console.log('height',this.tifUrl);
        //    this.initBuildingLayer();
        //}
        
    }
    setImageBounds(points){
        //L.polygon(points["jiri_1"], { color: "blue" }).addTo(this.map);
        //L.polygon(points["jiri_2"], { color: "red" }).addTo(this.map);

        this.imageBounds_jiri_1 = [
            L.latLng(points["jiri_1"][3].lat, points["jiri_1"][3].lng),
                    L.latLng(points["jiri_1"][2].lat, points["jiri_1"][2].lng),
                    L.latLng(points["jiri_1"][0].lat, points["jiri_1"][0].lng),
                    L.latLng(points["jiri_1"][1].lat, points["jiri_1"][1].lng),
        ];
        this.imageBounds_jiri_2 = [
            L.latLng(points["jiri_2"][3].lat, points["jiri_2"][3].lng),
                    L.latLng(points["jiri_2"][2].lat, points["jiri_2"][2].lng),
                    L.latLng(points["jiri_2"][0].lat, points["jiri_2"][0].lng),
                    L.latLng(points["jiri_2"][1].lat, points["jiri_2"][1].lng),
        ];
        this.imageBounds_sobaek = [
            L.latLng(points["sobaek"][3].lat, points["sobaek"][3].lng),
                    L.latLng(points["sobaek"][2].lat, points["sobaek"][2].lng),
                    L.latLng(points["sobaek"][0].lat, points["sobaek"][0].lng),
                    L.latLng(points["sobaek"][1].lat, points["sobaek"][1].lng),
        ];
    }
    eraseTif(){
        if (this.currentTifLayer_jiri_1 && this.map.hasLayer(this.currentTifLayer_jiri_1)) {
            this.map.removeLayer(this.currentTifLayer_jiri_1);
        }
        this.currentTifLayer_jiri_1 = null;

        if (this.currentTifLayer_jiri_2 && this.map.hasLayer(this.currentTifLayer_jiri_2)) {
            this.map.removeLayer(this.currentTifLayer_jiri_2);
        }
        this.currentTifLayer_jiri_2 = null;

        if (this.currentTifLayer_sobaek && this.map.hasLayer(this.currentTifLayer_sobaek)) {
            this.map.removeLayer(this.currentTifLayer_sobaek);
        }
        this.currentTifLayer_sobaek = null;

        if (this.currentMarker) {
            this.map.removeLayer(this.currentMarker);
            this.currentMarker = null;
        }
    }
    async loadTif(){
        try{
            let jiri_1,jiri_2,sobaek;
        [jiri_1,jiri_2,sobaek] = await Promise.all([
                    MakeImageDataFromTif('./tif/'+this.tifUrl+'/jiri_1.tif', this.tifUrl),
                    MakeImageDataFromTif('./tif/'+this.tifUrl+'/jiri_2.tif', this.tifUrl),
                    MakeImageDataFromTif('./tif/'+this.tifUrl+'/sobaek.tif', this.tifUrl)
                ]);
            console.log('jiri_1',jiri_1);
            this.imageUrl_jiri_1 = jiri_1.url;
            this.imageRaster_jiri_1 = jiri_1.raster;
            this.imageUrl_jiri_2 = jiri_2.url;
            this.imageRaster_jiri_2 = jiri_2.raster;
            this.imageUrl_sobaek = sobaek.url;
            this.imageRaster_sobaek = sobaek.raster;
        } catch (error) {
            console.error("TIF 로드 중 오류 발생:", error);
        }
    }
    async drawTif(){
        if (this.imageUrl_jiri_1 == null){
            await this.loadTif();
        }
        //if (this.tifUrl == 'height'){
        //    //this.initBuildingLayer();
        //    await this.createBuildingLayer();
        //    return;
        //}
        this.currentTifLayer_sobaek = L.distortableImageOverlay(this.imageUrl_sobaek,
             { corners: this.imageBounds_sobaek,
                opacity: 1,
                editable: false,
                actions: [] 
             }).addTo(this.map);
        this.currentTifLayer_jiri_1 = L.distortableImageOverlay(this.imageUrl_jiri_1,
             { corners: this.imageBounds_jiri_1,
                opacity: 1,
                editable: false,
                actions: [] 
             }).addTo(this.map);
        this.currentTifLayer_jiri_2 = L.distortableImageOverlay(this.imageUrl_jiri_2,
             { corners: this.imageBounds_jiri_2,
                opacity: 1,
                editable: false,
                actions: [] 
             }).addTo(this.map);

        // Homography 행렬 계산
        const dstPoints = [
            [0, 0], // TL pixel
            [this.imagePixelWidth, 0], // TR pixel
            [0, this.imagePixelHeight], // BL pixel
            [this.imagePixelWidth, this.imagePixelHeight] // BR pixel
        ];

        if (this.currentTifLayer_jiri_1) {
            try {
                const mapGeoCorners = this.currentTifLayer_jiri_1.getCorners();
                //L.polygon(mapGeoCorners, { color: "blue" }).addTo(this.map);
                //console.log('mapGeoCorners',mapGeoCorners);
                const srcPoints = mapGeoCorners.map(p => [p.lng, p.lat]);
                this.homographyMatrix_jiri_1 = computeHomographyMatrix(srcPoints, dstPoints);
                if (!this.homographyMatrix_jiri_1) console.error(`Homography matrix calculation failed for jiri_1 on map ${this.mapId}.`);
                else {
                    try {
                        this.invHomography_jiri_1 = math.inv(this.homographyMatrix_jiri_1);
                    } catch (e) {
                        console.error(`Error inverting homography for jiri_1: ${e}`);
                        this.invHomography_jiri_1 = null;
                    }
                }
            } catch (e) { console.error(`Error calculating homography for jiri_1: ${e}`); this.homographyMatrix_jiri_1 = null; this.invHomography_jiri_1 = null;}
        }
        if (this.currentTifLayer_jiri_2) {
            try {
                const mapGeoCorners = this.currentTifLayer_jiri_2.getCorners();
                //L.polygon(mapGeoCorners, { color: "blue" }).addTo(this.map);
                //console.log('mapGeoCorners',mapGeoCorners);
                const srcPoints = mapGeoCorners.map(p => [p.lng, p.lat]);
                this.homographyMatrix_jiri_2 = computeHomographyMatrix(srcPoints, dstPoints);
                if (!this.homographyMatrix_jiri_2) console.error(`Homography matrix calculation failed for jiri_2 on map ${this.mapId}.`);
                else {
                    try {
                        this.invHomography_jiri_2 = math.inv(this.homographyMatrix_jiri_2);
                    } catch (e) {
                        console.error(`Error inverting homography for jiri_2: ${e}`);
                        this.invHomography_jiri_2 = null;
                    }
                }
            } catch (e) { console.error(`Error calculating homography for jiri_2: ${e}`); this.homographyMatrix_jiri_2 = null; this.invHomography_jiri_2 = null;}
        }
        if (this.currentTifLayer_sobaek) {
             try {
                const mapGeoCorners = this.currentTifLayer_sobaek.getCorners();
                const srcPoints = mapGeoCorners.map(p => [p.lng, p.lat]);
                this.homographyMatrix_sobaek = computeHomographyMatrix(srcPoints, dstPoints);
                if (!this.homographyMatrix_sobaek) console.error(`Homography matrix calculation failed for sobaek on map ${this.mapId}.`);
                else {
                    try {
                        this.invHomography_sobaek = math.inv(this.homographyMatrix_sobaek);
                    } catch (e) {
                        console.error(`Error inverting homography for sobaek: ${e}`);
                        this.invHomography_sobaek = null;
                    }
                }
            } catch (e) { console.error(`Error calculating homography for sobaek: ${e}`); this.homographyMatrix_sobaek = null; this.invHomography_sobaek = null;}
        }

        // 통합 맵 클릭 핸들러 추가 (한 번만)
        if (!this.mapClickHandlerAttached) {
            this.map.on('click', (e) => {
                if (isDrawingMode) {
                    if (!firstClickLatLng) {
                        firstClickLatLng = e.latlng;
                        // 첫 번째 클릭 시 임시 마커 등을 표시할 수 있습니다. (선택 사항)
                        console.log("First click:", firstClickLatLng);
                    } else {
                        // 두 번째 클릭: 사각형 그리기
                        const secondClickLatLng = e.latlng;
                        console.log("Second click:", secondClickLatLng);
                        this.drawRectangleOnAllMaps(firstClickLatLng, secondClickLatLng);
                        isDrawingMode = false; // 그리기 모드 비활성화
                        firstClickLatLng = null; // 첫 번째 클릭 위치 초기화
                        document.getElementById('statBtn').textContent = '통계잡기'; // 버튼 텍스트 변경
                    }
                } else {
                    Object.values(mapInstances).forEach(instance => {
                        instance.updateMarkerForLatLng(e.latlng);
                        console.log('instance clicked',instance);
                    });
                }
            });
            this.mapClickHandlerAttached = true;
        }
    }

    drawRectangleOnAllMaps(latLng1, latLng2) {
        const bounds = L.latLngBounds(latLng1, latLng2);
        Object.values(mapInstances).forEach(instance => {
            if (instance.drawnRectangle) {
                instance.map.removeLayer(instance.drawnRectangle);
            }
            instance.drawnRectangle = L.rectangle(bounds, {color: "#ff7800", weight: 1, fillOpacity: 0.0}).addTo(instance.map);
            instance.toggleOutsideOverlay(true, bounds); // 그린 사각형 외부를 어둡게 처리
        });
        // 통계 계산 및 차트 표시
        collectAndDisplayStatistics(bounds);
    }

    determineRegionForLatLng(latlng) {
        if (this.currentTifLayer_sobaek && L.latLngBounds(this.points["sobaek"]).contains(latlng)) {
            console.log('sobaek', L.latLngBounds(this.points["sobaek"]));
            return 'sobaek';
        } else if (this.currentTifLayer_jiri_2 && L.latLngBounds(this.points["jiri_2"]).contains(latlng)) {
            console.log('jiri_2', L.latLngBounds(this.points["jiri_2"]));
            return 'jiri_2';
        }else if (this.currentTifLayer_jiri_1 && L.latLngBounds(this.points["jiri_1"]).contains(latlng)) {
            console.log('jiri_1', L.latLngBounds(this.points["jiri_1"]));
            return 'jiri_1';
        } 
        // Fallback to imageBounds if layers are not yet fully initialized or for other checks
        if (this.imageBounds_sobaek && L.latLngBounds(this.imageBounds_sobaek).contains(latlng)) {
             return 'sobaek';
        }
        if (this.imageBounds_jiri_1 && L.latLngBounds(this.imageBounds_jiri_1).contains(latlng)) {
             return 'jiri_1';
        }
        if (this.imageBounds_jiri_2 && L.latLngBounds(this.imageBounds_jiri_2).contains(latlng)) {
             return 'jiri_2';
        }
        return null;
    }

    async getPixelValueAtLatLng(latlng, targetRegion) {
        if (!targetRegion) return null;

        let homographyMatrix = null;
        let currentImageRaster = null;

        if (targetRegion === 'jiri_1') {
            homographyMatrix = this.homographyMatrix_jiri_1;
            currentImageRaster = this.imageRaster_jiri_1;
        } else if (targetRegion === 'jiri_2') {
            homographyMatrix = this.homographyMatrix_jiri_2;
            currentImageRaster = this.imageRaster_jiri_2;
        } else if (targetRegion === 'sobaek') {
            homographyMatrix = this.homographyMatrix_sobaek;
            currentImageRaster = this.imageRaster_sobaek;
        }

        if (!homographyMatrix) {
            console.warn(`Homography matrix not available for ${targetRegion} on map ${this.mapId}. Cannot get pixel value.`);
            return null;
        }
        if (!currentImageRaster || !currentImageRaster[0]) {
            console.warn(`Image raster not available for ${targetRegion} on map ${this.mapId}. Cannot get pixel value.`);
            return null;
        }

        try {
            const P_map = [latlng.lng, latlng.lat, 1]; // Homogeneous coordinates for map point [lng, lat, 1]

            // Apply homography: P_img_h = H * P_map
            const P_img_h = [
                homographyMatrix[0][0] * P_map[0] + homographyMatrix[0][1] * P_map[1] + homographyMatrix[0][2] * P_map[2],
                homographyMatrix[1][0] * P_map[0] + homographyMatrix[1][1] * P_map[1] + homographyMatrix[1][2] * P_map[2],
                homographyMatrix[2][0] * P_map[0] + homographyMatrix[2][1] * P_map[1] + homographyMatrix[2][2] * P_map[2],
            ];

            let u_img_raw = -1, v_img_raw = -1; // u_img_raw is column (X), v_img_raw is row (Y)
            if (Math.abs(P_img_h[2]) > 1e-9) { // Avoid division by zero or very small w_h
                u_img_raw = P_img_h[0] / P_img_h[2];
                v_img_raw = P_img_h[1] / P_img_h[2];
            } else {
                console.error("Transformed w_h (P_img_h[2]) is close to zero, cannot compute pixel coordinates for", latlng);
                return null;
            }
            
            const colX = Math.floor(u_img_raw);
            const rowY = Math.floor(v_img_raw);

            if (colX >= 0 && colX < this.imagePixelWidth && 
                rowY >= 0 && rowY < this.imagePixelHeight &&
                currentImageRaster[0][rowY * this.imagePixelWidth + colX] !== undefined) {
                return currentImageRaster[0][rowY * this.imagePixelWidth + colX];
            }
            // console.warn(`Calculated pixel (col:${colX}, row:${rowY}) for latlng (${latlng.lat}, ${latlng.lng}) is out of image bounds (${this.imagePixelWidth}x${this.imagePixelHeight}) or raster data not found for ${targetRegion}. Raw (u,v): (${u_img_raw}, ${v_img_raw})`);
            return null; 
        } catch (error) {
            console.error(`Error getting pixel value using homography for ${this.mapId} at ${targetRegion} for latlng (${latlng.lat}, ${latlng.lng}):`, error);
            return null;
        }
    }

    async updateMarkerForLatLng(latlng) {
        const region = this.determineRegionForLatLng(latlng);
        if (region) {
            // Only try to get a value if the click is within one of this map's TIF regions
            const value = await this.getPixelValueAtLatLng(latlng, region);
            if (value !== null) {
                this.showMarkerAt(latlng, value);
            } else {
                // If no value, clear existing marker for this map instance
                if (this.currentMarker) {
                    this.map.removeLayer(this.currentMarker);
                    this.currentMarker = null;
                }
            }
        } else {
            // If click is outside any TIF region for this map, clear its marker
             if (this.currentMarker) {
                this.map.removeLayer(this.currentMarker);
                this.currentMarker = null;
            }
        }
    }

    showMarkerAt(latlng, value) {
        // 기존 마커 제거
        if (this.currentMarker) {
            this.map.removeLayer(this.currentMarker);
        }
        console.log(this.tifUrl);

        let popupContent = '';
        let iconHtml = '';
        let iconColor = '#007bff'; // 기본 아이콘 색상 (파란색 계열)

        if (this.tifUrl === 'species') {
            // tree_color_map 변수가 현재 코드에 없어 value를 직접 사용합니다.
            // tree_color_map이 있다면 tree_color_map[value]로 변경해주세요.
            popupContent = `수종: <strong>${tree_color_map[value]}</strong>`;
            iconHtml = `<div style="font-size: 12px; font-weight: bold; color: white;">${value}</div>`;
            iconColor = '#28a745'; // 수종은 초록색 계열
        } else if (this.tifUrl === 'height') {
            popupContent = `높이: <strong>${value.toFixed(2)}m</strong>`;
            iconHtml = `<div style="font-size: 12px; font-weight: bold; color: white;">H</div>`;
            iconColor = '#ffc107'; // 높이는 노란색 계열
        } else if (this.tifUrl === 'DBH') {
            popupContent = `흉고직경: <strong>${value.toFixed(2)}cm</strong>`;
            iconHtml = `<div style="font-size: 12px; font-weight: bold; color: white;">D</div>`;
            iconColor = '#17a2b8'; // DBH는 청록색 계열
        } else if (this.tifUrl === 'carbon') {
            popupContent = `탄소저장량: <strong>${value.toFixed(2)}kg</strong>`;
            iconHtml = `<div style="font-size: 10px; font-weight: bold; color: white;">C</div>`; // 텍스트 크기 조절
            iconColor = '#6f42c1'; // 탄소는 보라색 계열
        }

        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: '',//`<div style="background-color:${iconColor}; width:30px; height:30px; border-radius:50%; display:flex; justify-content:center; align-items:center; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">${iconHtml}</div>`,
            iconSize: [0, 0],//[30, 30],
            iconAnchor: [0, 0], // 아이콘 중심점//[15, 15]
            popupAnchor: [0, 0] // 팝업 위치 (아이콘 위쪽)//[0, -15]
        });

        this.currentMarker = L.marker(latlng, { 
            icon: customIcon 
        })
            .bindPopup(popupContent)
            .addTo(this.map)
            .openPopup();

        console.log('Marker shown at:', latlng, 'with value:', value, 'on map:', this.tifUrl);
    }

    // height 타입에만 사용
    initBuildingLayer() {
        // OSMBuilding 레이어 초기화
        console.log('initBuildingLayer',this.map.offsetHeight);
        this.buildingLayer = new OSMBuildings(this.map);
        new L.TileLayer('https://tile-a.openstreetmap.fr/hot/{z}/{x}/{y}.png', {

            attribution: '© Data <a href="https://openstreetmap.org">OpenStreetMap</a>',
            maxZoom: 18,
            maxNativeZoom: 20,
          }).addTo(this.map);
        /*
        // 높이 데이터를 기반으로 3D 빌딩 생성
        this.buildingLayer.setStyle({
            color: '#4CAF50',
            opacity: 0.8,
            height: 10, // 기본 높이 배율
            minZoom: 13
        });
        */
        console.log('buildings',this.buildingLayer);
    }
    async createBuildingLayer(){
        const heightData = await this.getHeightData();
        const gridSize = 5;
        const buildings = [];
    
        // imageBounds_jiri_1의 좌표를 사용
        const bounds = this.imageBounds_jiri_1;
        const startLat = bounds[0].lat;
        const startLng = bounds[0].lng;
        const dxLat = (bounds[1].lat - bounds[0].lat) / 3600;
        const dxLng = (bounds[1].lng - bounds[0].lng) / 3600;
        const dyLat = (bounds[2].lat - bounds[0].lat) / 3600;
        const dyLng = (bounds[2].lng - bounds[0].lng) / 3600;
        
        for (let i = 0; i < 3600; i += gridSize) {
            for (let j = 0; j < 3600; j += gridSize) {
                const height = heightData[i*3600+j];
                if (height > 0) {
                    // imageBounds_jiri_1의 범위 내에서 좌표 계산
                    const lat = startLat + (j * dxLat) +  (i * dyLat);
                    const lng = startLng + (j * dxLng) +  (i * dyLng);
                    
                    buildings.push({
                        id: `building_${i}_${j}`,
                        lat: lat,
                        lon: lng,
                        minHeight: 0,
                        height: height * 10,
                        polygon: [
                            [lat, lng],
                            [lat + dxLat, lng - dxLat],
                            [lat + dxLat+dyLat, lng + dxLng+dyLng],
                            [lat - dyLat, lng + dyLng]
                        ]
                    });
                }
            }
        }
        console.log('HeightData:',heightData[0]);
        console.log('Number of buildings:', buildings.length);
        // 모든 빌딩을 한 번에 추가
        console.log('this.buildingLayer',this.buildingLayer);
        this.buildingLayer.set(buildings);
        console.log('this.buildingLayer',this.buildingLayer);
    }
    async getHeightData() {
        // TIF 파일에서 높이 데이터 추출
        const response = await fetch('./tif/height/jiri_1.tif');
        const arrayBuffer = await response.arrayBuffer();
        const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();
        const rasters = await image.readRasters();
        console.log('rasters',rasters[0]);
        console.log('rasters',rasters[0][0]);
        return rasters[0]; // 높이 데이터 반환
    }

    // GeoJSON 영역 바깥을 어둡게 하는 레이어 추가/제거 메소드 -> toggleOutsideOverlay로 변경
    toggleOutsideOverlay(show, bounds = null) {
        if (this.outsideOverlay) {
            this.map.removeLayer(this.outsideOverlay);
            this.outsideOverlay = null;
        }

        if (show && bounds) {
            // 맵 전체를 덮는 외부 폴리곤 좌표 (예: 세계 전체)
            const outerWorld = [
                L.latLng(-90, -180),
                L.latLng(90, -180),
                L.latLng(90, 180),
                L.latLng(-90, 180)
            ];

            // 사용자가 그린 사각형의 좌표를 구멍으로 사용
            const innerHole = [
                bounds.getSouthWest(), // 남서
                bounds.getNorthWest(), // 북서
                bounds.getNorthEast(), // 북동
                bounds.getSouthEast()  // 남동
            ].map(p => [p.lat, p.lng]);

            const outerRing = outerWorld.map(p => [p.lat, p.lng]);
            this.outsideOverlay = L.polygon([outerRing, innerHole], {
                color: 'black',
                weight: 0,
                fillColor: 'black',
                fillOpacity: 0.5
            }).addTo(this.map);
        }
    }

    async getValuesInBounds(bounds) {
        const values = [];
        const processedPixels = new Set(); 

        console.log(`[${this.mapId}] Starting getValuesInBounds for bounds:`, bounds);

        const regions = [
            { name: 'jiri_1', invHomography: this.invHomography_jiri_1, raster: this.imageRaster_jiri_1, layer: this.currentTifLayer_jiri_1 },
            { name: 'jiri_2', invHomography: this.invHomography_jiri_2, raster: this.imageRaster_jiri_2, layer: this.currentTifLayer_jiri_2 },
            { name: 'sobaek', invHomography: this.invHomography_sobaek, raster: this.imageRaster_sobaek, layer: this.currentTifLayer_sobaek }
        ];

        for (const region of regions) {
            console.log(`[${this.mapId}] Processing region: ${region.name}`);
            if (!region.invHomography || !region.raster || !region.raster[0] || !region.layer) {
                console.warn(`[${this.mapId}] Skipping region ${region.name} due to missing data (invHomography: ${!!region.invHomography}, raster: ${!!region.raster && !!region.raster[0]}, layer: ${!!region.layer})`);
                continue;
            }

            const regionBounds = region.layer.getBounds();
            console.log(`[${this.mapId}] Region ${region.name} bounds:`, regionBounds);
            if (!bounds.intersects(regionBounds)) {
                console.log(`[${this.mapId}] Selected bounds do not intersect with ${region.name} layer. Skipping pixel iteration.`);
                continue;
            }
            console.log(`[${this.mapId}] Selected bounds INTERSECT with ${region.name} layer. Starting pixel iteration.`);

            const imageWidth = this.imagePixelWidth;
            const imageHeight = this.imagePixelHeight;
            const rasterData = region.raster[0];
            let pixelsFromThisRegion = 0;

            for (let r = 0; r < imageHeight; r++) { 
                for (let c = 0; c < imageWidth; c++) { 
                    const pixelKey = `${this.mapId}_${region.name}_${c}_${r}`;
                    const P_img = [c + 0.5, r + 0.5, 1];
                    const P_map_h = [
                        region.invHomography[0][0] * P_img[0] + region.invHomography[0][1] * P_img[1] + region.invHomography[0][2] * P_img[2],
                        region.invHomography[1][0] * P_img[0] + region.invHomography[1][1] * P_img[1] + region.invHomography[1][2] * P_img[2],
                        region.invHomography[2][0] * P_img[0] + region.invHomography[2][1] * P_img[1] + region.invHomography[2][2] * P_img[2],
                    ];

                    if (Math.abs(P_map_h[2]) > 1e-9) { 
                        const lng = P_map_h[0] / P_map_h[2];
                        const lat = P_map_h[1] / P_map_h[2];
                        
                        if (bounds.contains(L.latLng(lat, lng))) {
                            const pixelValue = rasterData[r * imageWidth + c];
                            if (pixelValue !== null && pixelValue !== undefined && pixelValue !== -9999 && pixelValue !== 9999) { 
                                values.push(pixelValue);
                                pixelsFromThisRegion++;
                            }
                        }
                    } else {
                        // console.warn(`[${this.mapId}] Transformed w_h near zero for pixel (${c},${r}) in region ${region.name}`);
                    }
                }
            }
            console.log(`[${this.mapId}] Collected ${pixelsFromThisRegion} pixels from region ${region.name}. Total values so far: ${values.length}`);
        }
        console.log(`[${this.mapId}] Finished getValuesInBounds. Total collected values: ${values.length}`);
        return values;
    }
}

// 통계 관련 전역 변수 및 함수
let statisticsCharts = {}; // 생성된 차트 객체들을 저장 (맵 ID별로)

async function collectAndDisplayStatistics(bounds) {
    const statContainer = document.getElementById('statContainer');
    statContainer.innerHTML = ''; // 이전 차트 삭제
    statisticsCharts = {}; // 이전 차트 객체 참조 제거

    const allMapStats = {};

    for (const mapId in mapInstances) {
        const instance = mapInstances[mapId];
        const values = await instance.getValuesInBounds(bounds);
        if (values.length > 0) {
            allMapStats[mapId] = calculateStatistics(values, instance.tifUrl);
        } else {
            allMapStats[mapId] = null; // 데이터 없음
        }
    }
    displayStatisticsCharts(allMapStats);
}

function calculateStatistics(values, mapType) {
    if (values.length === 0) return null;

    let stats = {};

    if (mapType === 'species') {
        // 수종 데이터: 각 값의 빈도수 계산
        const counts = {};
        values.forEach(value => {
            counts[value] = (counts[value] || 0) + 1;
        });
        stats = { type: 'categorical', counts };
    } else {
        // 수치형 데이터 (DBH, Height, Carbon)
        const sortedValues = [...values].sort((a, b) => a - b);
        const min = sortedValues[0];
        const max = sortedValues[sortedValues.length - 1];
        const sum = values.reduce((acc, val) => acc + val, 0);
        const mean = sum / values.length;
        
        // 표준편차 (옵션)
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        // 히스토그램용 데이터 (옵션 - 더 정교한 구간 설정 필요)
        const numBins = 10;
        const binSize = (max - min) / numBins;
        const bins = Array(numBins).fill(0);
        const binLabels = [];
        for (let i = 0; i < numBins; i++) {
            const binStart = min + i * binSize;
            const binEnd = min + (i + 1) * binSize;
            binLabels.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);
            values.forEach(val => {
                if (val >= binStart && (val < binEnd || (i === numBins - 1 && val <= binEnd))) {
                    bins[i]++;
                }
            });
        }

        stats = {
            type: 'numerical',
            min,
            max,
            mean: parseFloat(mean.toFixed(2)),
            sum: parseFloat(sum.toFixed(2)),
            count: values.length,
            stdDev: parseFloat(stdDev.toFixed(2)),
            histogram: { labels: binLabels, data: bins }
        };
    }
    return stats;
}

function displayStatisticsCharts(allMapStats) {
    const statContainer = document.getElementById('statContainer');
    const summary = document.createElement('p');
    summary.innerHTML = `
            개수: ${allMapStats['dbh'].count*2.5*2.5   }m<sup>2</sup>
        `;
    statContainer.appendChild(summary);

    for (const mapId in allMapStats) {
        const stats = allMapStats[mapId];
        const mapInstance = mapInstances[mapId]; // Get the corresponding map instance for its tifUrl

        const chartDiv = document.createElement('div');
        chartDiv.style.marginBottom = '20px';
        const title = document.createElement('h4');
        title.textContent = `${mapInstance.tifUrl} 통계`; // mapId 대신 tifUrl 사용
        chartDiv.appendChild(title);

        if (!stats) {
            const noDataText = document.createElement('p');
            noDataText.textContent = '선택 영역 내 데이터가 없습니다.';
            chartDiv.appendChild(noDataText);
            statContainer.appendChild(chartDiv);
            continue;
        }

        const canvas = document.createElement('canvas');
        canvas.id = `chart-${mapId}`;
        chartDiv.appendChild(canvas);
        statContainer.appendChild(chartDiv);

        const ctx = canvas.getContext('2d');
        
        if (stats.type === 'categorical') {
            // 수종: 막대 차트
            const sortedCounts = Object.entries(stats.counts).sort((a, b) => b[1] - a[1]);
            const labels = sortedCounts.map(entry => entry[0]);
            const data = sortedCounts.map(entry => entry[1]);

            statisticsCharts[mapId] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels.map(label => tree_color_map[label]), // 수종 코드에 이름 매핑 필요시 추가
                    datasets: [{
                        label: '빈도수',
                        data: data,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)'
                    }]
                    
                },
                options: {
                    //scales: { y: { beginAtZero: true } },
                    //responsive: true,
                    //maintainAspectRatio: false,
                    scales: {
                        x: { // x축 설정
                            ticks: {
                                color: 'black',         // x축 라벨 색상
                                font: {
                                    size: 5,         // x축 라벨 폰트 크기
                                    family: 'Arial',  // x축 라벨 폰트
                                    //weight: 'bold'    // x축 라벨 폰트 두께
                                },
                                maxRotation: 0,      // 최대 45도까지 회전
                                minRotation: 0,      // 항상 45도로 회전 (겹침 방지)
                                // autoSkip: false,   // 모든 라벨을 표시 (공간이 좁으면 겹칠 수 있음)
                                padding: 10           // 라벨과 축 사이 간격
                            },
                            //title: { // x축 제목 (선택 사항)
                            //    display: true,
                            //    text: '월',
                            //    font: {
                            //        size: 16
                            //    }
                            //}
                        },
                        y: { // y축 설정
                            beginAtZero: true,
                            ticks: {
                                color: 'blue',        // y축 라벨 색상
                                font: {
                                    size: 12,         // y축 라벨 폰트 크기
                                    style: 'italic'   // y축 라벨 폰트 스타일
                                },
                                padding: 5
                            },
                            //title: { // y축 제목 (선택 사항)
                            //    display: true,
                            //    text: '판매량',
                            //    font: {
                            //        size: 16
                            //    }
                            //}
                        }
                    },
                    // 다른 옵션들...
                }
            });
        } else if (stats.type === 'numerical') {
            // DBH, Height, Carbon: 요약 통계 텍스트 + 히스토그램 (막대 차트)
            const summaryText = document.createElement('p');
            if ( mapId === 'dbh') {
                summaryText.innerHTML = `
                    min: ${stats.min.toFixed(2)}(cm)&ensp;&ensp;
                    max: ${stats.max.toFixed(2)}(cm)<br>
                    mean: ${stats.mean.toFixed(2)}(cm)&ensp;&ensp;
                    std: ${stats.stdDev.toFixed(2)}
                `;
            } else if ( mapId === 'height') {
                summaryText.innerHTML = `
                    min: ${stats.min.toFixed(2)}(m)&ensp;&ensp;
                    max: ${stats.max.toFixed(2)}(m)<br>
                    mean: ${stats.mean.toFixed(2)}(m)&ensp;&ensp;
                    std: ${stats.stdDev.toFixed(2)}
                `;
            } else if ( mapId === 'carbon') {
                summaryText.innerHTML = `
                    min: ${stats.min.toFixed(2)}(kg)&ensp;&ensp;
                    max: ${stats.max.toFixed(2)}(kg)<br>
                    mean: ${stats.mean.toFixed(2)}(kg)&ensp;&ensp;
                    sum: ${stats.sum.toFixed(2)}(kg)<br>
                    std: ${stats.stdDev.toFixed(2)}
                `;
            }
            chartDiv.insertBefore(summaryText, canvas); // 캔버스 위에 요약 텍스트 추가
            
            statisticsCharts[mapId] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: stats.histogram.labels,
                    datasets: [{
                        label: '빈도수',
                        data: stats.histogram.data,
                        backgroundColor: 'rgba(153, 102, 255, 0.6)'
                    }]
                },
                options: { scales: { y: { beginAtZero: true } } }
            });
        }
    }
}

// 비동기 초기화 함수
async function initializeMaps() {
    const geoJsonData = await loadGeoJSON();
    if (!geoJsonData) {
        console.error("Failed to load GeoJSON data. Maps cannot be initialized.");
        return;
    }

    mapInstances.species = new MapInstance('speciesMap', 'species', geoJsonData);
    mapInstances.dbh = new MapInstance('dbhMap', 'DBH', geoJsonData);
    mapInstances.height = new MapInstance('heightMap', 'height', geoJsonData);
    mapInstances.carbon = new MapInstance('carbonMap', 'carbon', geoJsonData);
    
    await Promise.all(Object.values(mapInstances).map(async (instance) => {
        await instance.drawTif();
        // instance.toggleGeoJsonOverlay(true); // 초기 GeoJSON 외곽 어둡게 처리 제거
    }));

    Object.values(mapInstances).forEach(instance => {
        // 모든 맵 동기화
        Object.values(mapInstances).forEach(otherInstance => {
            if (instance !== otherInstance) {
                instance.map.sync(otherInstance.map);
            }
        });
    });

    // 초기 맵 타이틀 크기 업데이트
    updateMapTitleSizes();
    // 창 크기 변경 시 맵 타이틀 크기 다시 계산
    window.addEventListener('resize', debounce(updateMapTitleSizes, 250));
    initializeGridCenter(); // 그리드 중심점 초기화
    // document.getElementById('tifBtn').addEventListener('click', ()=>{ // 이 리스너는 제거합니다.
    //     if (isDrawTif){
    //         Object.values(mapInstances).forEach((map,index) => {
    //             map.drawTif();
    //         });
    //         isDrawTif = false;
    //     } else {
    //         Object.values(mapInstances).forEach((map,index) => {
    //             map.eraseTif();
    //         });
    //         isDrawTif = true;
    //     }
    // });
    // statBtn 이벤트 리스너 추가
    document.getElementById('statBtn').addEventListener('click', () => {
        isDrawingMode = !isDrawingMode; // 그리기 모드 토글
        if (isDrawingMode) {
            firstClickLatLng = null; // 첫 번째 클릭 위치 초기화
            // 기존에 그려진 사각형 및 오버레이 제거
            Object.values(mapInstances).forEach(instance => {
                if (instance.drawnRectangle) {
                    instance.map.removeLayer(instance.drawnRectangle);
                    instance.drawnRectangle = null;
                }
                instance.toggleOutsideOverlay(false); // 어두운 배경 제거
            });
            // 이전 통계 차트 삭제
            const statContainer = document.getElementById('statContainer');
            statContainer.innerHTML = '';
            statisticsCharts = {}; 

            console.log("사각형 그리기 모드 활성화");
            document.getElementById('statBtn').textContent = '그리기 취소'; // 버튼 텍스트 변경
        } else {
            console.log("사각형 그리기 모드 비활성화 (취소 또는 완료)");
            document.getElementById('statBtn').textContent = '통계잡기'; // 버튼 텍스트 변경
            // 그리기 모드가 비활성화될 때(취소 시) 오버레이를 명시적으로 제거할 수 있습니다.
            // 사각형 그리기가 완료되어 비활성화되는 경우는 drawRectangleOnAllMaps에서 이미 오버레이를 표시합니다.
            // 사용자가 '그리기 취소'를 눌렀을 때를 구분해야 한다면 추가 로직이 필요합니다.
            // 현재는 '그리기 취소' 시에도 다음번 그리기를 위해 모든 오버레이가 위에서 정리됩니다.
            // 만약 '그리기 취소' 버튼을 눌렀을 때만 명시적으로 오버레이를 지우고 싶다면,
            // drawRectangleOnAllMaps가 호출되지 않은 경우, 즉 firstClickLatLng가 아직 있을때 (두번째 클릭 전 취소)
            // 또는 firstClickLatLng가 null이면서, 그려진 사각형이 없는 경우 (아무것도 안하고 취소)
            if (firstClickLatLng || !Object.values(mapInstances).some(inst => inst.drawnRectangle)){
                 Object.values(mapInstances).forEach(instance => {
                    instance.toggleOutsideOverlay(false); 
                });
            }
        }
    });
}

function updateMapTitleSizes() {   
    const maps = document.querySelectorAll('.map');
    const titles = document.querySelectorAll('.map-title');
    
    maps.forEach((map, index) => {
        const title = titles[index];
        const mapWidth = map.offsetWidth;
        const mapHeight = map.offsetHeight;
        
        // 지도 크기에 따라 폰트 크기 계산
        // 최소 크기는 8px, 최대 크기는 16px
        const fontSize = Math.min(16, Math.max(8, Math.min(mapWidth, mapHeight) * 0.05));
        
        // 패딩 크기도 비례해서 조정
        const padding = Math.max(2, fontSize * 0.3);
        
        title.style.fontSize = `${fontSize}px`;
        title.style.padding = `${padding}px ${padding * 2}px`;
    });
}

function initializeGridCenter() {
    const gridCenter = document.getElementById('gridCenter');
    const mapContainer = document.querySelector('.map-container');
    const maps = document.querySelectorAll('.map');

    // 초기 중심점 위치 설정
    gridCenter.style.left = '50%';
    gridCenter.style.top = '50%';

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    // 드래그 시작
    gridCenter.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(gridCenter.style.left);
        startTop = parseInt(gridCenter.style.top);
        document.body.style.cursor = 'move';
        gridCenter.classList.add('collapsed');
    });

    // 드래그 중
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        // 새로운 중심점 위치 계산
        const newLeft = Math.max(5, Math.min(95, startLeft + (deltaX / mapContainer.offsetWidth) * 100));
        const newTop = Math.max(5, Math.min(95, startTop + (deltaY / mapContainer.offsetHeight) * 100));

        // 중심점 위치 업데이트
        gridCenter.style.left = `${newLeft}%`;
        gridCenter.style.top = `${newTop}%`;

        // 그리드 템플릿 업데이트
        mapContainer.style.gridTemplateColumns = `${newLeft}% ${100 - newLeft}%`;
        mapContainer.style.gridTemplateRows = `${newTop}% ${100 - newTop}%`;
        updateMapTitleSizes();
        
    });

    // 드래그 종료
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = 'default';
            
            // 모든 지도 크기 재조정
            //invalidateAllMapSizes();
            // 각 지도 크기 재조정
            gridCenter.classList.remove('collapsed');
            setTimeout(() => {
                updateMapTitleSizes();
            }, 300);
        
        }
        Object.values(mapInstances).forEach((map,index) => {
            if (map.map) {
                setTimeout(() => { map.map.invalidateSize();}, 300);
            }
        });
    });
}

// 맵 초기화 실행
initializeMaps().then(initializedMapInstances => {
    //mapInstances = initializedMapInstances;
    initializeGridCenter(); // 그리드 중심점 초기화
    updateMapTitleSizes();
    // isDrawTif = false; // 이 라인을 제거합니다. drawTif()가 호출되었으므로 isDrawTif는 true 상태입니다.
});

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 모든 맵의 크기를 재조정하고 타일을 다시 로드하는 함수
function invalidateAllMapSizes() {
    if (!mapInstances) return;
    
    // 각 지도 크기 재조정
    Object.values(mapInstances).forEach((map,index) => {
        if (map.map) {
            map.map.invalidateSize();
        }
    });
}

// 1. 윈도우 리사이즈 시 맵 크기 재조정 (디바운스 적용)
const debouncedInvalidateSizes = debounce(invalidateAllMapSizes, 250); // 250ms 간격으로 실행
window.addEventListener('resize', debouncedInvalidateSizes);

// 슬라이더 제어
const sliderToggle = document.getElementById("sliderToggle");
const sliderContainer = document.getElementById("sliderContainer");
let isSliderOpen = true;
const floatingButtons = document.getElementById("floatingButtons");

sliderToggle.addEventListener('click', () => {
    isSliderOpen = !isSliderOpen;
    sliderContainer.classList.toggle('collapsed');
    sliderToggle.classList.toggle('collapsed');
    floatingButtons.classList.toggle('collapsed'); // 플로팅 버튼 위치 조정
    sliderToggle.textContent = isSliderOpen ? '◀' : '▶';
    setTimeout(() => {
        console.log("Slider toggled, invalidating map sizes.");
        invalidateAllMapSizes();
    }, 300); // 예: CSS transition이 0.3s라면 300ms
});


// 플로팅 버튼 이벤트 리스너
document.querySelectorAll('.floating-sub').forEach((button, index) => {
    button.addEventListener('click', () => {
        console.log(`Sub button ${index + 1} clicked`);
        // 여기에 각 버튼의 기능을 추가할 수 있습니다
        if (index === 0) {
            mapInstances.species.map.fitBounds(
                L.latLngBounds([...mapInstances.species.points["jiri_1"], ...mapInstances.species.points["jiri_2"]]),
                {animate: true, duration: 0.7}
            );
        }
        if (index === 1) {
            mapInstances.dbh.map.fitBounds(
                L.latLngBounds(mapInstances.species.imageBounds_sobaek),
                {animate: true, duration: 0.7}
            );
        }
        
    });
});

// 초기 버튼 텍스트 설정: TIF가 켜져 있으므로, 다음 클릭 시 TIF를 끄도록 "Tif Off"로 설정합니다.
document.getElementById('tifBtn').textContent = 'Tif Off'; 

document.getElementById('tifBtn').addEventListener('click', () => {
    if (isDrawTif) { // 현재 TIF가 켜져 있다면
        Object.values(mapInstances).forEach((map, index) => {
            map.eraseTif(); // TIF를 끈다
        });
        isDrawTif = false; // 상태 업데이트: TIF 꺼짐
        document.getElementById('tifBtn').textContent = 'Tif On'; // 버튼 텍스트 변경: 다음 클릭 시 TIF 켜기
    } else { // 현재 TIF가 꺼져 있다면
        Object.values(mapInstances).forEach((map, index) => {
            map.drawTif(); // TIF를 켠다
        });
        isDrawTif = true; // 상태 업데이트: TIF 켜짐
        document.getElementById('tifBtn').textContent = 'Tif Off'; // 버튼 텍스트 변경: 다음 클릭 시 TIF 끄기
    }
});
