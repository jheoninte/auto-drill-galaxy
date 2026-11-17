# Mac 이관 및 네이티브 연결 계약

## 현재 상태

Windows에서 번들 생성과 JS 서비스 분기는 검증한다. 실제 StoreKit/AdMob/Game Center
플러그인은 아직 구현되지 않았다. Capacitor를 설치한 것만으로 상점이나 광고가 연결되지는 않는다.
`AutoDrillNative`가 없으면 구매 버튼은 비활성화되고 광고/리더보드 버튼은 숨겨진다.
브라우저에 실제 결제를 흉내 내는 성공 경로는 없다.

한영일 i18n 기반과 언어 선택/저장/복원이 있으며, 공통 키 430개는 검수 전 초안이다.
연구소/탐사/항로·플랫폼 결과·저장 오류·복귀 알림까지 연결했다 (`LOCALIZATION_REVIEW.md`).
실제 SDK 시트·원어민 표현·기기 화면의 남은 검수는 `LOCALIZATION_PLAN.md`에서 추적한다.
Mac에서는 세 언어의 iPhone 화면/VoiceOver·오디오·구매/광고/UMP 경로를 따로 검수한다.
게임 언어 설정과 StoreKit 현지화 가격/UMP 메시지 언어를 동일하다고 가정하지 않는다.

현재 목표 1개 표시·조건별 연구소 이동·완료 보상 일괄 수령을 구현했다 (`PLAYER_FLOW_REVIEW.md`).
iPhone에서 카드 이동 후 VoiceOver 포커스, 일괄 수령/다음 과제, 재시작 후 중복 지급 차단을 확인한다.

행성은 체력 비율에 따라 613블록이 차례로 깎이는 Canvas 표현을 사용한다 (`MINING_VISUAL_REVIEW.md`).
iPhone에서 장시간 프레임·발열, DPR 2 상한, 최대 72개 파편, 모션 줄이기와 보스 HUD 겹침을 확인한다.

광고 보급·노출 정책과 30일 비교는 `MONETIZATION_REVIEW.md`를 따른다. JS 구현/모델 검증을 완료했으며 실제 SDK 검증은 남아 있다.

## Mac 시작 명령

Node 22.12 이상, Capacitor 8 요구사항에 맞는 Xcode/플랫폼 SDK를 준비한다.
`capacitor.config.json`의 Bundle ID는 Apple Developer에 등록한 `com.interest.autodrillgalaxy`다.
등록 팀은 INTEREST LLC. (`79978S7426`)다. App Store Connect 앱 생성 상태와 이름은 `APP_STORE_REGISTRATION.md`를 따른다.

```sh
npm ci
npm run check
npm run balance
npm run balance:long
npm run balance:routes
npm run balance:bosses
npm run build
npm run ios:add
npm run native:sync
npm run ios:open
```

`ios:add`는 최초 한 번만 실행한다. 생성된 프로젝트와 소스는 Git으로 보관하고 서명 키는 보관하지 않는다.
빌드 산출물에는 웹 게임 코드만 포함하며 개발 문서·도구는 포함하지 않는다.
Android는 출시 준비 시 같은 메이저의 `@capacitor/android`를 추가하고 별도 플랫폼 구현을 만든다.

5구역/30과제 캠페인은 시작부터 열리고 수령/집계/외형이 환생·백업 후 유지된다.
18스킬·6연계·5보스·4연구·15무료 항로·유료 선체 3색의 실제 검증 경계는 `LAUNCH_CONTENT_REVIEW.md`를 따른다.
기존 영구 목표·계약 탐사 기록은 첫 프레스티지 이후 해금된다. 기한/서버 리셋 없이 영구 목표 7개와 항해 계약 3종을 제공한다.
기존 세이브의 환생/최고 웨이브/파츠/스킬은 소급 반영하고 보스·전경 채굴 집계는 업데이트 이후부터 시작한다.
영구 목표 수령은 유지, 항해 계약 진행/수령 상태는 환생 때 초기화된다. 실기기에서도 보상 수령 직후 재시작과 중복 터치를 확인한다.
프레스티지 목표는 3회마다 2웨이브 상승하고, 선체는 최고 기록 최초 갱신 시에만 지급한다.

