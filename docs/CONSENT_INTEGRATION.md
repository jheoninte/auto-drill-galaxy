# AdMob 동의: Windows 준비와 iOS 검증

2026-11-17 Google 공식 iOS UMP 안내를 실제 브라우저에서 확인했다.
출처: https://developers.google.com/admob/ios/privacy

## Windows에서 할 수 있는 일

AdMob 콘솔의 개인정보 보호 및 메시지에서 앱에 맞는 메시지 유형·언어·사업자 정보를 설정하고
앱 ID와 연결하는 작업은 Windows 브라우저에서도 가능하다. 계정 설정 변경/메시지 게시 자체는 아직 수행하지 않았다.
현재 콘솔 메시지의 실제 등록/게시 여부와 앱 ID도 확인하지 않았다.
필요한 개인정보처리방침 URL과 출시 언어를 먼저 준비한다.

앱 쪽은 JS 서비스 계약, 개인정보 선택 진입점과 오류 처리를 Windows에서 구현할 수 있다.
Swift 코드 작성도 가능하지만, Xcode의 UMP/AdMob 패키지 연결·빌드·실제 화면 표시는 Mac/iPhone에서 검증해야 한다.
HTML로 가짜 동의창을 만들어 iOS UMP를 대신하지 않는다.

이번에 구현한 것:

- `initialize()`의 네이티브 UMP 결과가 `consent.canRequestAds === true`인 경우에만 JS 광고 기능을 허용한다.
- UMP가 선택 진입점을 요구하고 네이티브가 지원하면 설정에 `광고 개인정보 선택` 버튼을 표시한다.
- 선택 화면 재표시 동안 광고를 막고 반환 결과로 다시 계산한다. 실패/잘못된 반환이면 광고는 계속 비활성화하고 재시도는 가능하게 한다.
- 동의 정보는 런타임 메모리에만 두며 게임 저장/백업으로 승인 상태를 만들지 않는다.
- 네이티브가 없는 브라우저에서는 버튼을 숨기며 동의 성공을 흉내 내지 않는다.

이 단계는 **JS 연결부 준비 완료**이며 UMP 네이티브 SDK 연결 완료가 아니다.

## AutoDrillNative 추가 계약

`initialize()`는 UMP 갱신/필요한 화면 처리를 마친 뒤 예를 들어 다음처럼 반환한다.

```json
{
  "capabilities": {"purchases":true,"rewardedAds":true,"interstitialAds":true,"gameCenter":false,"privacyOptions":true},
  "consent": {"canRequestAds":true,"privacyOptionsRequired":true},
  "entitlements": {"removeAds":false,"supporter":false}
}
```

위 true 값은 예시이며 실제 SDK 상태와 기능 지원으로 결정한다. `canRequestAds`는 사용자가
모든 개인화/추적에 동의했다는 뜻이 아니다. UMP의 광고 요청 가능 여부를 그대로 전달한다.
일괄 true, localStorage 동의 문자열, JS 언어·IP 추측으로 대신하지 않는다.

새 Promise 메서드 `showPrivacyOptions()`:

```json
{"shown":true,"consent":{"canRequestAds":false,"privacyOptionsRequired":true}}
```

UMP의 개인정보 옵션 양식을 표시하고 닫힌 뒤 실제 최신 상태를 반환한다.
표시 실패는 reject 또는 `shown:false`로 처리한다. 지연 콜백·중복 초기화에도 광고 SDK를 중복 시작하지 않는다.
네이티브도 **매 광고 로드/표시 직전** 최신 UMP 상태와 광고 제거 권한을 확인한다.
선택 변경 시 부적합해진 미리 로드한 광고를 폐기/재로드하는 절차도 네이티브에서 구현한다.

## Mac에서 실제로 연결할 흐름

1. 공식 UMP 패키지와 AdMob SDK를 Xcode 프로젝트에 추가하고 `GADApplicationIdentifier`를 실제 앱 ID로 설정한다.
2. 앱 실행마다 `requestConsentInfoUpdate`를 호출한다. 오래된 로컬 동의 값으로 대체하지 않는다.
3. 갱신 결과에 따라 `loadAndPresentIfRequired`를 호출하고, 필요한 UMP 화면을 표시한다.
4. `canRequestAds`를 확인하여 광고 초기화/로드를 한 번만 진행한다. 오류 시에도 UMP가 가진 유효한 기존 상태를 확인한다.
5. `privacyOptionsRequirementStatus`에 따라 앱의 재선택 진입점을 제공한다.
6. ATT는 UMP와 별도다. 추적을 실제로 사용하는 구성인지 확인하고 필요한 흐름만 연결한다.
7. 테스트 기기/강제 지역/동의 초기화로 시나리오를 검증하고 배포에서 디버그 설정과 reset 호출을 제거한다.

실기기 확인: 필요한 지역의 첫 화면/재선택, 선택 거부, 재실행, 네트워크 실패, 중복 콜백,
광고 미노출 시 기본 게임 정상 진행, 구매 복원, 선택 변경 후 기존 광고 처리, 광고/동의 중 오디오 중단.
앱의 한영일 UI 지원과 UMP 메시지 지원 언어 설정은 별도 검수한다.
