// 지도 초기화
const map = L.map("map").setView([37.5665, 126.978], 13); // 서울 중심 좌표

// OpenStreetMap 타일 레이어 추가
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}); //.addTo(map);

// Esri WorldImagery 타일 레이어 추가
L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        attribution:
            "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    }
).addTo(map);

let geojsonLayer_sobaek = null;
let geojsonLayer_jiri = null;

// GeoJSON 데이터 로드 및 표시 함수
async function loadGeoJSON(option) {
    try {
        if (option === "On") {
            const response_jiri = await fetch(geojson_jiri);
            const response_sobaek = await fetch(geojson_sobaek);

            const data_jiri = await response_jiri.json();
            const data_sobaek = await response_sobaek.json();

            // GeoJSON 레이어 생성 및 스타일 지정
            geojsonLayer_jiri = L.geoJSON(data_jiri, {
                style: {
                    color: "#3388ff",
                    weight: 2,
                    fillOpacity: 0.1,
                },
            }).addTo(map);
            geojsonLayer_sobaek = L.geoJSON(data_sobaek, {
                style: {
                    color: "#3388ff",
                    weight: 2,
                    fillOpacity: 0.1,
                },
            }).addTo(map);

            // GeoJSON 레이어의 경계에 맞게 지도 뷰 조정
            const bounds = L.latLngBounds([
                geojsonLayer_jiri.getBounds().getSouthWest(),
                geojsonLayer_jiri.getBounds().getNorthEast(),
                geojsonLayer_sobaek.getBounds().getSouthWest(),
                geojsonLayer_sobaek.getBounds().getNorthEast(),
            ]);
            map.fitBounds(bounds);

        } else {
            map.removeLayer(geojsonLayer_jiri);
            map.removeLayer(geojsonLayer_sobaek);
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
        console.log('성공',geojsonLayer_sobaek.getBounds());
    })
    .catch((error) => {
        console.error("GeoJSON 로드 중 오류 발생:", error);
    });


// 전역 변수로 현재 표시된 TIF 레이어를 추적
let currentTifLayer_sobaek = null;
let currentTifLayer_jiri_1 = null;
let currentTifLayer_jiri_2 = null;

// TIF 파일을 로드하고 표시하는 함수
async function loadTifFile(option) {
    try {
        // 이전 레이어가 있다면 제거
        if (option === "On") {
            // GeoTIFF 파일 로드
            const response_jiri_1 = await fetch(orig_jiri_1);
            const response_jiri_2 = await fetch(orig_jiri_2);
            const response_sobaek = await fetch(orig_sobaek);

            const arrayBuffer_jiri_1 = await response_jiri_1.arrayBuffer();
            const arrayBuffer_jiri_2 = await response_jiri_2.arrayBuffer();
            const arrayBuffer_sobaek = await response_sobaek.arrayBuffer();

            const tiff_jiri_1 = await GeoTIFF.fromArrayBuffer(arrayBuffer_jiri_1);
            const tiff_jiri_2 = await GeoTIFF.fromArrayBuffer(arrayBuffer_jiri_2);
            const tiff_sobaek = await GeoTIFF.fromArrayBuffer(arrayBuffer_sobaek);

            // 첫 번째 이미지 가져오기
            const image_jiri_1 = await tiff_jiri_1.getImage();
            const image_jiri_2 = await tiff_jiri_2.getImage();
            const image_sobaek = await tiff_sobaek.getImage();

            // const bbox = geojsonLayer_sobaek.getBounds()//image.getBoundingBox();
            const bounds_sobaek = geojsonLayer_sobaek.getBounds();
            const bbox_sobaek = [
                bounds_sobaek.getSouthWest().lng,
                bounds_sobaek.getSouthWest().lat,
                bounds_sobaek.getNorthEast().lng,
                bounds_sobaek.getNorthEast().lat,
            ];
            const bounds_jiri = geojsonLayer_jiri.getBounds();
            const bbox_jiri_1 = [
                bounds_jiri.getSouthWest().lng,
                bounds_jiri.getSouthWest().lat,
                (bounds_jiri.getNorthEast().lng+bounds_jiri.getSouthWest().lng)/2,   
                bounds_jiri.getNorthEast().lat,
            ];
            const bbox_jiri_2 = [
                (bounds_jiri.getNorthEast().lng+bounds_jiri.getSouthWest().lng)/2,  
                bounds_jiri.getSouthWest().lat,
                bounds_jiri.getNorthEast().lng,
                bounds_jiri.getNorthEast().lat,
            ];


            // 이미지 데이터 가져오기
            const rasters_sobaek = await image_sobaek.readRasters();
            const width_sobaek = image_sobaek.getWidth();
            const height_sobaek = image_sobaek.getHeight();

            const rasters_jiri_1 = await image_jiri_1.readRasters();
            const width_jiri_1 = image_jiri_1.getWidth();
            const height_jiri_1 = image_jiri_1.getHeight();

            const rasters_jiri_2 = await image_jiri_2.readRasters();
            const width_jiri_2 = image_jiri_2.getWidth();
            const height_jiri_2 = image_jiri_2.getHeight();

            // Canvas 생성
            const canvas_sobaek = document.createElement("canvas");
            canvas_sobaek.width = width_sobaek;
            canvas_sobaek.height = height_sobaek;
            const ctx_sobaek = canvas_sobaek.getContext("2d");

            const canvas_jiri_1 = document.createElement("canvas");
            canvas_jiri_1.width = width_jiri_1;
            canvas_jiri_1.height = height_jiri_1;
            const ctx_jiri_1 = canvas_jiri_1.getContext("2d");

            const canvas_jiri_2 = document.createElement("canvas");
            canvas_jiri_2.width = width_jiri_2;
            canvas_jiri_2.height = height_jiri_2;
            const ctx_jiri_2 = canvas_jiri_2.getContext("2d");

            // 이미지 데이터를 Canvas에 그리기
            const imageData_sobaek = ctx_sobaek.createImageData(width_sobaek, height_sobaek);
            const imageData_jiri_1 = ctx_jiri_1.createImageData(width_jiri_1, height_jiri_1);
            const imageData_jiri_2 = ctx_jiri_2.createImageData(width_jiri_2, height_jiri_2);

            const data_sobaek = imageData_sobaek.data;
            const data_jiri_1 = imageData_jiri_1.data;
            const data_jiri_2 = imageData_jiri_2.data;

            // 그레이스케일 이미지 처리
            for (let i = 0; i < width_sobaek * height_sobaek; i++) {
                
                const rgba = hexToRgba(rasters_sobaek[0][i]);
                data_sobaek[i * 4] = rgba.r; // R
                data_sobaek[i * 4 + 1] = rgba.g; // G
                data_sobaek[i * 4 + 2] = rgba.b; // B
                data_sobaek[i * 4 + 3] = rgba.a; // A
            }

            for (let i = 0; i < width_jiri_1 * height_jiri_1; i++) {
                const rgba = hexToRgba(rasters_jiri_1[0][i]);
                data_jiri_1[i * 4] = rgba.r; // R
                data_jiri_1[i * 4 + 1] = rgba.g; // G
                data_jiri_1[i * 4 + 2] = rgba.b; // B
                data_jiri_1[i * 4 + 3] = rgba.a; // A
            }

            for (let i = 0; i < width_jiri_2 * height_jiri_2; i++) {
                const rgba = hexToRgba(rasters_jiri_2[0][i]);
                data_jiri_2[i * 4] = rgba.r; // R
                data_jiri_2[i * 4 + 1] = rgba.g; // G
                data_jiri_2[i * 4 + 2] = rgba.b; // B    
                data_jiri_2[i * 4 + 3] = rgba.a; // A
            }

            ctx_sobaek.putImageData(imageData_sobaek, 0, 0);
            ctx_jiri_1.putImageData(imageData_jiri_1, 0, 0);
            ctx_jiri_2.putImageData(imageData_jiri_2, 0, 0);

            // Canvas를 이미지 URL로 변환
            const imageUrl_sobaek = canvas_sobaek.toDataURL();
            const imageUrl_jiri_1 = canvas_jiri_1.toDataURL();
            const imageUrl_jiri_2 = canvas_jiri_2.toDataURL();  

            // Leaflet 이미지 오버레이 생성
            const imageBounds_sobaek = [
                [bbox_sobaek[1], bbox_sobaek[0]],
                [bbox_sobaek[3], bbox_sobaek[2]],
            ];
            const imageBounds_jiri_1 = [
                [bbox_jiri_1[1], bbox_jiri_1[0]],
                [bbox_jiri_1[3], bbox_jiri_1[2]],
            ];
            const imageBounds_jiri_2 = [
                [bbox_jiri_2[1], bbox_jiri_2[0]],
                [bbox_jiri_2[3], bbox_jiri_2[2]],
            ];  
            currentTifLayer_sobaek = L.imageOverlay(imageUrl_sobaek, imageBounds_sobaek, {
                opacity: 0.7,
            }).addTo(map);
            currentTifLayer_jiri_1 = L.imageOverlay(imageUrl_jiri_1, imageBounds_jiri_1, {
                opacity: 0.7,
            }).addTo(map);
            currentTifLayer_jiri_2 = L.imageOverlay(imageUrl_jiri_2, imageBounds_jiri_2, {
                opacity: 0.7,
            }).addTo(map);  

            // 지도 뷰를 TIF 이미지 영역으로 조정
            //map.fitBounds(imageBounds);

            console.log("TIF 파일 로드 완료:", {
                width_sobaek,
                height_sobaek,
                bbox_sobaek,
                imageBounds_sobaek,
            });
        }
        else {
            map.removeLayer(currentTifLayer_sobaek);
            map.removeLayer(currentTifLayer_jiri_1);
            map.removeLayer(currentTifLayer_jiri_2);
        }


    } catch (error) {
        console.error("TIF 파일 로드 중 오류 발생:", error);
    }
}

// Radio button 이벤트 리스너 설정
document.querySelectorAll('input[name="origTifLayer"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
        if (e.target.checked) {
            // 실제 TIF 파일 경로로 수정해주세요
            loadTifFile(e.target.value);
        }
    });
});
