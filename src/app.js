import { branches, roomTypes, offers, pillars } from "./data.js";
import {
  isoDate,
  addDays,
  normalizeStay,
  validateStay,
  quote,
  searchParams,
} from "./booking.js";

const $ = (selector, root = document) => root.querySelector(selector);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const storage = {
  get(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Optional preferences. */
    }
  },
};
let language = storage.get("pipe-language", "en") === "ko" ? "ko" : "en";
let currency = storage.get("pipe-currency", "USD") === "KRW" ? "KRW" : "USD";
const t = (en, ko) => (language === "ko" ? ko : en);
let storedStay = "";
try {
  storedStay = sessionStorage.getItem("pipe-stay") || "";
} catch {
  /* Private browser. */
}
let stay = normalizeStay(
  new URLSearchParams(location.search || storedStay),
  branches.map((b) => b.id),
);
const path = location.pathname.replace(/\/$/, "") || "/";
const roomId = path.split("/")[2];
const room = roomTypes.find((r) => r.id === roomId) || roomTypes[0];
const detail =
  path.startsWith("/rooms/") && roomTypes.some((r) => r.id === roomId);
const branch = branches.find((b) => b.id === stay.branch) || branches[2];
const page =
  document.body.dataset.page === "404"
    ? "404"
    : path === "/"
      ? "home"
      : path === "/locations"
        ? "locations"
        : path === "/rooms"
          ? "rooms"
          : detail
            ? "detail"
            : "404";
let filter = "all";
let roomFilter = "all";
let toastTimer;
let modalTrigger;
let galleryIndex = 0;
const galleryImages = [room.image, "bathroom", "workspace", "amenities"];
const galleryLabels = [
  "Sleeping sanctuary",
  "Private bathroom",
  "A space to focus",
  "Considered details",
];

