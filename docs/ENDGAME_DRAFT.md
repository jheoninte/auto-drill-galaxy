# Gemini 후반 목표 원안 · 능력치 보상 미채택

아래 능력치/시작자원 보상은 구현하지 않았다. 후속 Gemini 문구·QA 초안을 검토하여
모듈 숙련 과제와 빔·궤도 외형 7종을 구현했다. 현재 규칙과 실측은 `ROUTE_REVIEW.md`를 따른다.

2026-11-17 Gemini 앱의 `Auto Drill Galaxy 게임 기획 및 프로토타입 구현` 대화에서 요청/응답 확인.
화면 표시 모델은 `4 Hydrogen`. 기획 비교는 Gemini, 채택/런타임 통합/실측은 Codex가 담당한다.

실측 입력: 기존 20시드 연속 플레이 24h 환생47회/최고48, 연구 완료 중앙값5262초.
4시간 간격 5분씩 6회 방문은 환생8회/최고22/연구4·4. 아래 제안 수치는 시뮬레이션하지 않은 추정이다.

Gemini 추천은 영구 1회성 심우주 목표 7종과 제한된 가산/시작자원 보상이다.
대안인 암흑물질 소비 특성 트리는 기존 성장과의 충돌 및 구현 범위 때문에 보류했다.

```json
[
  {"id":"end_sector_1","title":"성계 경계 돌파","unlock":"runs >= 5 || bestWave >= 22","target":{"metric":"bestWave","value":25},"reward":{"type":"flatMining","value":1.5}},
  {"id":"end_runs_10","title":"베테랑 항해사","unlock":"runs >= 5","target":{"metric":"runs","value":10},"reward":{"type":"startOre","value":150}},
  {"id":"end_gacha_30","title":"고대 코어 수집가","unlock":"bestWave >= 25","target":{"metric":"skills.length","value":30},"reward":{"type":"gachaDiscount","value":0.05}},
  {"id":"end_sector_2","title":"암흑 성운 개척","unlock":"bestWave >= 25","target":{"metric":"bestWave","value":32},"reward":{"type":"flatDamage","value":5}},
  {"id":"end_runs_25","title":"차원 도약의 대가","unlock":"runs >= 10","target":{"metric":"runs","value":25},"reward":{"type":"startMaterials","iron":2,"crystal":2}},
  {"id":"end_crit_master","title":"정밀 타격 연산","unlock":"bestWave >= 32","target":{"metric":"bestWave","value":40},"reward":{"type":"critCapBonus","value":0.05}},
  {"id":"end_sector_3","title":"은하 중심부 도달","unlock":"bestWave >= 40","target":{"metric":"bestWave","value":50},"reward":{"type":"moduleEfficiency","value":0.15}}
]
```

표기만 현재 스키마(bestWave/skills.length)에 맞춰 정리했다. 실행 가능한 조건식으로 평가하지 않는다.
Gemini 정책 후보: 기존 기록으로 소급 달성, 수동 수령ID 영구 유지, 시작자원은 환생 직후 1회.

Codex 검토:

- 가산 보상이라는 이유만으로 무한 가속이 방지된다고 단정할 수 없다. 기존 성장과 함께 24h 재검증해야 한다.
- 원안은 연구가 소진된 뒤의 새로운 선택보다 단순 보상 목록에 가깝다. 모듈별 과제/외형 등 선택 요소를 비교할 것.
- 첫 목표 unlock은 runs5 **또는** 최고22라서 연구 완료 이전에도 열릴 수 있다. 목표 시점 주장을 실측할 것.
- 스킬30은 초기30분에 이미 충족할 수 있다. wave25 해금 시 자동 충족되는 목표의 가치 검토가 필요하다.
- 후기 가챠 비용은 이미 수천 이상이라 시작 광석150의 체감이 낮을 수 있다. '2~3회 구매'라는 원안 설명은 현 공식과 맞지 않는다.
- moduleEfficiency가 채굴/전투 패널티에도 더해지는지 불명확하다. 명확한 효과·상한 없이는 채택하지 않는다.
- 세이브의 ID 배열 검증만으로 과거 백업 되돌리기를 막을 수 없다. 로컬 진행 복원을 경쟁/현금 보상에 쓰지 않는다.

현재 빌드에 위 보상을 추가하지 않았다. 다음 콘텐츠 작업의 비교 자료이며 리텐션 개선이 검증된 안이 아니다.
