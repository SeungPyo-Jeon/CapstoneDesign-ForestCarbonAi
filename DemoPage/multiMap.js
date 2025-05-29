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
        this.initMap();
    }
    initMap() {
        this.map = L.map(this.mapId, {
            center: [37.5665, 126.9780], // 서울 중심 좌표
            zoom: 13,
            zoomControl: false,
            attributionControl: false,
            offsetHeight: 1
        });
    
        // 기본 타일 레이어 추가
        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            { 
                //attribution: '© OpenStreetMap contributors'

          }).addTo(this.map);
        // Esri WorldImagery 타일 레이어 추가
        L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { 
            // attribution: '© Esri'
         }).addTo(this.map);
        this.setImageBounds(this.points);
        //if (this.tifUrl == 'height'){
        //    console.log('height',this.tifUrl);
        //    this.initBuildingLayer();
        //}
        
    }
    setImageBounds(points){
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
        if (this.currentTifLayer_sobaek && this.currentTifLayer_sobaek.getBounds().contains(latlng)) {
            return 'sobaek';
        } else if (this.currentTifLayer_jiri_1 && this.currentTifLayer_jiri_1.getBounds().contains(latlng)) {
            return 'jiri_1';
        } else if (this.currentTifLayer_jiri_2 && this.currentTifLayer_jiri_2.getBounds().contains(latlng)) {
            return 'jiri_2';
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

        try {
            let rasters = null;
            if (targetRegion == 'jiri_1'){
                rasters = this.imageRaster_jiri_1;
            } else if (targetRegion == 'jiri_2'){
                rasters = this.imageRaster_jiri_2;
            } else if (targetRegion == 'sobaek'){
                rasters = this.imageRaster_sobaek;
            }
            // Use the specific bounds for the targetRegion of this map instance
            const currentRegionBounds = this.points[targetRegion]; 
            if (!currentRegionBounds || currentRegionBounds.length < 4) {
                console.error("Bounds for region", targetRegion, "not found or invalid in this.points");
                return null;
            }

            const minLat = Math.min(currentRegionBounds[0].lat, currentRegionBounds[1].lat, currentRegionBounds[2].lat, currentRegionBounds[3].lat);
            const maxLat = Math.max(currentRegionBounds[0].lat, currentRegionBounds[1].lat, currentRegionBounds[2].lat, currentRegionBounds[3].lat);
            const minLng = Math.min(currentRegionBounds[0].lng, currentRegionBounds[1].lng, currentRegionBounds[2].lng, currentRegionBounds[3].lng);
            const maxLng = Math.max(currentRegionBounds[0].lng, currentRegionBounds[1].lng, currentRegionBounds[2].lng, currentRegionBounds[3].lng);
            
            // Assuming TIF image dimensions are consistently 3600x3600 as per previous user edits
            const width = 3600; 
            const height = 3600;
            
            const x = Math.floor((latlng.lng - minLng) / (maxLng - minLng) * width);
            const y = Math.floor((maxLat - latlng.lat) / (maxLat - minLat) * height);
            
            if (x >= 0 && x < width && y >= 0 && y < height && rasters[0] && rasters[0][y * width + x] !== undefined) {
                return rasters[0][y * width + x];
            }
            return null; // Value not found or out of bounds
        } catch (error) {
            console.error(`Error getting pixel value for ${this.mapId} at ${targetRegion}:`, error);
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
        
        // 새 마커 추가
        this.currentMarker = L.marker(latlng)
            .bindPopup(`값: ${value}`)
            .addTo(this.map)
            .openPopup();
        console.log('Marker shown at:', latlng, 'with value:', value, 'on map:', this.mapId);
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

    async getValuesInBounds(bounds, sampleStep = 10) {
        const values = [];
        const latLngsToSample = [];

        // 바운딩 박스 내에서 샘플링할 좌표 생성
        const northEast = bounds.getNorthEast();
        const southWest = bounds.getSouthWest();

        for (let lat = southWest.lat; lat <= northEast.lat; lat += (northEast.lat - southWest.lat) / sampleStep) {
            for (let lng = southWest.lng; lng <= northEast.lng; lng += (northEast.lng - southWest.lng) / sampleStep) {
                latLngsToSample.push(L.latLng(lat, lng));
            }
        }
        if (latLngsToSample.length > 5000) { // 너무 많은 샘플 방지 (최대 5000개)
            console.warn("Too many samples requested, limiting to 5000 points for performance.");
            // 샘플링 간격 조정 또는 사용자에게 알림
            // 여기서는 단순화를 위해 처음 5000개만 사용하도록 제한하거나, sampleStep을 동적으로 늘릴 수 있습니다.
            // 혹은 사용자에게 경고 후 일부만 처리
        }

        for (const latlng of latLngsToSample.slice(0, 5000)) {
            const region = this.determineRegionForLatLng(latlng);
            if (region) {
                const value = await this.getPixelValueAtLatLng(latlng, region);
                if (value !== null && value !== undefined && value !== -9999 && value !== 9999) { // 유효한 값만 추가 (TIF의 NoData 값 제외)
                    values.push(value);
                }
            }
        }
        console.log(`[${this.mapId}] Sampled ${values.length} values from bounds.`);
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
        const values = await instance.getValuesInBounds(bounds, 20); // sampleStep 늘려서 샘플 수 줄임 (성능)
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

    for (const mapId in allMapStats) {
        const stats = allMapStats[mapId];
        const mapInstance = mapInstances[mapId]; // Get the corresponding map instance for its tifUrl

        const chartDiv = document.createElement('div');
        chartDiv.style.marginBottom = '20px';
        const title = document.createElement('h4');
        title.textContent = `${mapInstance.tifUrl.toUpperCase()} 통계`; // mapId 대신 tifUrl 사용
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
            const labels = Object.keys(stats.counts);
            const data = Object.values(stats.counts);
            statisticsCharts[mapId] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels.map(label => `수종 ${label}`), // 수종 코드에 이름 매핑 필요시 추가
                    datasets: [{
                        label: '빈도수',
                        data: data,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)'
                    }]
                },
                options: { scales: { y: { beginAtZero: true } } }
            });
        } else if (stats.type === 'numerical') {
            // DBH, Height, Carbon: 요약 통계 텍스트 + 히스토그램 (막대 차트)
            const summaryText = document.createElement('p');
            summaryText.innerHTML = `
                개수: ${stats.count}<br>
                최소: ${stats.min.toFixed(2)}<br>
                최대: ${stats.max.toFixed(2)}<br>
                평균: ${stats.mean.toFixed(2)}<br>
                합계: ${stats.sum.toFixed(2)}<br>
                표준편차: ${stats.stdDev.toFixed(2)}
            `;
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
    initializeGridCenter(); // 그리드 중심점 초기화 및 이벤트 핸들러 연결
    document.getElementById('tifBtn').addEventListener('click', ()=>{
        if (isDrawTif){
            Object.values(mapInstances).forEach((map,index) => {
                map.drawTif();
            });
            isDrawTif = false;
        } else {
            Object.values(mapInstances).forEach((map,index) => {
                map.eraseTif();
            });
            isDrawTif = true;
        }
    });
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
    isDrawTif = false;
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

document.getElementById('tifBtn').addEventListener('click', () => {
    if (isDrawTif){
        Object.values(mapInstances).forEach((map,index) => {
                map.drawTif();
        });
        isDrawTif = false;
    } else {
        Object.values(mapInstances).forEach((map,index) => {
            map.eraseTif();
        });
        isDrawTif = true;
    }
    document.getElementById('tifBtn').textContent = isDrawTif ? 'Tif On' : 'Tif Off';
});