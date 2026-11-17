# Gemini 전달용 프롬프트

아래 본문을 Gemini의 기존 Auto Drill Galaxy 대화에 붙여넣고,
`npm run gemini:brief`가 생성하는 `tools/handoffs/gemini-release-context.txt`를 첨부한다.
첨부 파일은 허용한 게임 코드와 출시 문서만 포함하며 비밀 키/개인 파일은 포함하지 않는다.
이번 작업은 **초안 요청용 프롬프트 작성**까지다. Gemini에 전송하거나 답변을 받은 것으로 표시하지 않는다.

---

당신은 Auto Drill: Galaxy의 아트 디렉션·게임 콘텐츠·한영일 문구 초안을 맡습니다.
첨부 컨텍스트의 실제 코드와 `RELEASE_SCOPE_V1.md`, `VISUAL_ASSET_PLAN.md`, `LOCALIZATION_PLAN.md`,
`MONTHLY_BALANCE_REVIEW.md`를 우선 읽으세요. 개발 통합·밸런스 시뮬레이션·오류 처리·최종 채택은 Codex가 합니다.
읽지 않은 스킬이나 실행하지 않은 테스트를 실행/확인했다고 말하지 마세요.

이미 확정한 범위를 늘리지 말고, 아래의 **데이터/문구 파일만** 작성하세요.
HTML/JS/Swift/SDK 코드, 이미지 파일, 유료 도구 사용, 대규모 설계 재작성은 요청하지 않습니다.

프로젝트 제약:

- Windows에서 Vite+Capacitor 게임 개발, Mac mini에서 StoreKit/AdMob/UMP·iPhone·TestFlight 검증.
- 자체 서버/계정/출석 리셋 없이 iOS 먼저 출시. 광고를 보거나 결제하지 않아도 전체 캠페인 완주 가능.
- 하루 2회×5~8분, 약 30일 분량. 빠른 사용자는 일찍 끝내도 됨. 날짜 잠금·연속 출석 손실 없음.
- 5구역×6개 = 신규 순차 캠페인 과제 30개. 기존 영구 목표 7개·항해 계약 3종은 별도 유지.
- 기존 스킬 12→총18, 연계 3→총6, 보스 3→총5(각2단계), 모듈3 유지, 영구 연구2→총4(각5레벨), 무료 항로 외형7→총15.
- 유료 상품은 광고 제거와 서포터 함선 색상3종 묶음. 유료 능력치·가챠·에너지·구독·배틀패스 없음.
- 언어는 ko/en/ja 동시 출시. 기존 stable ID/매개변수/의미를 바꾸지 않음. 추후 15언어를 위해 이미지에 글자 넣지 않음.
- 그래픽 고도화는 나중. 지금은 ‘네온 궤도 채굴’: 네이비/청록 중심의 읽기 쉬운 도형과 짧은 피드백.
- 기준선: 표준 30일 무광고 모델 최고 W 중앙값 40, W40 도달 채굴18/20·전투17/20·균형15/20. 모델과 리텐션을 혼동하지 마세요.

다음 5개 결과를 경로와 완전한 내용으로 주세요. 길면 번호 순서로 나누고 다음 파일부터 계속하세요.

**1. `art_direction.md`**

승인된 스타일을 유지하면서 구역5·보스5의 실루엣/문양/색조/단계 변화, 희귀도와 재화의 형태 규칙,
화면이 복잡해지지 않는 연출 제한을 표로 정리하세요. 생성용 짧은 프롬프트도 구역별 1개, 보스별 1개씩만 주세요.
그래픽을 직접 생성하지 마세요. 브랜드·유명 게임·작가 모방 지시 없이 독자적인 형태로 설명하세요.

**2. `asset_catalog.tsv`**

열: `id`, `category`, `priority`, `format`, `sourceSize`, `usage`, `silhouette`, `color`, `motionFallback`.
시각 논리 에셋 수는 정확히76개: 함선4·소행성3·보스5·배경5·재화6·스킬18·모듈3·연구4·UI12·항로15·앱아이콘1.
ID와 단위는 첨부 계획을 따르세요. 합성 가능한 색상/선 변형을 별도 고해상도 파일로 부풀리지 마세요.
사운드는 기존 코드 합성음으로 확정했으므로 음악/성우/유료 사운드 팩은 추가하지 마세요.

**3. `campaign_ko_en_ja.json`**