심우주 항로는 환생 5회 또는 최고 웨이브 25에서 열린다. 영구 목표 7종의 보상은
빔·궤도 외형뿐이며 능력치와 유료 서포터 함선 색상은 별도로 유지한다.
모듈 숙련은 해금 이후 전경 플레이만 집계하며 환생 후에도 유지된다 (`ROUTE_REVIEW.md`).
iPhone에서 15종 패턴 가독성, 서포터 함선과 동시 표시, 스크롤/터치,
외형 적용·목표 추적 직후 강제 종료와 복원 후 유지도 확인한다.

첫 프레스티지 이후 보스는 체력 50%에서 약점 모듈이 바뀌고 스킬 2종 연계가 적용된다.
단계는 현재 체력에서 계산하며 별도 타이머/저장 필드는 없다 (`BOSS_REVIEW.md`).
실기기에서 단계 경계의 안내와 선 패턴, 모듈 전환 대기, 광고 중단/강제 종료 후 유지,
연구소의 현 단계 예상 피해와 실제 체력 감소를 확인한다.

설정은 효과음 사용/음량/수동 모션 줄이기를 로컬 저장·백업에 포함한다 (`SETTINGS_REVIEW.md`).
기기의 모션 줄이기도 항상 따른다. 진동은 아직 미연결이다. iPhone에서 VoiceOver 순서와
슬라이더 조작, 기기 글자 크기, 무음 스위치/블루투스/통화·광고 중단 후 오디오,
백업 붙여넣기·복원 후 음량/모션 적용을 확인한다. 게임 음량 설정은 광고 소리를 제어하지 않는다.

저장은 raw v2에서 버전 포장/검사값 형식으로 이전하며 자동 백업과 수동 백업 코드 복원을 제공한다.
복원한 과거 오프라인 시간은 보상하지 않고 구매 권한은 이전하지 않는다. 상세는 `SAVE_RECOVERY.md`.
Windows에서 손상/쓰기 실패/복귀 중복을 자동 검사했으나 WKWebView 저장 영속성,
실기기 백그라운드/강제 종료/광고 오버레이/선택·붙여넣기는 Mac에서 확인해야 한다.

## AutoDrillNative 계약

Capacitor의 custom native plugin 이름은 `AutoDrillNative`다.
Swift에서 `CAPBridgedPlugin` 규격에 맞추어 아래 Promise 메서드를 노출하고 앱에 등록한다.
JS 호출부: `web-prototype/platform/native.js`, `services.js`.
광고/구매 성공을 나타내는 값은 네이티브 SDK 검증 결과에서만 만들어야 한다.

### initialize()

```json
{
  "capabilities": { "purchases": true, "rewardedAds": true, "interstitialAds": true, "gameCenter": false, "privacyOptions": true },
  "consent": { "canRequestAds": true, "privacyOptionsRequired": true },
  "entitlements": { "removeAds": false, "supporter": false }
}
```

필요한 동의 흐름을 처리하고 사용 가능한 기능만 true로 반환한다. 반복 호출에 안전해야 한다.
StoreKit 2 검증 및 현재 권한/취소 상태와 검증된 오프라인 캐시를 조합한다.
광고 개인화 동의와 ATT 허용은 별개로 처리하며 추적 거부가 기본 플레이를 막아서는 안 된다.
위 true는 응답 형태 예시다. 실제 UMP 상태를 전달한다. JS는 canRequestAds가 명시적으로 true가 아니면 광고를 비활성화한다.

### showPrivacyOptions()

설정의 개인정보 선택 진입점에서 UMP 양식을 열고 닫힌 뒤
`{ "shown": true, "consent": { "canRequestAds": false, "privacyOptionsRequired": true } }` 형태의 최신 상태를 반환한다.
JS 연결부는 준비했으며 Swift/SDK 구현은 아직 없다. 네이티브에서도 매 광고 요청/표시 직전 상태를 확인한다.
Windows 콘솔 작업과 Mac SDK 검증 경계는 `CONSENT_INTEGRATION.md`를 따른다.

### getProducts({ productIds })

