# CapstoneDesign-ForestCarbonAi

캡스톤디자인 레포지토리입니다.  

# 논문
From Coarse to Crisp: Enhancing Tree Species Maps with Deep Learning and Satellite Imagery
**[[Paper 바로가기](https://www.mdpi.com/2072-4292/17/13/2222)]**  
Journal: MDPI remote sensing Q1

### 논문 개요
- 탄소중립 전략의 핵심자원인 수림의 탄소포집량 계산을 위해 중요한 수종 정보는 필수적입니다.  
- 기존 임상도의 수종 지도 해상도는 30m로 낮으며, 전수조사가 어려워 조사된 지역 이외에는 부정확성을 띕니다.  
- 또한, 현장조사과 항공사진판독은 높은 비용, 노동집약적입니다.  
- 이러한 한계점을 위성영상과 딥러닝을 통해 해결하고자 합니다.
### 논문 방법론
<img width="300" alt="Image" src="https://github.com/user-attachments/assets/7b6fe936-aca7-4bb1-a9c8-5da2114258b8"/>   
  
  - 2.5m로 super-resolution한 위성영상( Planet scope, Sentinel-2 )을 입력받고,  
- 기존 임상도의 수종지도를 'weak label'로 활용하여 수종분류 모델을 지도학습합니다.  
- 이후 학습된 모델을 통해 2.5m의 고해상도의 수종지도를 만들어냅니다. 

# 캡스톤 프로젝트
### 프로젝트 개요
- 최근 탄소배출량관련 정책(i.g. 탄소중립2050)들이 대두되고 있습니다.  
- 이러한 정책들의 의사결정을 위해 정확한 산림 인벤토리 정보가 필요합니다.
- 해당 프로젝트는 산림 인벤토리 중 산림 정보에 주목하였습니다.
  
### 프로젝트 방법론
- 수종과 DBH(흉고직경), 수고의 예측을 통해 산림의 탄소저장량을 계산합니다.

### 프로젝트 포스터
<img width="400" alt="Image" src="https://github.com/user-attachments/assets/d11968fe-87aa-45a3-9350-b0d3049f6e74" />  
  
### DemoPage *PC 버전으로 10초 정도의 로딩시간이 필요합니다.  
👉[수종비교 바로가기](https://seungpyo-jeon.github.io/CapstoneDesign-ForestCarbonAi/DemoPage/compareSpecies.html)   
- 기존 임상도와 개선된 임상도의 구분을 확인할 수 있는 데모 페이지입니다.
👉[탄소량 계산 바로가기](https://seungpyo-jeon.github.io/CapstoneDesign-ForestCarbonAi/DemoPage/multiMap.html)  
- 예측된 수종, DBH, 수고의 예측을 한눈에 보고, 이를 바탕으로 예측된 탄소저장량을 확인 할 수 있는 페이지 입니다.
