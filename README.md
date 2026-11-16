# Auto Drill: Galaxy

`Auto Drill: Galaxy`는 Vertex AI 기획 세션을 토대로 정리한 continuation-ready 저장소입니다. 자동 채굴, 궤도 전투, 가챠/머지/프레스티지 메타를 HTML5로 먼저 검증하고, 이후 Godot/Unity 또는 Phaser 기반 프로젝트로 확장하기 쉽게 구성했습니다.

## 포함 내용

- `web-prototype/index.html`: 단일 파일 자동 채굴 프로토타입
- `docs/GAME_DESIGN_SPEC.md`: 오토 드릴 + 메타 설계 요약
- `docs/PROGRESSION_SCHEMA.json`: 선체/엔진/리액터/가챠 데이터 구조
- `docs/LIVEOPS_NOTES.md`: 상용화/재화 설계 메모
- `tools/balance_sheet.csv`: 초반 밸런싱용 샘플 표
## 빠른 시작

```bash
npm install
npm run dev
```

- 개발 서버는 `web-prototype/index.html`을 바로 확인할 수 있게 루트에서 서빙합니다.
- 정적 빌드는 아래 명령으로 생성합니다.

```bash
npm run build
```

- 저장소 구조 점검은 아래 명령으로 실행합니다.

```bash
npm run check
```

## 개발 인계 문서

- `docs/DEV_QUICKSTART.md`: 다음 개발자/에이전트가 바로 이어서 작업하기 위한 실행 가이드
- `BACKLOG.md`: 우선순위 기준 후속 구현 작업 목록