```json
{ "products": [{ "id": "autodrill.remove_ads", "displayPrice": "$0.00" }] }
```

위 가격은 형태 예시다. 실제 응답에는 StoreKit `displayPrice`만 사용한다.
상품 ID는 `platform/catalog.js`와 App Store Connect에서 동일하게 확정한다.

### purchase({ productId }) / restorePurchases()

```json
{ "status": "purchased", "verified": true, "entitlements": { "removeAds": true, "supporter": false } }
```

구매는 purchased/cancelled/pending 상태를 반환한다. restore는 status 없이
`verified`와 전체 현재 권한을 반환한다. 검증된 거래만 finish하고 거래 업데이트를 관찰한다.
복원 동작은 사용자가 누른 때 AppStore.sync를 실행한다. 실행 때마다 로그인 요청을 띄우지 않는다.
지연 구매 승인·환불 등은 네이티브 캐시를 갱신하고 앱 복귀 시 UI도 재동기화해야 한다.
권한의 진실은 JS localStorage가 아니다. 현재 JS에는 소모성 상품 지급 경로가 없다.

### showRewarded({ placement: 'supply' })

```json
{ "rewardEarned": true, "rewardId": "unique-impression-id" }
```

광고가 닫히고 게임으로 복귀한 시점에 resolve한다. SDK의 보상 획득 콜백이 발생한 때만
rewardEarned를 true로 반환한다. 광고 로드 실패/취소/보상 미획득 종료는 false다.
광고 1회에 대해 고유한 ID를 유지하며 중복 콜백에 새 ID를 만들지 않는다.
보상 수량은 JS 정책으로 계산하고 네이티브가 임의 수량을 주입하지 않는다.

### showInterstitial({ placement: 'prestige' })

`{ "shown": true }`를 광고 종료 후 반환한다. 준비되지 않았으면 즉시 false로 반환하고
플레이를 계속한다. 사용자 동의/광고 제거 권한을 네이티브에서도 확인한다.

### showLeaderboard()

선택 기능이다. Game Center 인증 후 네이티브 UI를 표시하고 `{ "shown": true }`를 반환한다.
초기에는 capability false로 둔다. 활성화 전 점수 제출 규칙, 보드 ID, 인증 취소/오프라인 처리를
추가 구현해야 한다. 현재 점수 업로드 기능은 없다.

## 출시 전 필수 실기기 시나리오

신규 설치/재설치/기기 변경, 구매 취소/Ask to Buy/검증 실패/복원/환불,
광고 no-fill/중도 종료/보상 후 중복 콜백, 동의 거부, 인터넷 단절,
전면 광고 제거 후 보상 광고 유지, 앱 강제 종료/백그라운드, 세이브 손상/용량 부족을 확인한다.
브라우저 자동 검사 통과는 이 검증을 대체하지 않는다.

## 광고 정책 실기기 추가 검증

- 첫 합성/환생 전 보급 잠금, 시청 전 광석 견적과 요청 시점 스냅샷, 정상 보상 콜백에서만 1회 지급을 확인한다.
- 보급 완료 후 5분 대기가 재실행/백업 복원 후 유지되고, 전경 과제에는 보급 광석이 집계되지 않는지 확인한다.
- 앱 실행당 전경 10분 이후·전경 8분 간격·최대 2회가 적용되고 initialize/구매 복원/동의 재선택이 횟수를 초기화하지 않는지 확인한다.
- 백그라운드와 SDK 화면 체류는 전경 시계에서 제외한다. 광고 동안 채굴·전투와 게임 효과음을 중단하고 복귀 시 프레임 누적을 버리는지 확인한다.
- 보급 후 2분 전면 광고 보호, no-fill/예외 후 전경 60초 재시도 제한과 성공 노출 횟수 보존을 확인한다.
- 환생 후 전경 15초 이내에 보상 카드/튜토리얼/대화상자를 마친 경우만 광고를 시도하고, 기한 만료/백그라운드/복원/보급 요청 후 뒤늦게 나타나지 않는지 확인한다.
- 광고 제거·UMP 거부/변경·네트워크 실패에서도 기본 플레이가 계속되는지 확인한다. 브라우저 성공 모의는 추가하지 않는다.
