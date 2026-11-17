

* **기존 데이터와의 충돌 및 런타임 변경 필요 사항:**
1. `boss.js` / `encounters.js`는 현재 `BOSS_NAMES` 3종(`철갑 채굴자`, `수정 파수꾼`, `공허 수호자`) 순환만 지원하므로, 구역 4·5용 신규 보스 2종(`boss_gravity`, `boss_solar`)을 웨이브 매핑 로직에 추가해야 합니다.


2. 신규 영구 연구 2종(`res_launch_03` 치명타 확률, `res_launch_04` 웨이브 광석 보상 단리 증가)은 현재 `workshop.js`의 `getWorkshopEffects()`에 필드가 없으므로 `requiresRuntimeChange: true`로 표시했습니다.


3. 캠페인 과제 중 `activeSkillLinks`와 `totalResearchLevels`는 기존 상태 객체에서 파생 계산(Derived Metric)하는 헬퍼 추가가 필요합니다.




* **과제 중복 및 막힘 위험 검토:**
* 기존 영구 목표 7개(`wave-20`, `wave-30`, `skills-15`, `merge-5`, `boss-10`, `ore-50k`)와 일부 지표가 유사하나, 캠페인은 **5구역 × 6단계 순차 진행**이며 보상이 외형(`route_launch_08..14`) 및 단발 재료로 분리되어 중복 수령 위험이 없습니다.


* 모든 모듈 과제(`drillOre`, `lanceKills`, `syncBosses`)는 `voyage`가 아닌 `lifetime` 누적 지표를 사용하여 프레스티지 초기화로 인한 진행 막힘을 원천 차단했습니다.


* 스킬 연계 과제(`campaign_14`, `campaign_22`)는 N/R 등급 조합만 요구하므로 SR/UR 뽑기 운에 의존하지 않습니다.




* **가독성 및 검증 주의:**
* `320px` 초소형 모바일 뷰포트에서 `resources.statsLine`의 영어/일본어 문자열이 2~3줄로 줄바꿈될 수 있으므로 CSS `overflow-wrap: anywhere`와 상단 패널 패딩 축소(`@media (max-width: 360px)`)를 유지해야 합니다.


* *검증 구분:* **문서 검토만 수행**했으며, 신규 6스킬·2연구가 추가된 상태의 30일 시뮬레이션은 Codex 통합 후 재실행해야 합니다.





---
