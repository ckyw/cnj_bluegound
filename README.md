# The Pipe Hotel — Seoul booking prototype

제공된 디자인 시안의 흑백 에디토리얼 스타일을 기반으로 만든 반응형 호텔 예약 프로토타입입니다. 실행 의존성 없이 HTML, CSS, JavaScript ES modules로 동작하며 Node.js는 로컬 서버·빌드·검증에만 사용합니다.

## 로컬 실행

Node.js 22 이상이 필요합니다.

```sh
npm ci
npm run dev
```

주소: http://localhost:4173

빌드 결과를 직접 확인하려면:

```sh
npm run build
npm run preview
```

포트 변경: `PORT=4174 npm run dev`

## 화면과 기능

- `/`: 홈, 지점 카드, 프로모션, 브랜드 소개, 데모 후기, FAQ
- `/locations`: 4개 지점과 지점별 필터, 동네 소개, 안내용 지도
- `/rooms`: 날짜·지점·인원에 따른 데모 객실 검색, 객실 유형 필터와 가격 정렬
- `/rooms/standard-double`, `/rooms/twin`, `/rooms/superior`, `/rooms/studio`: 객실 상세, 사진 갤러리, 예약 요약, 데모 예약 완료
- 알 수 없는 경로: HTTP 404와 복귀 화면
- 공통 헤더·푸터: 로컬 SVG 로고. 로고 클릭으로 홈 이동
- 모바일 메뉴·하단 예약 버튼, 주요 UI의 EN/KO 전환, USD/KRW 전환
- 기본 여행 날짜: 접속한 기기의 오늘 기준 7일 뒤부터 3박
- 검색 조건은 URL과 sessionStorage, 언어·통화는 localStorage에 저장
- `PIPE15`: 객실 소계 15% 할인
- `STAY7`: 7박 이상 객실 소계 20% 할인, 중복 할인 불가

## 데이터와 한계

실제 예약·결제·재고 조회·회원 로그인·이메일 발송·문의 접수는 연결되어 있지 않습니다. 모든 객실, 요금, 할인, 정책 및 후기는 데모 데이터입니다. 뉴스레터 이메일은 전송하거나 저장하지 않으며 예약에 개인정보를 입력하지 않습니다.

요금은 USD 정수 센트로 계산합니다. 객실 요금 × 숙박일 × 객실 수에 할인을 적용한 뒤 객실당 $18의 준비 비용과 10% 세금을 더합니다. KRW는 **예시 고정 환율 1 USD = 1,350원**을 적용합니다. 이 값은 실시간 환율이 아닙니다. 데모 검색은 1–30박, 1–8명, 1–4객실을 지원합니다.

영문 브랜드 헤드라인과 일부 소개 문구는 언어 전환 시에도 유지됩니다. 지도는 축척이 없는 안내용 SVG입니다. Google Fonts를 외부에서 로드하며 그 밖의 사이트 이미지와 로고는 로컬 파일로 제공합니다.

## 소스 구조

```text
src/
  index.html       공통 HTML shell
  app.js           화면 렌더링, 내비게이션, 다이얼로그와 이벤트
  booking.js       날짜 검증, 검색 매개변수, 요금 계산
  data.js          가상 지점·객실·혜택 데이터
  styles.css       반응형 디자인
  assets/          SVG 로고·파비콘과 시안 이미지
scripts/
  build.mjs        src → dist, 경로별 HTML과 404 생성
  serve.mjs        로컬 HTTP 서버
  smoke.mjs        Playwright 브라우저 검증
  fetch-assets.py  시안 이미지의 로컬 작업 사본 생성(macOS curl·sips)
  asset-sources.json  이미지별 원본 URL
tests/
  booking.test.mjs 날짜·가격·비정상 입력 테스트
```

디자인 원본은 로컬 `stitch_boutique_hotel_booking_redesign/`의 `DESIGN.md`, `code.html`, `screen.png`입니다. 원본 폴더와 ZIP은 변경·업로드하지 않고 `.gitignore`에 제외했습니다. 사이트는 `src/`를 기준으로 유지합니다. 이미지 원본 URL은 `scripts/asset-sources.json`에 기록했습니다.

## 검증

```sh
npm run check
npx playwright install chromium  # 최초 브라우저 테스트 환경 준비
npm run build
npm run preview                 # 별도 터미널
npm run test:e2e
```

`check`는 JavaScript 구문 검사, Node 내장 테스트, 정적 빌드를 수행합니다. `test:e2e`는 데스크톱·모바일 화면, 날짜/지점/인원 전달, 검색·정렬·필터, 할인과 총액, 사진 키보드 이동, 데모 예약 완료, 뉴스레터·FAQ, 언어·통화, 빈 결과 및 404를 Chromium에서 확인합니다. 캡처와 검증 요약은 `.tmp/`에 저장하며 Git에서 제외합니다.

배포 주소 검증: `BASE_URL=https://your-project.vercel.app npm run test:e2e`

## GitHub → Vercel

저장소: https://github.com/ckyw/cnj_bluegound

Vercel의 Git 연동에서 위 저장소를 가져오고 아래 설정을 사용합니다.

| 항목                  | 값              |
| --------------------- | --------------- |
| Framework Preset      | Other           |
| Root Directory        | 저장소 루트     |
| Build Command         | `npm run build` |
| Output Directory      | `dist`          |
| Node.js               | 22 이상         |
| Environment variables | 필요 없음       |
| Production Branch     | `main`          |

`vercel.json`에 빌드·출력·clean URL 설정이 포함되어 있습니다. Git 연동 후 main push는 production, 다른 브랜치 push는 preview 배포로 이어집니다. 사이트 복구는 Vercel의 이전 배포를 다시 승격하거나 수정 커밋을 main에 push하는 방식으로 수행할 수 있습니다.

정식 서비스로 전환할 때에는 실제 객실 API·예약 서버·결제·동의 절차·운영 정책·검증된 콘텐츠를 별도 구현해야 합니다.
