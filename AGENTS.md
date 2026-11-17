이 저장소는 Vertex AI 기획 세션 기반의 continuation-ready 패키지입니다.

원칙:
- 성장 데이터는 `ship`, `skills`, `loot`, `prestige` 축으로 분리합니다.
- 자동 채굴 수식과 UI 연출을 분리합니다.
- HTML5 프로토타입과 후속 엔진 프로젝트가 같은 progression schema를 공유하도록 유지합니다.
- 오프라인 보상은 후속 구현 시 `lastSeenAt` 기반으로 확장합니다.

출시 방향:
- Windows에서 개발하고 Mac mini에서 iOS 네이티브 검증·TestFlight·배포를 진행합니다. Android는 iOS 이후입니다.
- 기본 무료 IAP + IAA 하이브리드 캐주얼이며 자체 서버 없이 시작합니다.
- 기존 HTML5 게임을 Vite + Capacitor로 패키징하고 게임 로직과 플랫폼 SDK를 분리합니다.
- 네이티브 SDK가 없는 브라우저에서 구매/광고 성공을 흉내 내지 않습니다.
- 구매 권한은 로컬 게임 세이브가 아닌 네이티브 검증 결과로 적용합니다.
- 리더보드가 필요해지면 Game Center를 우선 검토하고 Firebase는 실제 필요와 비용을 확인한 뒤 도입합니다.
- Gemini는 대량 기획·콘텐츠 초안을 맡고 Codex는 통합·수치 검증·오류 처리를 맡습니다.
- `docs/IOS_RELEASE_PLAN.md`와 `docs/MAC_HANDOFF.md`의 실제 완료/미완료 상태를 유지합니다.
