# Auto Drill: Galaxy

`Auto Drill: Galaxy`는 iOS 우선 출시를 목표로 하는 기본 무료 IAP + IAA 하이브리드 캐주얼 게임입니다. HTML5 게임을 Vite + Capacitor로 앱화하며 Windows에서 게임을 개발하고 Mac mini에서 네이티브 연동·실기기 테스트·TestFlight·배포를 진행합니다. Android는 이후 출시합니다.

## 포함 내용

- `web-prototype/index.html`: 모바일 게임 화면과 상점
- `web-prototype/game/`: 채굴/전투/성장/세이브/밸런스
- `web-prototype/platform/`: IAP/IAA/선택형 리더보드 연결 계층
- `web-prototype/ui/`: 캔버스 전투 연출, 획득 카드, 선택형 효과음
- `docs/GAME_DESIGN_SPEC.md`: 오토 드릴 + 메타 설계 요약
- `docs/PROGRESSION_SCHEMA.json`: 선체/엔진/리액터/가챠 데이터 구조
- `docs/LIVEOPS_NOTES.md`: 상용화/재화 설계 메모
- `tools/balance_sheet.csv`: 초반 밸런싱용 샘플 표
## 빠른 시작

Node.js 22.12 이상이 필요합니다.

```bash
npm ci
npm run dev
```

- Vite가 출력하는 로컬 주소로 접속합니다. 서버 없이 동작하는 게임이며 개발 서버는 미리보기 용도입니다.
- 앱에 포함할 정적 번들은 아래 명령으로 `dist/`에 생성합니다.

```bash
npm run build
```

- 저장소 구조 점검은 아래 명령으로 실행합니다.

```bash
npm run check
```

## 개발 인계 문서

- `docs/MONETIZATION_REVIEW.md`: 광고 보상·노출 정책과 광고 시간을 포함한 30일 비교

- `docs/LAUNCH_CONTENT_REVIEW.md`: Gemini 콘텐츠 실제 통합·수정 이유와 캠페인 포함 30일 검증

- `docs/RELEASE_SCOPE_V1.md`: 약 30일 출시 수량과 현재 구현/미구현 경계
- `docs/VISUAL_ASSET_PLAN.md`: 네온 궤도 채굴 방향과 논리 에셋 76개 목록
- `docs/PLAYER_FLOW_REVIEW.md`: 현재 목표 안내·모듈 이동·완료 보상 일괄 수령과 모바일 검증
- `docs/LOCALIZATION_REVIEW.md`: 동적 문구·오류·복귀 알림 현지화 검증
- `docs/LOCALIZATION_PLAN.md`: 한영일 기반/언어 선택·430개 공통 문구 초안과 남은 번역, 추가 15개 언어 준비
- `docs/MONTHLY_BALANCE_REVIEW.md`: 콘텐츠 통합 전 과거 경제 기준선
- `docs/GEMINI_RELEASE_BRIEF.md`: 아트·문구·콘텐츠 묶음용 복사 프롬프트
- `docs/CONSENT_INTEGRATION.md`: AdMob UMP의 Windows 준비/Mac 네이티브 검증 경계

- `docs/DEV_QUICKSTART.md`: 다음 개발자/에이전트가 바로 이어서 작업하기 위한 실행 가이드
- `BACKLOG.md`: 우선순위 기준 후속 구현 작업 목록
- `docs/BALANCE_REVIEW.md`: Gemini 밸런스 후보와 실제 시뮬레이션 결과
- `docs/ROUTE_REVIEW.md`: 심우주 항로·모듈 숙련·외형 보상과 24시간 검증
- `docs/BOSS_REVIEW.md`: 보스 단계·모듈 약점·스킬 연계와 최신 밸런스 검증
- `docs/SETTINGS_REVIEW.md`: 음량/모션/도움말 검증과 신규 사용자 플레이테스트 진행표
- `docs/IOS_RELEASE_PLAN.md`: 출시 방향, 운영비, Windows/Mac별 완료 기준
- `docs/MAC_HANDOFF.md`: 네이티브 플러그인 계약 및 Mac 작업 순서
- `docs/GEMINI_NEXT_TASK.md`: 첫 세션 밸런스 기획 위임 기록

밸런스 검증은 `node scripts/simulate-balance.mjs`로 실행합니다.
가챠 풀과 웨이브 공식은 `web-prototype/game/balance.js`에서 관리합니다.

`npm run balance:launch`는 캠페인 보상을 포함한 30일 모델을 실행합니다. `npm run gemini:brief`는
허용된 문서/소스만 `tools/handoffs/gemini-release-context.txt`로 묶습니다.
프롬프트를 Gemini에 붙여 넣고 이 파일을 첨부하세요. 생성만 하며 자동 전송하지 않습니다.

캠페인 포함 출시 데이터의 접속별 검증은 `npm run balance:launch`로 실행합니다.
`balance:month`는 현재 성장 데이터로 캠페인 보상을 수령하지 않는 비교이며 과거 기준선 파일은 보존합니다.

현재 실제 StoreKit/광고 SDK는 연결되지 않았습니다. 브라우저에서 구매는 비활성화되고 광고/리더보드 버튼은 숨겨집니다. Bundle ID는 `com.interest.autodrillgalaxy`로 등록했습니다. 앱 생성 상태는 `docs/APP_STORE_REGISTRATION.md`를 따르며 상품 ID는 출시 전에 확정해야 합니다.


`npm run balance:ads`는 무광고/기존 빈도/출시 보급 정책을 비교하고 `tools/reports/monetization-monthly.json`에 기록합니다. 실제 광고 수익·리텐션 측정은 아닙니다.