function persistStay() {
  try {
    sessionStorage.setItem("pipe-stay", searchParams(stay));
  } catch {
    /* Optional state. */
  }
}
function money(cents, decimals = false) {
  const amount =
    currency === "KRW" ? Math.round((cents / 100) * 1350) : cents / 100;
  return new Intl.NumberFormat(currency === "KRW" ? "ko-KR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" || !decimals ? 0 : 2,
    minimumFractionDigits: currency === "KRW" || !decimals ? 0 : 2,
  }).format(amount);
}
function dateLabel(value, short = false) {
  return new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    ...(short ? {} : { year: "numeric" }),
  }).format(new Date(value + "T12:00:00"));
}
function dates() {
  return `${dateLabel(stay.checkin, true)} — ${dateLabel(stay.checkout, true)}`;
}
function occupancy() {
  return t(
    `${stay.guests} Guests · ${stay.rooms} Room${stay.rooms > 1 ? "s" : ""}`,
    `${stay.guests}명 · 객실 ${stay.rooms}개`,
  );
}
function url(route, overrides = {}) {
  return `${route}?${searchParams({ ...stay, ...overrides })}`;
}
function image(name, alt, cls = "", eager = false) {
  return `<img src="/assets/images/${name}.jpg" alt="${escape(alt)}" class="${cls}" loading="${eager ? "eager" : "lazy"}" ${eager ? 'fetchpriority="high"' : ""} decoding="async">`;
}
const iconPaths = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  diagonal: '<path d="M6 18 18 6M6 6h12v12"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M7 2v6m10-6v6"/>',
  users:
    '<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M16 4a3 3 0 0 1 0 6m2 4c3 0 4 2 4 5v2"/>',
  bed: '<path d="M3 19v-8h18v8M3 16h18M5 11V5h14v6M12 5v6M3 19v2m18-2v2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M20 4l-2 2M6 18l-2 2"/>',
  chat: '<path d="M21 4H3v14h5v4l5-4h8Z"/><path d="M7 9h10M7 13h6"/>',
  wifi: '<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-10 4a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r=".7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m5 5 14 14M5 19 19 5"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  minus: '<path d="M4 12h16"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  shower:
    '<path d="M6 9V5a3 3 0 0 1 6 0v2m-4 3h8l-2-3h-4Zm1 4v2m6-2v2m-3 1v2m-5-1v2m10-2v2"/>',
  desk: '<path d="M3 12h18M5 12v9m14-9v9M7 3h10v6H7zm5 6v3"/>',
  key: '<circle cx="8" cy="9" r="5"/><path d="m11 13 9 9m-4-4 3-3m-6 0 3-3"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  heart: '<path d="M12 21 3 12C-3 4 8-1 12 6c4-7 15-2 9 6Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14"/><path d="m3 5 9 7 9-7"/>',
};
function icon(name, cls = "") {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${iconPaths[name] || iconPaths.arrow}</svg>`;
}
function sectionTitle(eyebrow, title, right = "") {
  return `<div class="section-heading"><div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2></div>${right}</div>`;
}
function header() {
  return `<header class="site-header"><div class="header-main container"><a class="brand" href="/" aria-label="PIPE Hotel home"><img class="brand-wordmark" src="/assets/pipe-logo.svg" width="76" height="34" alt="PIPE"><span class="brand-descriptor">HOTEL<br>SEOUL, KR</span></a><nav class="desktop-nav" aria-label="${t("Main navigation", "주 메뉴")}"><a class="${page === "locations" ? "active" : ""}" href="${url("/locations")}">${t("LOCATIONS", "지점 안내")}</a><a class="${page === "rooms" || page === "detail" ? "active" : ""}" href="${url("/rooms")}">${t("ROOMS & STAY", "객실 & 스테이")}</a><a href="/#offers">${t("OFFERS", "프로모션")}</a><a href="/#about">${t("OUR STORY", "브랜드 소개")}</a><a href="/#faq">${t("FAQ", "자주 묻는 질문")}</a></nav><div class="header-tools"><button class="text-button language-button" data-action="language" aria-label="${t("Switch to Korean", "Switch to English")}">${icon("globe")} ${language.toUpperCase()}</button><button class="text-button currency-button" data-action="currency" aria-label="${t("Change currency", "통화 변경")}">${currency} ${icon("down")}</button><button class="menu-toggle" data-action="menu" aria-label="${t("Open menu", "메뉴 열기")}" aria-expanded="false" aria-controls="mobile-nav">${icon("menu")}</button></div></div><nav id="mobile-nav" class="mobile-nav" aria-label="Mobile navigation" hidden><a href="${url("/locations")}">${t("Locations", "지점 안내")}</a><a href="${url("/rooms")}">${t("Rooms & Stay", "객실 & 스테이")}</a><a href="/#offers">${t("Offers", "프로모션")}</a><a href="/#about">${t("Our Story", "브랜드 소개")}</a><a href="/#faq">FAQ</a></nav><div class="header-booking"><div class="container booking-row"><button data-action="booking" data-field="branch" class="booking-segment"><span class="eyebrow">${t("YOUR NEIGHBORHOOD", "머물고 싶은 동네")}</span><span>${stay.branch === "all" ? t("All Seoul locations", "서울의 모든 지점") : branch.name} ${icon("down")}</span></button><button data-action="booking" data-field="checkin" class="booking-segment"><span class="eyebrow">${t("CHECK IN — CHECK OUT", "체크인 — 체크아웃")}</span><span>${dates()} ${icon("calendar")}</span></button><button data-action="booking" data-field="guests" class="booking-segment"><span class="eyebrow">${t("GOOD COMPANY", "함께하는 여행")}</span><span>${occupancy()} ${icon("users")}</span></button><a class="button header-book-button" href="${url("/rooms")}">${t("FIND YOUR STAY", "객실 찾기")} ${icon("arrow")}</a></div></div></header>`;
}
function bookingBar() {
  return `<div class="hero-booking"><button data-action="booking" data-field="branch"><span class="eyebrow">${t("01 / THE NEIGHBORHOOD", "01 / 머물 동네")}</span><strong>${stay.branch === "all" ? t("CHOOSE YOUR SEOUL", "나만의 서울 찾기") : branch.name.toUpperCase()}</strong>${icon("down")}</button><button data-action="booking" data-field="checkin"><span class="eyebrow">${t("02 / THE DATES", "02 / 여행 날짜")}</span><strong>${dates()}</strong>${icon("calendar")}</button><button data-action="booking" data-field="guests"><span class="eyebrow">${t("03 / THE COMPANY", "03 / 함께할 사람")}</span><strong>${occupancy()}</strong>${icon("users")}</button><a href="${url("/rooms")}" class="button">${t("LET’S GO", "객실 찾아보기")} ${icon("arrow")}</a></div>`;
}
function branchCard(b) {
  return `<article class="branch-card"><a class="branch-image image-hover" href="${url("/rooms", { branch: b.id })}">${image(b.image, `${b.name} considered hotel interiors`)}<span class="photo-tag">${b.number} / ${b.tag}</span><h3>${b.name === "PIPE Stay Yongsan" ? "PIPE STAY" : b.name}</h3></a><div class="branch-info"><div class="card-meta"><span>${b.district}, SEOUL</span><span>${t("FROM", "최저")} ${money(b.rate * 100)} / ${t("NIGHT", "박")}</span></div><h3>${b.name === "PIPE Stay Yongsan" ? "PIPE STAY YONGSAN" : `PIPE ${b.name.toUpperCase()}`}</h3><p>${language === "ko" ? b.ko : b.text}</p><a class="editorial-link" href="${url("/rooms", { branch: b.id })}">[ ${t("EXPLORE THIS STAY", "이 지점 둘러보기")} ] ${icon("arrow")}</a></div></article>`;
}
function offersSection() {
  return `<section class="section container" id="offers">${sectionTitle(t("A FEW GOOD REASONS TO STAY", "머물고 싶은 이유"), "OFFERS & PRIVILEGES", `<span class="section-note">${t("A little extra, just for you.", "당신을 위한 조금 더 특별한 혜택.")}</span>`)}<div class="offers-grid">${offers.map((o) => `<article class="offer-card"><div class="card-meta"><span>${o.eyebrow}</span><span class="badge">${o.badge}</span></div><h3>${o.title.replace("\n", "<br>")}</h3><p>${language === "ko" ? o.ko : o.text}</p><div class="offer-actions"><button class="button small" data-action="offer-book" data-id="${o.id}">${t("EXPLORE OFFER", "혜택 살펴보기")}</button><button class="editorial-link" data-action="offer" data-id="${o.id}">[ ${t("DETAILS", "상세")} ]</button></div></article>`).join("")}</div></section>`;
}
function pillarsSection() {
  return `<section class="section container">${sectionTitle(t("SMALL DETAILS. A BIG DIFFERENCE.", "작은 디테일이 만드는 큰 차이"), "THE PIPE WAY", `<p class="section-note">${t("Not more things. More meaning.<br>Hospitality built around what matters.", "많은 것보다 의미 있는 것.<br>꼭 필요한 것에 집중한 환대.")}</p>`)}<div class="pillars-grid">${pillars.map((p, i) => `<article class="pillar"><div class="pillar-number">0${i + 1}${icon(p[0])}</div><h3>${language === "ko" ? p[3] : p[1]}</h3><p>${language === "ko" ? p[4] : p[2]}</p></article>`).join("")}</div></section>`;
}
function reviewsSection() {
  const reviews = [
    [
      "A QUIET CORNER IN A BUSY CITY.",
      "A thoughtful little space to return to after a day exploring. The neighborhood was the best part — coffee, galleries, and something new around every corner.",
      "Alex",
      "Myeongdong",
    ],
    [
      "JUST THE RIGHT AMOUNT OF EVERYTHING.",
      "Beautifully simple. A comfortable bed, a proper desk, and a really easy arrival. I spent less time planning and more time getting to know Seoul.",
      "Jamie",
      "Yeonnam",
    ],
    [
      "A PLACE TO FIND YOUR OWN RHYTHM.",
      "Stayed for a week and could happily have stayed longer. Having a kitchen and a quiet spot to work made it feel like my own small home in the city.",
      "Robin",
      "PIPE Stay Yongsan",
    ],
  ];
  return `<section class="section container" id="reviews">${sectionTitle(t("GOOD STAYS MAKE GOOD STORIES", "좋은 숙박이 만드는 좋은 이야기"), "FROM OUR GUESTBOOK", `<span class="eyebrow demo-label">${t("ILLUSTRATIVE DEMO REVIEWS", "데모용 가상 후기")}</span>`)}<div class="reviews-grid">${reviews.map((r) => `<article class="review-card"><div class="stars" aria-label="5 out of 5 stars">★★★★★</div><h3>${r[0]}</h3><p>“${r[1]}”</p><div class="review-author"><strong>${r[2]}</strong><span>${r[3]} · ${t("Sample stay", "가상 숙박")}</span></div></article>`).join("")}</div></section>`;
}
function mapArt() {
  return `<div class="map-art" aria-label="Illustrated map showing four Seoul neighborhoods"><svg viewBox="0 0 700 460" role="img" aria-label="Stylized Seoul neighborhood map, not to scale"><defs><pattern id="blocks" width="58" height="54" patternTransform="rotate(-18)" patternUnits="userSpaceOnUse"><rect width="58" height="54" fill="#ecece7"/><rect x="5" y="5" width="48" height="44" fill="#e2e3dc"/><path d="M26 5v44M5 27h48" stroke="#ecece7" stroke-width="3"/></pattern></defs><rect width="700" height="460" fill="url(#blocks)"/><path d="M-20 343C170 200 170 410 330 330S590 240 730 290" stroke="#becbd0" stroke-width="62" fill="none"/><path d="M0 180 700 100M80 0 590 460M0 410 700 10M240 0 380 460" stroke="#fafaf6" stroke-width="10"/><path d="M105 200 308 140 415 167 460 276 330 332 105 200" stroke="#919b89" stroke-width="3" stroke-dasharray="7 5" fill="none"/><text x="310" y="250" fill="#8e9290" font-size="40" font-family="Oswald, sans-serif" letter-spacing="8">SEOUL</text><text x="370" y="350" fill="#6e8288" font-size="11" font-family="sans-serif" letter-spacing="4">HAN RIVER</text>${[
    [105, 200, "03", "YEONNAM"],
    [308, 140, "01", "MYEONGDONG"],
    [485, 167, "02", "DONGDAEMUN"],
    [330, 332, "04", "YONGSAN"],
  ]
    .map(
      ([x, y, n, name]) =>
        `<g transform="translate(${x},${y})"><circle r="15" fill="#171717" stroke="#fff" stroke-width="3"/><text text-anchor="middle" y="4" fill="white" font-size="10" font-family="sans-serif">${n}</text><rect x="-59" y="22" width="118" height="24" fill="#fff"/><text text-anchor="middle" y="38" fill="#171717" font-size="10" font-family="sans-serif" letter-spacing="1">${name}</text></g>`,
    )
    .join(
      "",
    )}</svg><span class="map-caption">${t("A NEIGHBORHOOD OVERVIEW · NOT TO SCALE", "동네 안내용 일러스트 · 실제 축척과 다름")}</span></div>`;
}
function faqSection() {
  return `<section class="section container faq-section" id="faq"><div><p class="eyebrow">${t("BEFORE YOU UNPACK", "짐을 풀기 전에")}</p><h2>GOOD TO KNOW.</h2><p class="muted">${t("A few things to make your stay simpler.", "더 편안한 숙박을 위한 안내.")}</p></div><div class="faq-list">${[
    [
      t(
        "What time is check-in and check-out?",
        "체크인·체크아웃 시간은 언제인가요?",
      ),
      t(
        "Our demo check-in is from 15:00 and check-out is by 11:00. Early luggage storage is shown as available from 09:00. Actual policies will be confirmed before launch.",
        "데모 기준 체크인은 15:00, 체크아웃은 11:00입니다. 오전 9시부터 짐 보관이 가능한 설정이며 실제 정책은 정식 오픈 전에 확정됩니다.",
      ),
    ],
    [
      t("Can I cancel my reservation?", "예약을 취소할 수 있나요?"),
      t(
        "This prototype shows a flexible cancellation policy up to 48 hours before arrival. No real reservations or payments are processed on this website.",
        "시안에서는 도착 48시간 전까지 무료 취소하는 정책을 보여줍니다. 이 사이트에서는 실제 예약이나 결제가 진행되지 않습니다.",
      ),
    ],
    [
      t("Are these real rooms and rates?", "실제 객실과 요금인가요?"),
      t(
        "This is an interactive design prototype. Room inventory, rates, images, offers and guest reviews are for demonstration. Please do not use it to make travel arrangements.",
        "이 사이트는 인터랙티브 디자인 프로토타입입니다. 객실, 요금, 이미지, 혜택과 후기는 데모용이며 실제 여행 예약에 사용할 수 없습니다.",
      ),
    ],
    [
      t("Can I stay for a week or longer?", "일주일 이상 머물 수 있나요?"),
      t(
        "Absolutely — explore stays of up to 30 nights in this demo. Choose 7 or more nights and use STAY7 to try our 20% long-stay discount.",
        "데모에서는 최대 30박까지 선택할 수 있습니다. 7박 이상 선택하고 STAY7 코드를 입력하면 20% 장기 숙박 할인을 체험할 수 있습니다.",
      ),
    ],
  ]
    .map(
      ([q, a]) =>
        `<details><summary>${q}<span class="faq-icon">+</span></summary><p>${a}</p></details>`,
    )
    .join("")}</div></section>`;
}
function home() {
  return `<section class="hero">${image("hero", "Warm minimalist bedroom with raw concrete walls and soft natural light", "hero-photo", true)}<div class="hero-overlay"></div><div class="hero-top container"><span class="eyebrow">SEOUL, SOUTH KOREA</span><span class="eyebrow">37.5665° N / 126.9780° E</span></div><div class="hero-copy container"><p class="eyebrow">${t("CONSIDERED SPACES. UNEXPECTED CONNECTIONS.", "세심한 공간, 뜻밖의 연결.")}</p><h1>WELCOME<br class="mobile-break"> TO PIPE<span class="hero-period">.</span></h1><p class="hero-description">${t("Your own little corner of a city that never stands still.<br>Four neighborhoods. One considered way to stay.", "멈추지 않는 도시 속 나만의 작은 공간.<br>네 개의 동네, 하나의 세심한 숙박 경험.")}</p><a class="hero-explore" href="#locations">${t("FIND YOUR SEOUL", "나만의 서울 찾기")} ${icon("arrow")}</a></div><div class="hero-bottom container">${bookingBar()}</div><span class="hero-side">STAY CURIOUS. STAY PIPE.</span></section><section class="manifesto container"><p class="eyebrow">[ THE PIPE COLLECTIVE ]</p><h2>${t('LESS ORNAMENT.<br>MORE <span class="outline-text">SUBSTANCE.</span>', '덜어낸 장식.<br>더 깊어진 <span class="outline-text">경험.</span>')}</h2><p>${t("We believe a good stay is about what you take away, not what surrounds you. Honest spaces, local connections, and the freedom to experience Seoul on your own terms.", "좋은 숙박은 주변을 채우는 것이 아닌, 가져갈 경험에 있습니다. 정직한 공간, 동네와의 연결, 나만의 방식으로 서울을 경험할 자유.")}</p><span class="manifesto-rule"></span></section><section class="section container" id="locations">${sectionTitle(t("FOUR NEIGHBORHOODS. ENDLESS POSSIBILITIES.", "네 개의 동네, 무한한 가능성"), "CHOOSE YOUR SEOUL", `<a class="editorial-link" href="${url("/locations")}">[ ${t("ALL LOCATIONS", "모든 지점")} ] ${icon("arrow")}</a>`)}<div class="branches-grid">${branches.map(branchCard).join("")}</div></section>${offersSection()}${pillarsSection()}<section class="newsletter"><div class="container newsletter-inner"><div><p class="eyebrow">LETTERS FROM SEOUL</p><h2>STAY IN THE LOOP.</h2><p>${t("Neighborhood notes, little discoveries, and first access to good things.", "동네 이야기, 작은 발견, 그리고 특별한 소식을 가장 먼저.")}</p></div><form id="newsletter-form"><div class="newsletter-fields"><label class="sr-only" for="newsletter-email">${t("Email address", "이메일 주소")}</label><input id="newsletter-email" type="email" placeholder="${t("YOUR EMAIL ADDRESS", "이메일 주소")}" required autocomplete="email"><button class="button light" type="submit">${t("COUNT ME IN", "구독 체험")} ${icon("arrow")}</button></div><p class="newsletter-note">${t("Demo only. Your email is not sent or saved.", "데모 전용입니다. 이메일은 전송되거나 저장되지 않습니다.")}</p></form></div></section>${reviewsSection()}<section class="section container about-section" id="about"><div><p class="eyebrow">ROOTED IN SEOUL. OPEN TO THE WORLD.</p><h2>BUILT FOR<br>THE <span class="outline-text">CURIOUS.</span></h2><p class="body-large">${t("A room is just the beginning.", "객실은 시작일 뿐입니다.")}</p><p class="muted">${t("We’re a collection of considered urban stays for people who look a little closer. From the old alleys of Jongno to the creative corners of Yeonnam, each PIPE address is a different way into the city.", "우리는 조금 더 깊이 들여다보는 여행자를 위한 도시의 숙박 공간입니다. 종로의 오래된 골목부터 연남의 창의적인 거리까지, 각각의 PIPE는 도시로 들어가는 새로운 방법입니다.")}</p><a class="editorial-link" href="${url("/locations")}">[ ${t("MEET OUR NEIGHBORHOODS", "우리 동네 만나보기")} ] ${icon("arrow")}</a></div>${mapArt()}</section>${faqSection()}${cta()}`;
}
function cta() {
  return `<section class="cta"><div class="container"><div><p class="eyebrow">YOUR NEXT CHAPTER</p><h2>SEOUL IS CALLING.</h2><p>${t("A new neighborhood. A different perspective. A place to call yours.", "새로운 동네, 다른 시선, 나만의 공간.")}</p></div><a class="button light" href="${url("/rooms")}">${t("FIND YOUR STAY", "객실 찾아보기")} ${icon("arrow")}</a></div></section>`;
}
function locationsPage() {
  return `<section class="page-heading container"><p class="eyebrow">THE PIPE DIRECTORY / SEOUL</p><div class="page-heading-row"><h1>FOUR WAYS<br>INTO <span class="outline-text">SEOUL.</span></h1><p>${t("One city. So many ways to belong.<br>Find the neighborhood that feels like you.", "하나의 도시, 서로 다른 매력.<br>나와 닮은 동네를 찾아보세요.")}</p></div><div class="filter-tabs" aria-label="${t("Filter locations", "지점 필터")}"><button class="filter-tab active" data-action="branch-filter" data-id="all" aria-pressed="true">[ ${t("ALL NEIGHBORHOODS", "모든 동네")} ]</button>${branches.map((b) => `<button class="filter-tab" data-action="branch-filter" data-id="${b.id}" aria-pressed="false">${b.number} / ${b.name}</button>`).join("")}</div></section><div id="location-list" class="location-list container">${locationRows()}</div>${pillarsSection()}<section class="section container">${sectionTitle("GO BEYOND THE LOBBY", "THE LOCAL EDIT", `<span class="section-note">${t("A few corners worth getting lost in.", "길을 잃어도 좋은 동네의 순간들.")}</span>`)}<div class="local-grid">${[
    [
      "tea",
      "SLOW MORNINGS",
      "TEA, TIME & TRADITION",
      "Myeongdong / Insadong",
      "Find a quiet teahouse, take the long way back.",
    ],
    [
      "vinyl",
      "LISTEN CLOSELY",
      "A DIFFERENT KIND OF NIGHT",
      "Yeonnam / Hongdae",
      "Independent records, small bars and your next favorite song.",
    ],
    [
      "market",
      "FOLLOW YOUR APPETITE",
      "AFTER-DARK DISCOVERIES",
      "Dongdaemun / Jung-gu",
      "Steam, street food and a table full of new stories.",
    ],
  ]
    .map(
      ([img, ey, title, area, desc]) =>
        `<article class="local-card">${image(img, title)}<p class="eyebrow">${ey}</p><h3>${title}</h3><p>${desc}</p><span class="local-area">${icon("pin")} ${area}</span></article>`,
    )
    .join(
      "",
    )}</div></section><section class="section container">${sectionTitle("GET YOUR BEARINGS", "A CITY, CONNECTED.")}<div class="location-map">${mapArt()}<div class="map-directory">${branches.map((b) => `<a href="${url("/rooms", { branch: b.id })}"><span class="eyebrow">${b.number} / ${b.district}</span><strong>PIPE ${b.name === "PIPE Stay Yongsan" ? "Stay Yongsan" : b.name}</strong><span>${b.station}</span>${icon("diagonal")}</a>`).join("")}<a class="editorial-link" href="https://www.google.com/maps/search/Seoul+South+Korea" target="_blank" rel="noopener noreferrer">${t("OPEN SEOUL MAP", "서울 지도 열기")} ${icon("diagonal")}</a></div></div></section>${cta()}`;
}
function locationRows() {
  return branches
    .filter((b) => filter === "all" || b.id === filter)
    .map(
      (b) =>
        `<article class="location-row"><a class="location-photo image-hover" href="${url("/rooms", { branch: b.id })}">${image(b.image, `${b.name} interiors`)}<span class="photo-tag">${b.tag} / ${b.number}</span><span class="location-photo-caption">${b.district}, Seoul <span>${b.walk}</span></span></a><div class="location-copy"><div class="card-meta"><span>${b.label}</span><span>${t("FROM", "최저")} ${money(b.rate * 100)} / ${t("NIGHT", "박")}</span></div><h2>${b.title}</h2><p>${language === "ko" ? b.ko : b.text}</p><dl class="location-facts"><div><dt>${t("NEIGHBORHOOD", "동네")}</dt><dd>${b.district}, Seoul</dd></div><div><dt>${t("THE MOOD", "분위기")}</dt><dd>${b.mood}</dd></div><div><dt>${t("GETTING HERE", "교통")}</dt><dd>${b.station}</dd></div><div><dt>${t("GOOD TO HAVE", "편의시설")}</dt><dd>${b.amenities}</dd></div></dl><a class="button" href="${url("/rooms", { branch: b.id })}">${t("EXPLORE ROOMS", "객실 둘러보기")} ${icon("arrow")}</a></div></article>`,
    )
    .join("");
}
function inventory() {
  return branches
    .filter((b) => stay.branch === "all" || b.id === stay.branch)
    .flatMap((b) =>
      (b.id === "yongsan" ? [roomTypes[3]] : roomTypes.slice(0, 3)).map(
        (r) => ({ b, r, rate: b.rate + (b.id === "yongsan" ? 0 : r.extra) }),
      ),
    )
    .filter(
      ({ r }) =>
        r.capacity * stay.rooms >= stay.guests &&
        (roomFilter === "all" || r.id === roomFilter),
    );
}
function roomCard({ b, r, rate }) {
  return `<article class="room-card"><a class="room-card-image image-hover" href="${url(`/rooms/${r.id}`, { branch: b.id })}">${image(b.id === "yongsan" ? "yongsan" : r.image, `${r.name} at ${b.name}`)}<span class="photo-tag">${b.name} / ${b.district}</span><span class="room-image-link">${icon("diagonal")}</span></a><div class="room-card-copy"><p class="eyebrow">PIPE ${b.name === "PIPE Stay Yongsan" ? "STAY YONGSAN" : b.name.toUpperCase()}</p><h3><a href="${url(`/rooms/${r.id}`, { branch: b.id })}">${language === "ko" ? r.ko : r.name}</a></h3><p class="room-meta">${r.area} m² <span>·</span> ${r.bed} <span>·</span> ${t(`Up to ${r.capacity} guests`, `${r.capacity}인까지`)}</p><div class="room-card-bottom"><div><strong>${money(rate * 100)}</strong><span> / ${t("night", "박")}</span><small>${t("Before cleaning & taxes", "청소비·세금 별도")}</small></div><a class="button small" href="${url(`/rooms/${r.id}`, { branch: b.id })}">${t("VIEW ROOM", "객실 보기")} ${icon("arrow")}</a></div></div></article>`;
}
function roomResults() {
  const rooms = inventory();
  return `<div class="results-count"><span>${rooms.length} ${t("SPACES TO CALL YOURS", "개의 객실")}</span><span>${dates()} · ${occupancy()}</span></div>${rooms.length ? `<div class="rooms-grid">${rooms.map(roomCard).join("")}</div>` : `<div class="empty-state">${icon("bed")}<h2>${t("LET’S MAKE A LITTLE MORE ROOM.", "조금 더 넓은 공간을 찾아볼까요?")}</h2><p>${t("No demo rooms match this combination. Try fewer guests, more rooms, a different room type, or PIPE Stay Yongsan for up to 4 guests per room.", "조건에 맞는 데모 객실이 없습니다. 인원, 객실 수, 객실 유형을 변경하거나 4인까지 이용 가능한 용산 지점을 선택해 보세요.")}</p><button class="button" data-action="booking">${t("ADJUST YOUR SEARCH", "검색 조건 변경")} ${icon("arrow")}</button></div>`}`;
}
function roomsPage() {
  return `<section class="page-heading container"><p class="eyebrow">${stay.branch === "all" ? "THE PIPE COLLECTION / SEOUL" : `PIPE ${branch.name.toUpperCase()} / ${branch.district.toUpperCase()}`}</p><div class="page-heading-row"><h1>MAKE ROOM<br>FOR <span class="outline-text">SEOUL.</span></h1><p>${t("A place to pause.<br>A good night’s sleep. A new day to explore.", "잠시 쉬어가는 공간.<br>깊은 잠과 새로운 하루의 시작.")}</p></div><div class="search-summary"><div>${icon("pin")}<strong>${stay.branch === "all" ? t("All Seoul locations", "서울 모든 지점") : branch.name}</strong><span>${dates()} · ${occupancy()}</span></div><button class="editorial-link" data-action="booking">[ ${t("EDIT SEARCH", "검색 변경")} ] ${icon("calendar")}</button></div><div class="room-filter-row"><div class="filter-tabs">${[["all", t("ALL SPACES", "모든 객실")], ...roomTypes.map((r) => [r.id, language === "ko" ? r.ko : r.name])].map(([id, name]) => `<button class="filter-tab ${id === "all" ? "active" : ""}" data-action="room-filter" data-id="${id}" aria-pressed="${id === "all"}">${name}</button>`).join("")}</div><label class="sort-label">${t("SORT BY", "정렬")} <select id="room-sort" aria-label="${t("Sort rooms", "객실 정렬")}"><option value="recommended">${t("Recommended", "추천순")}</option><option value="low">${t("Price: low to high", "낮은 요금순")}</option><option value="high">${t("Price: high to low", "높은 요금순")}</option></select></label></div></section><section class="container results-section" id="room-results">${roomResults()}</section><div class="container currency-note">${t("All rooms and availability are demo data. KRW uses an illustrative fixed rate of ₩1,350 per USD.", "모든 객실과 예약 가능 여부는 데모 데이터입니다. 원화는 예시 환율 1 USD = 1,350원을 적용합니다.")}</div>${cta()}`;
}
function priceForRoom() {
  return branch.rate + (branch.id === "yongsan" ? 0 : room.extra);
}
function priceLines(price) {
  return `<div class="price-lines"><div><span>${money(priceForRoom() * 100)} × ${price.nights} ${t("nights", "박")}${stay.rooms > 1 ? ` × ${stay.rooms} ${t("rooms", "객실")}` : ""}</span><span>${money(price.subtotal, true)}</span></div>${price.discount ? `<div class="discount"><span>${escape(stay.promo)} (−${price.percent}%)</span><span>−${money(price.discount, true)}</span></div>` : ""}<div><span>${t("Room preparation", "객실 준비 비용")}</span><span>${money(price.cleaning, true)}</span></div><div><span>${t("Taxes (10%)", "세금 (10%)")}</span><span>${money(price.tax, true)}</span></div></div><div class="price-total"><div><span class="eyebrow">${t("TOTAL · TAXES INCLUDED", "총액 · 세금 포함")}</span><strong>${money(price.total, true)} <small>${currency}</small></strong></div><span>${price.nights} ${t("NIGHTS", "박")}</span></div>`;
}
function bookingPanel() {
  const price = quote(priceForRoom(), stay);
  return `<aside class="booking-panel"><p class="eyebrow">${t("YOUR DIRECT RATE", "공식 홈페이지 요금")}</p><div class="nightly-price"><strong>${money(priceForRoom() * 100)}</strong><span>/ ${t("NIGHT", "박")}</span><span class="badge">${t("BOOK DIRECT", "공식 예약")}</span></div><button class="panel-field" data-action="booking" data-field="checkin"><span class="eyebrow">${t("CHECK IN — CHECK OUT", "체크인 — 체크아웃")}</span><strong>${dates()}</strong>${icon("calendar")}</button><button class="panel-field" data-action="booking" data-field="guests"><span class="eyebrow">${t("GUESTS & ROOMS", "인원 & 객실")}</span><strong>${occupancy()}</strong>${icon("users")}</button><form id="promo-form"><label class="eyebrow" for="promo-code">${t("HAVE A LITTLE SOMETHING EXTRA?", "프로모션 코드가 있나요?")}</label><div class="promo-input"><input id="promo-code" name="promo" placeholder="${t("Try PIPE15", "PIPE15 입력")}" value="${escape(stay.promo)}" maxlength="20" aria-label="Promotion code"><button type="submit">${t("APPLY", "적용")}</button></div><p id="promo-status" class="field-note ${stay.promo && !price.promoValid ? "error" : ""}" role="status">${stay.promo ? (price.promoValid ? t(`${price.percent}% room discount applied.`, `객실 요금 ${price.percent}% 할인이 적용되었습니다.`) : t("Code not valid. STAY7 needs 7+ nights.", "유효하지 않은 코드입니다. STAY7은 7박 이상에 적용됩니다.")) : t("A good reason to book direct.", "직접 예약의 특별한 혜택.")}</p></form>${priceLines(price)}<button class="button full" data-action="reserve">${t("RESERVE THIS ROOM", "이 객실 예약 체험")} ${icon("arrow")}</button><div class="booking-assurances"><p>${icon("check")} ${t("Free cancellation until 48h before arrival", "도착 48시간 전까지 무료 취소")}</p><p>${icon("key")} ${t("Easy, contactless check-in", "간편한 비대면 체크인")}</p></div><p class="demo-booking-note">${t("PROTOTYPE · No payment or real booking", "프로토타입 · 실제 결제 및 예약 없음")}</p></aside>`;
}
function detailPage() {
  const data = [
    ["wifi", "FAST WI-FI", "Stay connected. Or switch off."],
    ["shower", "PRIVATE BATHROOM", "A fresh start, every day."],
    ["desk", "A SPACE TO FOCUS", "Good light. A proper desk."],
    ["sun", "INDIVIDUAL CLIMATE", "Your room, your perfect temperature."],
    ["bed", "THOUGHTFUL COMFORT", "Quality linens and a considered mattress."],
    ["key", "KEYLESS ENTRY", "Come and go on your own terms."],
  ];
  return `<div class="breadcrumb container"><a href="${url("/locations")}">${t("LOCATIONS", "지점")}</a><span>/</span><a href="${url("/rooms")}">${branch.name}</a><span>/</span><span>${room.name}</span></div><section class="room-heading container"><p class="eyebrow"><span class="badge">ROOM ${String(roomTypes.indexOf(room) + 1).padStart(2, "0")}</span> ${branch.district.toUpperCase()}, SEOUL</p><div class="room-title-row"><div><h1>${room.name.replace(" ", "<br>")}</h1><p class="room-tagline">${t(room.tagline, room.ko + " — 나만의 서울을 만나는 공간")}</p></div><dl class="room-specs"><div><dt>${t("FLOOR AREA", "객실 면적")}</dt><dd>${room.area} M²</dd></div><div><dt>${t("SLEEP WELL", "침대 구성")}</dt><dd>${room.bed}</dd></div><div><dt>${t("GOOD COMPANY", "최대 인원")}</dt><dd>${room.capacity} ${t("GUESTS", "명")} / ${t("ROOM", "객실")}</dd></div></dl></div></section><section class="gallery container" aria-label="Room photo gallery"><button class="gallery-main image-hover" data-action="gallery" data-index="0">${image(branch.id === "yongsan" ? "yongsan" : room.image, room.name, "", true)}<span class="photo-tag">01 / SLEEPING SANCTUARY</span><span class="gallery-open">${icon("expand")} ${t("VIEW ALL PHOTOS", "전체 사진 보기")}</span></button><div class="gallery-small">${galleryImages
    .slice(1)
    .map(
      (img, i) =>
        `<button class="image-hover" data-action="gallery" data-index="${i + 1}">${image(img, galleryLabels[i + 1])}<span class="photo-tag">0${i + 2} / ${galleryLabels[i + 1]}</span></button>`,
    )
    .join(
      "",
    )}</div></section><section class="room-content container"><div class="room-details"><article class="detail-block"><p class="eyebrow">CONSIDERED DOWN TO THE LAST DETAIL</p><h2>SIMPLE COMFORT.<br>MORE <span class="outline-text">POSSIBILITY.</span></h2><p class="body-large">${t(`A quiet place to land in the heart of ${branch.name}. Thoughtful proportions, honest materials and everything you need for a good night’s sleep.`, `세심한 비율과 정직한 소재, 깊은 잠을 위한 편안함. ${branch.name} 한가운데에서 만나는 조용한 쉼표.`)}</p><p class="muted">${t("Unpack your bag. Open the curtains. Make a cup of something good. From the natural textures to the light at your desk, every detail is here to make you feel a little more at home.", "짐을 풀고, 커튼을 열고, 좋아하는 차 한 잔을 준비하세요. 자연스러운 질감부터 책상 위의 빛까지, 집처럼 편안한 시간을 위해 준비했습니다.")}</p><div class="room-highlights"><div><strong>100%</strong><span>YOUR OWN SPACE</span></div><div><strong>24 / 7</strong><span>KEYLESS ENTRY</span></div><div><strong>01</strong><span>VERY GOOD NIGHT</span></div></div></article><article class="detail-block"><p class="eyebrow">THE ESSENTIALS, DONE WELL</p><h2>ALL YOU NEED.</h2><div class="amenities-grid">${data.map(([ico, title, desc]) => `<div>${icon(ico)}<h3>${title}</h3><p>${desc}</p></div>`).join("")}</div></article><article class="detail-block"><p class="eyebrow">A SMOOTHER ARRIVAL</p><h2>THE PRACTICAL THINGS.</h2><div class="logistics-grid"><div><span class="eyebrow">CHECK IN</span><strong>15:00</strong><p>${t("Arrive on your terms.", "나만의 시간에 도착하세요.")}</p></div><div><span class="eyebrow">CHECK OUT</span><strong>11:00</strong><p>${t("One last coffee, then go.", "마지막 커피 한 잔의 여유.")}</p></div><div><span class="eyebrow">SUPPORT</span><strong>24 / 7</strong><p>${t("Someone, when you need them.", "필요한 순간, 언제나.")}</p></div></div><p class="policy-note">${t("All rooms are non-smoking. Quiet hours: 22:00–08:00. Policies shown are illustrative for this prototype.", "모든 객실은 금연입니다. 조용한 시간은 22:00–08:00입니다. 표시된 정책은 프로토타입용 예시입니다.")}</p></article><article class="detail-block neighborhood-block"><p class="eyebrow">OUTSIDE YOUR DOOR</p><h2>${branch.name.toUpperCase()}<br>IS YOURS TO EXPLORE.</h2><p>${language === "ko" ? branch.ko : branch.text}</p><div class="neighborhood-station">${icon("pin")} ${branch.station}</div><a class="editorial-link" href="${url("/locations")}">[ ${t("EXPLORE THE NEIGHBORHOOD", "동네 둘러보기")} ] ${icon("arrow")}</a></article></div><div class="booking-sidebar" id="booking-sidebar">${bookingPanel()}</div></section><section class="section container">${sectionTitle("THERE’S MORE THAN ONE WAY TO STAY", "A DIFFERENT KIND OF ROOM.")}<div class="rooms-grid">${(branch.id === "yongsan" ? roomTypes.slice(0, 3) : roomTypes.slice(0, 3).filter((r) => r.id !== room.id)).map((r) => roomCard({ b: branch.id === "yongsan" ? branches[2] : branch, r, rate: (branch.id === "yongsan" ? branches[2] : branch).rate + r.extra })).join("")}</div></section><div class="mobile-reserve"><div><strong>${money(priceForRoom() * 100)}</strong><span> / ${t("night", "박")}</span></div><button class="button" data-action="reserve">${t("RESERVE ROOM", "예약 체험")} ${icon("arrow")}</button></div>${cta()}`;
}
function footer() {
  return `<footer class="site-footer"><div class="container"><div class="footer-grid"><div><a class="brand" href="/"><img class="brand-wordmark" src="/assets/pipe-logo.svg" width="76" height="34" alt="PIPE"><span class="brand-descriptor">HOTEL<br>SEOUL, KR</span></a><p>${t("Considered spaces.<br>Local perspectives.<br>A different way to stay.", "세심한 공간.<br>동네의 시선.<br>새로운 숙박 경험.")}</p><span class="eyebrow">STAY CURIOUS. STAY PIPE.</span></div><div><h3>${t("FIND YOUR SEOUL", "나만의 서울 찾기")}</h3>${branches.map((b) => `<a href="${url("/rooms", { branch: b.id })}">${b.name} ${icon("diagonal")}</a>`).join("")}</div><div><h3>${t("GET TO KNOW US", "PIPE 알아보기")}</h3><a href="/#about">${t("Our story", "브랜드 소개")}</a><a href="/#offers">${t("Offers & privileges", "프로모션")}</a><a href="/#faq">${t("Good to know", "이용 안내")}</a><button class="footer-text-button" data-action="contact">${t("Get in touch", "문의하기")} ${icon("diagonal")}</button></div><div class="footer-note"><h3>${t("A WORK IN PROGRESS", "프로토타입 안내")}</h3><p>${t("An interactive hospitality concept, built for exploration. All stays, rates and reviews are illustrative.", "인터랙티브 숙박 콘셉트 프로토타입입니다. 모든 객실, 요금 및 후기는 데모용입니다.")}</p><span class="prototype-badge"><span></span> DESIGN PROTOTYPE</span></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} THE PIPE HOTEL · CONCEPT PROTOTYPE</span><div><button data-action="legal" data-id="privacy">${t("Privacy", "개인정보 안내")}</button><span>/</span><button data-action="legal" data-id="terms">${t("Terms", "이용 안내")}</button><span class="footer-time">SEOUL, KR <span id="seoul-time"></span></span></div></div></div></footer>`;
}
function notFound() {
  return `<section class="not-found container"><p class="eyebrow">404 / A LITTLE OFF THE BEATEN PATH</p><h1>LOST IN<br><span class="outline-text">SEOUL?</span></h1><p>${t("This corner doesn’t exist yet. Let’s find you somewhere good.", "아직 없는 페이지입니다. 새로운 공간을 찾아볼까요?")}</p><a class="button" href="/">${t("BACK TO PIPE", "홈으로 돌아가기")} ${icon("arrow")}</a></section>`;
}
function render() {
  filter = "all";
  roomFilter = "all";
  document.documentElement.lang = language;
  document.title =
    page === "home"
      ? "The Pipe Hotel — Your Seoul, Your Way"
      : page === "detail"
        ? `${room.name} · ${branch.name} — PIPE Hotel`
        : page === "locations"
          ? "Our Locations — PIPE Hotel"
          : page === "rooms"
            ? "Find Your Stay — PIPE Hotel"
            : "Page Not Found — PIPE Hotel";
  $("#app").innerHTML =
    header() +
    `<main id="main" tabindex="-1">${{ home, locations: locationsPage, rooms: roomsPage, detail: detailPage, 404: notFound }[page]()}</main>` +
    footer();
  updateTime();
}
function updateTime() {
  const el = $("#seoul-time");
  if (el)
    el.textContent = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Seoul",
    }).format(new Date());
}
function toast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 4500);
}
const modal = $("#modal");
function openModal(content, cls = "") {
  if (!modal.open) modalTrigger = document.activeElement;
  modal.className = cls;
  modal.innerHTML = `<button class="modal-close" data-action="close" aria-label="${t("Close dialog", "닫기")}">${icon("close")}</button>${content}`;
  modal.setAttribute("aria-labelledby", "modal-title");
  if (!modal.open) modal.showModal();
  document.body.classList.add("modal-open");
}
function closeModal() {
  modal.close();
  document.body.classList.remove("modal-open");
  if (modalTrigger?.isConnected) modalTrigger.focus();
}
function openBooking(field) {
  openModal(
    `<div class="modal-content"><p class="eyebrow">A GOOD STAY STARTS HERE</p><h2 id="modal-title">${t("MAKE IT YOURS.", "나만의 여행을 시작하세요.")}</h2><form id="booking-form"><label>${t("NEIGHBORHOOD", "머물 동네")}<select name="branch" id="stay-branch"><option value="all">${t("All Seoul locations", "서울의 모든 지점")}</option>${branches.map((b) => `<option value="${b.id}" ${stay.branch === b.id ? "selected" : ""}>${b.name} · ${b.district}</option>`).join("")}</select></label><div class="form-grid"><label>${t("CHECK IN", "체크인")}<input id="stay-checkin" type="date" name="checkin" value="${stay.checkin}" min="${isoDate()}" required></label><label>${t("CHECK OUT", "체크아웃")}<input type="date" name="checkout" value="${stay.checkout}" min="${addDays(stay.checkin, 1)}" required></label></div><div class="form-grid"><label>${t("GUESTS", "인원")}<select id="stay-guests" name="guests">${Array.from({ length: 8 }, (_, i) => `<option value="${i + 1}" ${stay.guests === i + 1 ? "selected" : ""}>${i + 1} ${t("Guest" + (i ? "s" : ""), "명")}</option>`).join("")}</select></label><label>${t("ROOMS", "객실 수")}<select name="rooms">${Array.from({ length: 4 }, (_, i) => `<option value="${i + 1}" ${stay.rooms === i + 1 ? "selected" : ""}>${i + 1} ${t("Room" + (i ? "s" : ""), "개")}</option>`).join("")}</select></label></div><label>${t("A LITTLE EXTRA (PROMO CODE)", "프로모션 코드 (선택)")}<input name="promo" value="${escape(stay.promo)}" placeholder="PIPE15" maxlength="20" autocomplete="off"></label><p id="booking-error" class="form-error" role="alert"></p><button class="button full" type="submit">${t("FIND MY STAY", "객실 찾아보기")} ${icon("arrow")}</button><p class="field-note">${t("Demo availability · Stays of 1–30 nights · No payment required", "데모 예약 가능 객실 · 1–30박 · 결제 없음")}</p></form></div>`,
  );
  if (field) $(`#stay-${field}`, modal)?.focus();
}
function openReserve() {
  const error = validateStay(stay);
  if (error) {
    openBooking();
    $("#booking-error").textContent = error;
    return;
  }
  if (stay.guests > room.capacity * stay.rooms) {
    toast(
      t(
        "This room fits " +
          room.capacity +
          " guests per room. Please adjust guests or room count.",
        `이 객실은 객실당 ${room.capacity}인까지 이용 가능합니다. 인원 또는 객실 수를 변경해 주세요.`,
      ),
    );
    openBooking("guests");
    return;
  }
  const price = quote(priceForRoom(), stay);
  openModal(
    `<div class="modal-content"><p class="eyebrow">ONE LAST LOOK</p><h2 id="modal-title">YOUR SEOUL STORY.</h2><div class="reservation-room">${image(room.image, room.name)}<div><span class="eyebrow">${branch.name}</span><h3>${room.name}</h3><p>${dates()}<br>${occupancy()}</p></div></div>${priceLines(price)}<div class="demo-callout"><strong>${t("THIS IS A DEMO RESERVATION", "데모 예약입니다")}</strong><p>${t("No real room will be reserved and no payment will be taken. No personal information is needed.", "실제 객실이 예약되거나 결제되지 않습니다. 개인정보 입력 없이 체험할 수 있습니다.")}</p></div><button class="button full" data-action="confirm-reservation">${t("CONFIRM DEMO STAY", "데모 예약 확인")} ${icon("arrow")}</button><button class="editorial-link modal-back" data-action="close">[ ${t("KEEP EXPLORING", "계속 둘러보기")} ]</button></div>`,
  );
}
function showGallery(index) {
  galleryIndex = (index + galleryImages.length) % galleryImages.length;
  const img =
    branch.id === "yongsan" && galleryIndex === 0
      ? "yongsan"
      : galleryImages[galleryIndex];
  openModal(
    `<div class="lightbox-content"><h2 id="modal-title" class="sr-only">${galleryLabels[galleryIndex]}</h2>${image(img, galleryLabels[galleryIndex], "lightbox-image", true)}<div class="lightbox-controls"><span>0${galleryIndex + 1} / 04 · ${galleryLabels[galleryIndex].toUpperCase()}</span><div><button data-action="gallery-prev" aria-label="Previous photo">${icon("back")}</button><button data-action="gallery-next" aria-label="Next photo">${icon("arrow")}</button></div></div></div>`,
    "lightbox",
  );
}
function sortRooms(value) {
  const list = inventory();
  if (value === "low") list.sort((a, b) => a.rate - b.rate);
  if (value === "high") list.sort((a, b) => b.rate - a.rate);
  const grid = $(".rooms-grid", $("#room-results"));
  if (grid) grid.innerHTML = list.map(roomCard).join("");
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === "close") closeModal();
  if (action === "booking") openBooking(button.dataset.field);
  if (action === "menu") {
    const nav = $("#mobile-nav");
    nav.hidden = !nav.hidden;
    button.setAttribute("aria-expanded", String(!nav.hidden));
    button.innerHTML = icon(nav.hidden ? "menu" : "close");
  }
  if (action === "language") {
    language = language === "en" ? "ko" : "en";
    storage.set("pipe-language", language);
    render();
  }
  if (action === "currency") {
    currency = currency === "USD" ? "KRW" : "USD";
    storage.set("pipe-currency", currency);
    render();
    toast(
      t(
        currency === "KRW"
          ? "Demo exchange rate: ₩1,350 = $1 USD."
          : "Showing prices in USD.",
        currency === "KRW"
          ? "예시 환율: 1 USD = 1,350원"
          : "USD 기준으로 표시합니다.",
      ),
    );
  }
  if (action === "branch-filter") {
    filter = id;
    $(".filter-tabs")
      .querySelectorAll("button")
      .forEach((el) => {
        el.classList.toggle("active", el === button);
        el.setAttribute("aria-pressed", String(el === button));
      });
    $("#location-list").innerHTML = locationRows();
  }
  if (action === "room-filter") {
    roomFilter = id;
    button
      .closest(".filter-tabs")
      .querySelectorAll("button")
      .forEach((el) => {
        el.classList.toggle("active", el === button);
        el.setAttribute("aria-pressed", String(el === button));
      });
    $("#room-results").innerHTML = roomResults();
    sortRooms($("#room-sort").value);
  }
  if (action === "offer") {
    const offer = offers.find((o) => o.id === id);
    openModal(
      `<div class="modal-content"><p class="eyebrow">${offer.eyebrow}</p><h2 id="modal-title">${offer.title.replace("\n", "<br>")}</h2><p>${offer.detail}</p>${offer.code ? `<div class="offer-code">${offer.code}</div>` : ""}<button class="button full" data-action="offer-book" data-id="${id}">${t("FIND YOUR STAY", "객실 찾기")} ${icon("arrow")}</button></div>`,
    );
  }
  if (action === "offer-book") {
    const offer = offers.find((o) => o.id === id);
    stay.promo = offer.code;
    if (id === "long") stay.checkout = addDays(stay.checkin, 7);
    if (id === "solo") stay.guests = 1;
    persistStay();
    openBooking();
  }
  if (action === "gallery") showGallery(Number(button.dataset.index));
  if (action === "gallery-prev") showGallery(galleryIndex - 1);
  if (action === "gallery-next") showGallery(galleryIndex + 1);
  if (action === "reserve") openReserve();
  if (action === "confirm-reservation") {
    const ref = "DEMO-" + crypto.randomUUID().slice(0, 6).toUpperCase();
    openModal(
      `<div class="modal-content confirmation"><span class="confirmation-icon">${icon("check")}</span><p class="eyebrow">${t("DEMO COMPLETE", "데모 체험 완료")}</p><h2 id="modal-title">SEE YOU<br>IN <span class="outline-text">SEOUL.</span></h2><p>${t("You’ve reached the end of the booking experience.", "예약 체험을 완료했습니다.")}</p><div class="confirmation-ref"><span class="eyebrow">${t("DEMO REFERENCE", "데모 확인 번호")}</span><strong>${ref}</strong><p>${branch.name} · ${room.name}<br>${dates()} · ${occupancy()}</p></div><p class="form-note">${t("No actual booking was made. No charges or confirmation emails were sent. This reference exists only in this demo session.", "실제 예약, 결제 또는 확인 이메일 발송은 이루어지지 않았습니다. 확인 번호는 현재 데모 화면에서만 사용됩니다.")}</p><button class="button full" data-action="close">${t("BACK TO EXPLORING", "계속 둘러보기")} ${icon("arrow")}</button></div>`,
    );
  }
  if (action === "contact")
    openModal(
      `<div class="modal-content"><p class="eyebrow">HELLO FROM PIPE</p><h2 id="modal-title">LET’S TALK.</h2><p>${t("This contact section is a placeholder for the final hotel team’s channels. For this prototype, no inquiry is sent.", "정식 호텔 문의 채널이 들어갈 자리입니다. 프로토타입에서는 문의가 전송되지 않습니다.")}</p><button class="button" data-action="close">${t("GOT IT", "확인")} ${icon("check")}</button></div>`,
    );
  if (action === "legal")
    openModal(
      `<div class="modal-content"><p class="eyebrow">PROTOTYPE INFORMATION</p><h2 id="modal-title">${id === "privacy" ? "YOUR PRIVACY." : "GOOD TO KNOW."}</h2><p>${id === "privacy" ? t("This demo does not collect booking or newsletter data. Language and currency preferences are saved locally in your browser; stay search settings last for the browser session. Fonts are loaded from Google Fonts, and hosting providers may keep standard access logs.", "이 데모는 예약·구독 정보를 수집하지 않습니다. 언어·통화 설정은 브라우저에, 검색 조건은 브라우저 세션에 저장됩니다. 서체는 Google Fonts에서 로드되며 호스팅 업체는 일반 접속 로그를 보관할 수 있습니다.") : t("This is a design prototype. All inventory, rates, images, promotions, policies and reviews are illustrative. No payment or real reservation is possible. The final operator will provide complete booking terms before launch.", "디자인 프로토타입입니다. 모든 객실, 요금, 이미지, 혜택, 정책 및 후기는 예시입니다. 실제 결제나 예약은 불가능하며 정식 서비스 오픈 전에 운영자가 이용 약관을 제공합니다.")}</p><button class="button" data-action="close">${t("GOT IT", "확인")} ${icon("check")}</button></div>`,
    );
});
document.addEventListener("submit", (event) => {
  if (event.target.id === "booking-form") {
    event.preventDefault();
    const fields = new FormData(event.target);
    const next = {
      branch: fields.get("branch"),
      checkin: fields.get("checkin"),
      checkout: fields.get("checkout"),
      guests: Number(fields.get("guests")),
      rooms: Number(fields.get("rooms")),
      promo: fields.get("promo").trim().toUpperCase(),
    };
    const error = validateStay(next);
    if (error) {
      $("#booking-error").textContent =
        language === "ko"
          ? "날짜는 오늘 이후 1–30박, 객실은 1–4개이며 객실당 최소 1명을 선택해 주세요."
          : error;
      return;
    }
    stay = next;
    persistStay();
    const nextUrl = url(
      detail && next.branch !== "all" && next.branch === branch.id
        ? path
        : "/rooms",
    );
    location.href = nextUrl;
  }
  if (event.target.id === "promo-form") {
    event.preventDefault();
    stay.promo = $("#promo-code").value.trim().toUpperCase();
    persistStay();
    $("#booking-sidebar").innerHTML = bookingPanel();
    history.replaceState(null, "", url(path));
  }
  if (event.target.id === "newsletter-form") {
    event.preventDefault();
    event.target.reset();
    toast(
      t(
        "You’re in — for the demo! No email was saved or sent.",
        "구독 체험 완료! 이메일은 저장되거나 전송되지 않았습니다.",
      ),
    );
  }
});
document.addEventListener("change", (event) => {
  if (
    event.target.name === "checkin" &&
    event.target.closest("#booking-form")
  ) {
    const end = $('[name="checkout"]', modal);
    end.min = addDays(event.target.value, 1);
    if (end.value <= event.target.value)
      end.value = addDays(event.target.value, 3);
  }
  if (event.target.id === "room-sort") sortRooms(event.target.value);
});
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    const rect = modal.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      closeModal();
  }
});
modal.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeModal();
});
modal.addEventListener("keydown", (event) => {
  if (modal.classList.contains("lightbox")) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showGallery(galleryIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showGallery(galleryIndex + 1);
    }
  }
});
render();
persistStay();
setInterval(updateTime, 60000);
