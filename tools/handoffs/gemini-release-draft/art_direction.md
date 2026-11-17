

**스타일 방향: 네온 궤도 채굴 (Neon Orbit Mining)**

* **색상 팔레트:** 배경 `#020617`, 패널 `#0f172a`, 기본 글자 `#e2e8f0`, 채굴/선택 `#67e8f9`, 보스/재료 `#fbbf24`, 전투 `#fb7185`, 연구 `#c4b5fd`.


* **형태 및 접근성 규칙:** 모든 등급(N/R/SR/UR)과 모듈 상태는 색상 단독이 아닌 **텍스트 라벨 + 고유 다각형 실루엣 + 외곽선 점선 패턴**으로 이중 표기합니다. 다국어 확장을 위해 이미지/캔버스 내부에 텍스트를 굽지 않습니다.


* **연출 제한:** 전면 플래시, 상시 화면 흔들림을 금지하며 애니메이션은 격파 파동(550ms)과 뽑기 강조(4.5s)로 제한합니다. 모션 줄이기 설정 시 정적 기하학 도형으로 고정됩니다.



| 구분 | 식별 ID | 실루엣 및 핵심 문양 | 주 색조 | 단계/상태 변화 |
| --- | --- | --- | --- | --- |
| **구역 1** | `sector.01` | 성긴 정사각 별점, 단층 궤도 고리 | `#020617` / `#38bdf8` | 기본 시야 |
| **구역 2** | `sector.02` | 육각 결정 격자 성운 문양 | `#091326` / `#67e8f9` | 고리 이중화 |
| **구역 3** | `sector.03` | 십자 성단과 어두운 공허 원환 | `#050816` / `#c4b5fd` | 배경 성운 밀도 증가 |
| **구역 4** | `sector.04` | 동심원 중력파 왜곡 링 | `#0a0f24` / `#fb7185` | 파동 링 맥동 |
| **구역 5** | `sector.05` | 방사형 코로나 광선과 중앙 코어 | `#0d1117` / `#fbbf24` | 고밀도 황금 입자 |
| **보스 1** | `boss.armor` | 12각 톱니 장갑판 + 중앙 둥근 노심 | `#713f12` / `#fbbf24` | 2단계(HP 50% 이하): 외곽 장갑 점선 해제, 노심 `#fb7185` 노출 |
| **보스 2** | `boss.crystal` | 8각 프리즘 결정체 + 내부 삼각 핵 | `#1e1b4b` / `#c4b5fd` | 2단계(HP 50% 이하): 균열선 추가, 코어 `#67e8f9` 점멸 |
| **보스 3** | `boss.void` | 이중 반전 오각형 + 암흑 중심원 | `#1f122b` / `#fb7185` | 2단계(HP 50% 이하): 외곽 오각형 회전 반전, 테두리 `#c4b5fd` |
| **보스 4** | `boss.gravity` | 비대칭 타원 궤도 고리를 두른 10각형 | `#172554` / `#60a5fa` | 2단계(HP 50% 이하): 고리 수축, 내부 고에너지 `#fbbf24` 점등 |
| **보스 5** | `boss.solar` | 16각 코로나 플레어 + 이중 원형 코어 | `#451a03` / `#fde047` | 2단계(HP 50% 이하): 플레어 확장, 코어 백열 `#f8fafc` 전환 |

* **에셋 생성용 짧은 프롬프트 (브랜드/작가 모방 배제, 순수 기하학 도해)**
* `sector.01`: `Minimalist dark navy space background (#020617), sparse cyan geometric star dots, clean sci-fi orbital diagram aesthetic, no text, flat vector style.`
* `sector.02`: `Deep midnight blue space backdrop with subtle translucent cyan hexagonal crystal grid lines, clean technical vector art, no text.`
* `sector.03`: `Dark indigo void space background with faint violet concentric ring arcs and fine starlight, minimalist sci-fi HUD art, no text.`
* `sector.04`: `Dark slate space backdrop featuring subtle coral-pink gravitational wave circles radiating from center, clean vector diagram, no text.`
* `sector.05`: `Deep obsidian galactic core backdrop with faint golden geometric corona rays, clean minimalist sci-fi vector aesthetic, no text.`
* `boss.armor`: `Top-down minimalist geometric space boss icon, 12-sided dark bronze armored polygon with glowing amber core, crisp vector lines on transparent background, no text.`
* `boss.crystal`: `Top-down minimalist geometric space boss icon, 8-sided indigo crystalline prism with glowing violet triangular core, crisp vector lines on transparent background, no text.`
* `boss.void`: `Top-down minimalist geometric space boss icon, inverted double pentagon in dark purple with glowing coral-red center core, crisp vector lines on transparent background, no text.`
* `boss.gravity`: `Top-down minimalist geometric space boss icon, 10-sided dark blue polygon encircled by an eccentric orbital ring, crisp vector lines on transparent background, no text.`
* `boss.solar`: `Top-down minimalist geometric space boss icon, 16-point solar flare polygon in deep amber with bright gold concentric core, crisp vector lines on transparent background, no text.`



---