루트 `{ "schemaVersion":1, "sectors": [...], "missions": [...] }`.
구역 id는 `sector_01`~`sector_05`, 과제 id는 `campaign_01`~`campaign_30`.
구역마다 `id`, `order`, `name:{ko,en,ja}`, `description:{ko,en,ja}`.
과제마다 `id`, `sectorId`, `order`, `prerequisiteId`(첫 과제는 null),
`title:{ko,en,ja}`, `description:{ko,en,ja}`, `metric`, `target`, `scope`, `retroactive`,
`moduleId`(불필요시 null), `reward`, `designReason`, `estimatedSessionRange`.
숫자는 추정임을 designReason에 명시하고 reward는 가능한 기존 재료/유물 또는 항로 외형 ID만 사용하세요.
기존 지표는 `bestWave`, `runs`, `skills`, `merges`, `bosses`, `activeOre`, `drillOre`, `lanceKills`, `syncBosses`를 참조할 수 있습니다.
새 지표가 꼭 필요하면 임의 구현을 전제하지 말고 `requiresNewMetric:true`와 집계/저장/초기화 정의를 추가하세요.
scope는 `lifetime` 또는 `voyage`; voyage 과제에는 초기화로 막히지 않는 대체 조건을 명시하세요.
과제별 고유 새 규칙을 30개 만들지 마세요. 적은 규칙으로 조합하되 같은 숫자만 키우는 반복은 피하세요.
희귀 뽑기/광고/결제/연속 출석을 필수 조건으로 넣지 마세요. 목표·보상 수령·성능 효과는 중복 적용하지 않습니다.

**4. `content_additions_ko_en_ja.json`**

새로운 항목만: 스킬6·연계3·보스2(각2단계)·연구2(각5레벨)·무료 항로8·서포터 추가 색상2.
모든 항목에 stable `id`, `name:{ko,en,ja}`, `description:{ko,en,ja}`를 두세요.
기존 12스킬/3보스/7항로/모듈/연구의 ID를 재사용해 덮어쓰지 마세요.
신규 스킬 ID는 `sk_launch_01`~`sk_launch_06`, 보스는 `boss_gravity`, `boss_solar`,
연구는 `res_launch_03`, `res_launch_04`, 항로는 `route_launch_08`~`route_launch_15`를 사용하세요.
신규 스킬은 현 가산식(miningBonus, damageBonus, critBonus)에 맞는 수치/weight 초안과 rarity,
계열을 주고 영구 무제한 승수는 제안하지 마세요. 연계는 서로 다른 스킬2개/고정 상한을 명시하세요.
새 보스는 기존 체력50% 단계 방식 안에서 만들고 모듈 전환 없이도 클리어 가능해야 합니다.
새 연구는 기존 효과와 차이를 설명하고 정의되지 않은 효과에는 `requiresRuntimeChange:true`를 명시하세요.
항로 보상은 외형만, 유료 색상은 무료 항로 빔/고리와 동시 적용 가능해야 합니다.

**5. `ui_ko_en_ja.json`와 `review.md`**

`ui_ko_en_ja.json`은 `{ko:{key:string},en:{key:string},ja:{key:string}}` 형식으로,
첨부 소스의 실제 UI/동적 메시지에서 추출한 문구를 공통 키로 번역하세요.
범주: navigation/settings/tutorial/resources/skills/modules/research/bosses/campaign/expeditions/routes/save/errors/shop/ads/privacy.
플레이스홀더는 세 언어에서 동일하게 `{amount}`, `{wave}`, `{name}`, `{seconds}` 등을 사용하세요.
원문 매핑이 모호하면 review.md에 남기고 임의로 구매/보상 정책을 바꾸지 마세요.
신규 콘텐츠 ID는 별도 콘텐츠 JSON에 있으므로 UI JSON과 중복 관리하지 마세요.
긴 버튼 문구 대신 짧은 행동명+별도 설명을 권장하되 구매·광고·초기화 안내 의미를 생략하지 마세요.

`review.md`에는 누락/모호한 원문, 기존 데이터와 충돌, 필요한 새 런타임/저장 지표,
과제 중복/막힘 위험, 드롭 운에 의존하는 조건, 320px/일본어/영어 확장 가독성, 미검증 수치를 적으세요.
수치가 시뮬레이션됐거나 한 달 재미·광고/IAP 전환이 증명됐다고 주장하지 마세요.

끝으로 수량과 한영일 키/플레이스홀더 일치 여부를 자체 점검하되,
실제 스크립트를 실행하지 않았다면 ‘문서 검토만 수행’이라고 구분하세요.
