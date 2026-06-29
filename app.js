(() => {
  const STORAGE_KEY = "withcamp-map-state-v1";

  const cameraIcon = `
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2.1l1.3-1.8h4.2L15.4 6h2.1A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" stroke-width="2"/>
    </svg>
  `;

  let state = loadState();
  let adminMode = false;
  let addMode = false;
  let selected = null;
  let adminFloorId = state.floors[0]?.id ?? "";
  const dom = {};

  document.addEventListener("DOMContentLoaded", () => {
    cacheDom();
    bindEvents();
    render();
  });

  function cacheDom() {
    dom.floorGrid = document.querySelector("#floorGrid");
    dom.adminToggle = document.querySelector("#adminToggle");
    dom.resetDemo = document.querySelector("#resetDemo");
    dom.selectedEmpty = document.querySelector("#selectedEmpty");
    dom.selectedContent = document.querySelector("#selectedContent");
    dom.selectedFloorLabel = document.querySelector("#selectedFloorLabel");
    dom.selectedMarkerTitle = document.querySelector("#selectedMarkerTitle");
    dom.mediaGrid = document.querySelector("#mediaGrid");
    dom.adminPanel = document.querySelector("#adminPanel");
    dom.adminFloorSelect = document.querySelector("#adminFloorSelect");
    dom.floorFileInput = document.querySelector("#floorFileInput");
    dom.floorImageUrl = document.querySelector("#floorImageUrl");
    dom.applyFloorImageUrl = document.querySelector("#applyFloorImageUrl");
    dom.addMarkerMode = document.querySelector("#addMarkerMode");
    dom.noMarkerAdmin = document.querySelector("#noMarkerAdmin");
    dom.markerEditor = document.querySelector("#markerEditor");
    dom.adminSelectedFloor = document.querySelector("#adminSelectedFloor");
    dom.adminSelectedPosition = document.querySelector("#adminSelectedPosition");
    dom.roomForm = document.querySelector("#roomForm");
    dom.roomNameInput = document.querySelector("#roomNameInput");
    dom.deleteMarkerButton = document.querySelector("#deleteMarkerButton");
    dom.mediaForm = document.querySelector("#mediaForm");
    dom.mediaType = document.querySelector("#mediaType");
    dom.mediaTitle = document.querySelector("#mediaTitle");
    dom.mediaSrc = document.querySelector("#mediaSrc");
    dom.mediaThumb = document.querySelector("#mediaThumb");
    dom.adminMediaList = document.querySelector("#adminMediaList");
    dom.viewerDialog = document.querySelector("#viewerDialog");
    dom.viewerTitle = document.querySelector("#viewerTitle");
    dom.viewerContent = document.querySelector("#viewerContent");
  }

  function bindEvents() {
    dom.adminToggle.addEventListener("click", () => {
      adminMode = !adminMode;
      addMode = false;
      render();
    });

    dom.resetDemo.addEventListener("click", () => {
      const confirmed = window.confirm("저장된 도면, 카메라, 미디어 데이터를 샘플 상태로 초기화할까요?");
      if (!confirmed) return;

      state = createDefaultState();
      selected = null;
      adminFloorId = state.floors[0]?.id ?? "";
      saveState();
      render();
    });

    dom.adminFloorSelect.addEventListener("change", (event) => {
      adminFloorId = event.target.value;
      dom.floorImageUrl.value = findFloor(adminFloorId)?.image ?? "";
    });

    dom.floorFileInput.addEventListener("change", handleFloorFile);

    dom.applyFloorImageUrl.addEventListener("click", () => {
      const floor = findFloor(adminFloorId);
      const nextImage = dom.floorImageUrl.value.trim();
      if (!floor || !nextImage) return;

      floor.image = nextImage;
      saveState();
      render();
    });

    dom.addMarkerMode.addEventListener("click", () => {
      adminMode = true;
      addMode = !addMode;
      render();
    });

    dom.roomForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const selection = getSelection();
      const nextLabel = dom.roomNameInput.value.trim();
      if (!selection || !nextLabel) return;

      selection.marker.label = nextLabel;
      saveState();
      render();
    });

    dom.deleteMarkerButton.addEventListener("click", () => {
      const selection = getSelection();
      if (!selection) return;

      const confirmed = window.confirm(`"${selection.marker.label}" 카메라 버튼을 삭제할까요?`);
      if (!confirmed) return;

      selection.floor.markers = selection.floor.markers.filter((marker) => marker.id !== selection.marker.id);
      selected = null;
      saveState();
      render();
    });

    dom.mediaForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const selection = getSelection();
      if (!selection) return;

      const media = {
        id: createId(),
        type: dom.mediaType.value,
        title: dom.mediaTitle.value.trim(),
        src: dom.mediaSrc.value.trim(),
        thumb: dom.mediaThumb.value.trim(),
      };

      if (!media.title || !media.src) return;

      selection.marker.media.push(media);
      dom.mediaForm.reset();
      saveState();
      render();
    });

    dom.viewerDialog.addEventListener("click", (event) => {
      if (event.target === dom.viewerDialog) {
        dom.viewerDialog.close();
      }
    });

    dom.viewerDialog.addEventListener("close", () => {
      dom.viewerContent.innerHTML = "";
    });
  }

  function render() {
    document.body.classList.toggle("admin-on", adminMode);
    renderFloorGrid();
    renderSelection();
    renderAdmin();
  }

  function renderFloorGrid() {
    dom.floorGrid.innerHTML = "";

    state.floors.forEach((floor) => {
      const card = document.createElement("article");
      card.className = "floor-card";

      const head = document.createElement("div");
      head.className = "floor-card-head";

      const title = document.createElement("h3");
      title.textContent = floor.name;

      const count = document.createElement("span");
      count.className = "floor-count";
      count.textContent = `${floor.markers.length}개 카메라`;

      head.append(title, count);

      const plan = document.createElement("div");
      plan.className = "floor-plan";
      plan.dataset.floorId = floor.id;
      plan.classList.toggle("is-add-mode", adminMode && addMode);
      plan.addEventListener("click", (event) => handlePlanClick(event, floor, plan));

      const image = document.createElement("img");
      image.className = "floor-image";
      image.src = floor.image;
      image.alt = `${floor.name} 도면`;
      plan.append(image);

      floor.markers.forEach((marker) => {
        const markerButton = document.createElement("button");
        markerButton.className = "marker-button";
        markerButton.type = "button";
        markerButton.style.left = `${marker.x}%`;
        markerButton.style.top = `${marker.y}%`;
        markerButton.setAttribute("aria-label", `${floor.name} ${marker.label} 미디어 보기`);
        markerButton.classList.toggle(
          "is-selected",
          selected?.floorId === floor.id && selected?.markerId === marker.id,
        );
        markerButton.insertAdjacentHTML("afterbegin", cameraIcon);

        const markerLabel = document.createElement("span");
        markerLabel.textContent = marker.label;
        markerButton.append(markerLabel);

        markerButton.addEventListener("click", (event) => {
          event.stopPropagation();
          selectMarker(floor.id, marker.id);
        });

        plan.append(markerButton);
      });

      card.append(head, plan);
      dom.floorGrid.append(card);
    });
  }

  function renderSelection() {
    const selection = getSelection();
    dom.selectedEmpty.hidden = Boolean(selection);
    dom.selectedContent.hidden = !selection;

    if (!selection) {
      dom.mediaGrid.innerHTML = "";
      return;
    }

    dom.selectedFloorLabel.textContent = selection.floor.name;
    dom.selectedMarkerTitle.textContent = selection.marker.label;
    renderMediaGrid(selection.marker.media);
  }

  function renderMediaGrid(mediaItems) {
    dom.mediaGrid.innerHTML = "";

    if (!mediaItems.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state compact";
      empty.innerHTML = "<strong>등록된 미디어가 없습니다.</strong><span>관리자 모드에서 이미지 또는 영상을 추가하세요.</span>";
      dom.mediaGrid.append(empty);
      return;
    }

    mediaItems.forEach((media) => {
      const card = document.createElement("button");
      card.className = "media-card";
      card.type = "button";
      card.addEventListener("click", () => openViewer(media));

      const thumb = document.createElement("span");
      thumb.className = "media-thumb";

      const image = document.createElement("img");
      image.src = getMediaThumb(media);
      image.alt = `${media.title} 썸네일`;
      image.addEventListener("error", () => {
        image.src = mediaPlaceholderSvg(media.title, media.type);
      });

      const badge = document.createElement("span");
      badge.className = "media-type";
      badge.textContent = media.type === "video" ? "영상" : "이미지";

      const title = document.createElement("span");
      title.className = "media-title";
      title.textContent = media.title;

      thumb.append(image, badge);
      card.append(thumb, title);
      dom.mediaGrid.append(card);
    });
  }

  function renderAdmin() {
    dom.adminPanel.hidden = !adminMode;
    dom.adminToggle.textContent = adminMode ? "관리자 모드 끄기" : "관리자 모드 켜기";
    dom.adminToggle.classList.toggle("is-active", adminMode);
    dom.addMarkerMode.classList.toggle("is-active", addMode);
    dom.addMarkerMode.textContent = addMode ? "도면 클릭으로 위치 지정 중" : "카메라 버튼 추가";

    renderAdminFloorSelect();

    const selection = getSelection();
    dom.noMarkerAdmin.hidden = Boolean(selection);
    dom.markerEditor.hidden = !selection;

    if (!selection) {
      dom.adminMediaList.innerHTML = "";
      return;
    }

    dom.adminSelectedFloor.textContent = selection.floor.name;
    dom.adminSelectedPosition.textContent = `x ${selection.marker.x.toFixed(1)}%, y ${selection.marker.y.toFixed(1)}%`;
    dom.roomNameInput.value = selection.marker.label;
    renderAdminMediaList(selection.marker.media);
  }

  function renderAdminFloorSelect() {
    const hasCurrentFloor = state.floors.some((floor) => floor.id === adminFloorId);
    if (!hasCurrentFloor) {
      adminFloorId = state.floors[0]?.id ?? "";
    }

    dom.adminFloorSelect.innerHTML = "";
    state.floors.forEach((floor) => {
      const option = document.createElement("option");
      option.value = floor.id;
      option.textContent = floor.name;
      dom.adminFloorSelect.append(option);
    });

    dom.adminFloorSelect.value = adminFloorId;
    dom.floorImageUrl.value = findFloor(adminFloorId)?.image ?? "";
  }

  function renderAdminMediaList(mediaItems) {
    dom.adminMediaList.innerHTML = "";

    if (!mediaItems.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state compact";
      empty.innerHTML = "<strong>미디어 없음</strong><span>아래 폼으로 이미지나 영상을 추가하세요.</span>";
      dom.adminMediaList.append(empty);
      return;
    }

    mediaItems.forEach((media) => {
      const item = document.createElement("div");
      item.className = "admin-media-item";

      const text = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = media.title;
      const type = document.createElement("span");
      type.textContent = media.type === "video" ? "영상" : "이미지";
      text.append(title, type);

      const deleteButton = document.createElement("button");
      deleteButton.className = "button button-danger";
      deleteButton.type = "button";
      deleteButton.textContent = "삭제";
      deleteButton.addEventListener("click", () => {
        const selection = getSelection();
        if (!selection) return;

        selection.marker.media = selection.marker.media.filter((itemMedia) => itemMedia.id !== media.id);
        saveState();
        render();
      });

      item.append(text, deleteButton);
      dom.adminMediaList.append(item);
    });
  }

  function handlePlanClick(event, floor, plan) {
    if (!adminMode || !addMode) return;

    const rect = plan.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
    const nextMarkerNumber = floor.markers.length + 1;

    const marker = {
      id: createId(),
      label: `새 위치 ${nextMarkerNumber}`,
      x,
      y,
      media: [],
    };

    floor.markers.push(marker);
    selected = { floorId: floor.id, markerId: marker.id };
    adminFloorId = floor.id;
    addMode = false;
    saveState();
    render();
  }

  function handleFloorFile(event) {
    const [file] = event.target.files;
    const floor = findFloor(adminFloorId);
    if (!file || !floor) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      floor.image = reader.result;
      saveState();
      dom.floorFileInput.value = "";
      render();
    });
    reader.readAsDataURL(file);
  }

  function selectMarker(floorId, markerId) {
    selected = { floorId, markerId };
    addMode = false;
    adminFloorId = floorId;
    render();
  }

  function openViewer(media) {
    dom.viewerTitle.textContent = media.title;
    dom.viewerContent.innerHTML = "";

    if (media.type === "video") {
      const youtubeEmbedSrc = getYouTubeEmbedSrc(media.src);
      if (youtubeEmbedSrc) {
        dom.viewerContent.append(createYouTubeEmbed(youtubeEmbedSrc, media.title));
      } else if (isExternalVideoPage(media.src)) {
        dom.viewerContent.append(createExternalVideoFallback(media));
      } else {
        const video = document.createElement("video");
        video.controls = true;
        video.playsInline = true;
        video.src = media.src;
        if (media.thumb) video.poster = media.thumb;
        video.addEventListener("error", () => {
          dom.viewerContent.innerHTML = "";
          dom.viewerContent.append(createExternalVideoFallback(media));
        });
        dom.viewerContent.append(video);
      }
    } else {
      const image = document.createElement("img");
      image.src = media.src;
      image.alt = media.title;
      image.addEventListener("error", () => {
        dom.viewerContent.innerHTML = "";
        dom.viewerContent.append(createViewerError("이미지를 불러올 수 없습니다. URL 또는 파일 경로를 확인하세요."));
      });
      dom.viewerContent.append(image);
    }

    if (typeof dom.viewerDialog.showModal === "function") {
      dom.viewerDialog.showModal();
    } else {
      dom.viewerDialog.setAttribute("open", "open");
    }
  }

  function createYouTubeEmbed(src, title) {
    const frame = document.createElement("iframe");
    frame.className = "youtube-embed";
    frame.src = src;
    frame.title = title;
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    return frame;
  }

  function createExternalVideoFallback(media) {
    const fallback = document.createElement("div");
    fallback.className = "external-media-fallback";

    const message = document.createElement("div");
    message.className = "viewer-error";
    message.innerHTML =
      "<strong>이 주소는 앱 안에서 직접 재생할 수 없습니다.</strong><span>영상 재생에는 .mp4, .webm처럼 브라우저가 바로 읽을 수 있는 파일 URL이 필요합니다. Google Photos 공유 링크는 영상 파일이 아니라 공유 페이지라 새 탭에서 열어야 합니다.</span>";

    const link = document.createElement("a");
    link.className = "button button-primary";
    link.href = media.src;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "새 탭에서 영상 열기";

    fallback.append(message, link);
    return fallback;
  }

  function createViewerError(message) {
    const error = document.createElement("div");
    error.className = "viewer-error";
    error.textContent = message;
    return error;
  }

  function getSelection() {
    if (!selected) return null;

    const floor = findFloor(selected.floorId);
    const marker = floor?.markers.find((item) => item.id === selected.markerId);
    if (!floor || !marker) return null;

    return { floor, marker };
  }

  function findFloor(floorId) {
    return state.floors.find((floor) => floor.id === floorId);
  }

  function getMediaThumb(media) {
    if (media.thumb) return media.thumb;
    if (media.type === "image") return media.src;
    return mediaPlaceholderSvg(media.title, media.type);
  }

  function isExternalVideoPage(src) {
    if (!src) return false;
    if (/^(blob:|data:video\/)/i.test(src)) return false;
    if (getYouTubeEmbedSrc(src)) return false;

    try {
      const url = new URL(src, window.location.href);
      const host = url.hostname.toLowerCase();
      if (host === "photos.app.goo.gl" || host === "photos.google.com") return true;
      return !/\.(mp4|webm|ogg|ogv|m4v|mov)(\?.*)?(#.*)?$/i.test(url.pathname + url.search + url.hash);
    } catch {
      return !/\.(mp4|webm|ogg|ogv|m4v|mov)(\?.*)?(#.*)?$/i.test(src);
    }
  }

  function getYouTubeEmbedSrc(input) {
    const rawValue = input?.trim();
    if (!rawValue) return "";

    const src = extractIframeSrc(rawValue) || rawValue;

    try {
      const url = new URL(src, window.location.href);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      const allowedHosts = new Set(["youtube.com", "youtube-nocookie.com", "m.youtube.com", "youtu.be"]);
      if (!allowedHosts.has(host)) return "";

      const videoId = getYouTubeVideoId(url, host);
      if (!videoId) return "";

      const embedHost = host === "youtube-nocookie.com" ? "www.youtube-nocookie.com" : "www.youtube.com";
      const embedUrl = new URL(`https://${embedHost}/embed/${videoId}`);
      const start = normalizeYouTubeStart(url.searchParams.get("start") || url.searchParams.get("t"));
      if (start) embedUrl.searchParams.set("start", start);

      return embedUrl.toString();
    } catch {
      return "";
    }
  }

  function extractIframeSrc(value) {
    if (!value.includes("<iframe")) return "";

    const template = document.createElement("template");
    template.innerHTML = value;
    const iframe = template.content.querySelector("iframe");
    return iframe?.getAttribute("src")?.trim() ?? "";
  }

  function getYouTubeVideoId(url, host) {
    if (host === "youtu.be") {
      return sanitizeYouTubeId(url.pathname.split("/").filter(Boolean)[0]);
    }

    if (url.pathname.startsWith("/embed/")) {
      return sanitizeYouTubeId(url.pathname.split("/").filter(Boolean)[1]);
    }

    if (url.pathname === "/watch") {
      return sanitizeYouTubeId(url.searchParams.get("v"));
    }

    if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/live/")) {
      return sanitizeYouTubeId(url.pathname.split("/").filter(Boolean)[1]);
    }

    return "";
  }

  function sanitizeYouTubeId(value) {
    const id = value?.trim() ?? "";
    return /^[a-zA-Z0-9_-]{6,}$/.test(id) ? id : "";
  }

  function normalizeYouTubeStart(value) {
    if (!value) return "";

    const plainSeconds = value.match(/^\d+$/);
    if (plainSeconds) return value;

    const timeParts = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
    if (!timeParts) return "";

    const hours = Number(timeParts[1] || 0);
    const minutes = Number(timeParts[2] || 0);
    const seconds = Number(timeParts[3] || 0);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds > 0 ? String(totalSeconds) : "";
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return createDefaultState();
      return normalizeState(JSON.parse(saved));
    } catch {
      return createDefaultState();
    }
  }

  function normalizeState(rawState) {
    if (!rawState?.floors?.length) return createDefaultState();

    rawState.floors.forEach((floor, index) => {
      floor.id ||= `floor-${index + 1}`;
      floor.name ||= `${index + 1}층`;
      floor.image ||= createDefaultState().floors[index]?.image ?? mediaPlaceholderSvg(floor.name, "image");
      floor.markers ||= [];
      floor.markers.forEach((marker) => {
        marker.id ||= createId();
        marker.label ||= "이름 없음";
        marker.x = Number.isFinite(marker.x) ? marker.x : 50;
        marker.y = Number.isFinite(marker.y) ? marker.y : 50;
        marker.media ||= [];
      });
    });

    return rawState;
  }

  function createDefaultState() {
    return {
      floors: [
        {
          id: "floor-1",
          name: "1층",
          image: floorPlanSvg("1층", "#0f766e", [
            ["로비", 42, 56, 210, 150],
            ["회의실 A", 294, 56, 174, 130],
            ["강의실", 520, 56, 222, 178],
            ["운영실", 42, 290, 180, 150],
            ["창고", 570, 326, 172, 114],
          ]),
          markers: [
            {
              id: "cam-lobby",
              label: "로비",
              x: 18,
              y: 32,
              media: [
                {
                  id: "media-lobby-1",
                  type: "image",
                  title: "로비 전경",
                  src: mediaPlaceholderSvg("로비 전경", "image"),
                  thumb: "",
                },
              ],
            },
            {
              id: "cam-classroom",
              label: "강의실",
              x: 78,
              y: 29,
              media: [],
            },
          ],
        },
        {
          id: "floor-2",
          name: "2층",
          image: floorPlanSvg("2층", "#2f6f3e", [
            ["라운지", 44, 54, 184, 148],
            ["스튜디오", 280, 54, 188, 158],
            ["회의실 B", 520, 54, 224, 132],
            ["사무실", 44, 292, 266, 146],
            ["서버룸", 564, 306, 180, 132],
          ]),
          markers: [
            {
              id: "cam-studio",
              label: "스튜디오",
              x: 47,
              y: 29,
              media: [
                {
                  id: "media-studio-1",
                  type: "image",
                  title: "스튜디오 장비",
                  src: mediaPlaceholderSvg("스튜디오 장비", "image"),
                  thumb: "",
                },
              ],
            },
          ],
        },
      ],
    };
  }

  function floorPlanSvg(title, accent, rooms) {
    const roomMarkup = rooms
      .map(([name, x, y, width, height]) => {
        const textX = x + width / 2;
        const textY = y + height / 2;
        return `
          <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="#ffffff" stroke="#a9b5aa" stroke-width="3"/>
          <text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" fill="#38433b" font-size="24" font-weight="700">${escapeSvg(name)}</text>
        `;
      })
      .join("");

    return svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520">
        <rect width="800" height="520" fill="#edf2e9"/>
        <rect x="20" y="28" width="760" height="464" rx="24" fill="#f8faf6" stroke="#7d8a7e" stroke-width="8"/>
        <path d="M260 40v210H40v48h220v154h48V298h454v-48H308V40h-48Z" fill="#dce5d8"/>
        ${roomMarkup}
        <rect x="344" y="326" width="154" height="112" rx="12" fill="#ffffff" stroke="#a9b5aa" stroke-width="3"/>
        <path d="M368 356h106M368 386h106M368 416h106" stroke="#7d8a7e" stroke-width="8" stroke-linecap="round"/>
        <text x="421" y="300" text-anchor="middle" fill="${accent}" font-size="22" font-weight="800">계단 / 복도</text>
        <text x="68" y="482" fill="${accent}" font-size="34" font-weight="900">${escapeSvg(title)} 도면</text>
      </svg>
    `);
  }

  function mediaPlaceholderSvg(title, type) {
    const label = type === "video" ? "영상" : "이미지";
    const accent = type === "video" ? "#b45309" : "#0f766e";

    return svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600">
        <rect width="960" height="600" fill="#eef2ea"/>
        <rect x="56" y="56" width="848" height="488" rx="28" fill="#ffffff" stroke="#d8ded2" stroke-width="8"/>
        <circle cx="190" cy="170" r="54" fill="${accent}" opacity="0.16"/>
        <path d="M180 382l150-170 118 122 78-88 254 136H180Z" fill="${accent}" opacity="0.22"/>
        <text x="480" y="272" text-anchor="middle" fill="${accent}" font-size="48" font-weight="900">${escapeSvg(label)}</text>
        <text x="480" y="336" text-anchor="middle" fill="#38433b" font-size="34" font-weight="800">${escapeSvg(title)}</text>
      </svg>
    `);
  }

  function svgToDataUri(svg) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function escapeSvg(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
})();
