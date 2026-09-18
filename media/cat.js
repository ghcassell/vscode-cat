// The cat: a black ragdoll with green-yellow eyes, a white bib and white paws.
// Every part that moves gets its own id/class so the stylesheet can play with it.
//
// pose "sit"   — the sidebar cat, sitting on the floor.
// pose "cling" — the same cat hanging off the screen by its front claws, with
//                extra room above the head for the raised paws.
function catMarkup(pose) {
  const cling = pose === "cling";
  const viewBox = cling ? "0 -30 200 222" : "0 0 200 200";
  return `
<svg class="cat${cling ? " cat-cling" : ""}" viewBox="${viewBox}" role="img" aria-label="A black ragdoll cat with a white bib">
  <defs>
    <radialGradient id="furG" cx="38%" cy="28%" r="78%">
      <stop offset="0%" stop-color="#3b3a44" />
      <stop offset="55%" stop-color="#23222a" />
      <stop offset="100%" stop-color="#141318" />
    </radialGradient>

    <radialGradient id="eyeG" cx="42%" cy="34%" r="72%">
  <stop offset="0%" stop-color="#f0ff99" />
  <stop offset="35%" stop-color="#e6f059" />
  <stop offset="60%" stop-color="rgb(255, 255, 0)" />
  <stop offset="100%" stop-color="#d9dc2d" />
</radialGradient>
    <linearGradient id="bibG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e2e6ef" />
    </linearGradient>
    <!-- everything inside an eye is clipped to its sclera, so the lid and pupil never spill out -->
    <clipPath id="eyeClipL"><ellipse cx="80" cy="76" rx="14.5" ry="15.5" /></clipPath>
    <clipPath id="eyeClipR"><ellipse cx="120" cy="76" rx="14.5" ry="15.5" /></clipPath>
  </defs>

  ${cling ? "" : `<ellipse class="shadow" cx="100" cy="186" rx="60" ry="9" />`}

  <!-- tail, forever swishing -->
  <g class="tail">
    <path d="M134 176 C 166 185, 186 166, 184 143 C 183 127, 171 118, 179 105"
          fill="none" stroke="#17161c" stroke-width="17" stroke-linecap="round" />
    <path d="M134 176 C 166 185, 186 166, 184 143 C 183 127, 171 118, 179 105"
          fill="none" stroke="#3a3944" stroke-width="7" stroke-linecap="round" opacity=".55" />
  </g>

  <!-- body -->
  <path class="body" d="M100 92 C 60 92, 49 130, 52 167 C 53 180, 70 186, 100 186
                        C 130 186, 147 180, 148 167 C 151 130, 140 92, 100 92 Z"
        fill="url(#furG)" />

  <!-- white bib -->
  <path class="bib" d="M100 108 C 85 110, 79 132, 82 157 C 84 174, 92 179, 100 179
                       C 108 179, 116 174, 118 157 C 121 132, 115 110, 100 108 Z"
        fill="url(#bibG)" />

  <!-- white front paws -->
  <g class="paws">
    <g class="paw paw-l">
      <ellipse cx="73" cy="175" rx="16" ry="11" fill="url(#bibG)" />
      <path d="M67 170 v6 M73 168 v8 M79 170 v6" stroke="#c7ccd8" stroke-width="1.6"
            stroke-linecap="round" fill="none" />
    </g>
    <g class="paw paw-r">
      <ellipse cx="127" cy="175" rx="16" ry="11" fill="url(#bibG)" />
      <path d="M121 170 v6 M127 168 v8 M133 170 v6" stroke="#c7ccd8" stroke-width="1.6"
            stroke-linecap="round" fill="none" />
    </g>
  </g>

  ${cling ? CLING_ARMS : ""}

  <!-- head -->
  <g class="head">
    <g class="ear ear-l">
      <path d="M56 54 L 61 12 L 96 40 Z" fill="#1c1b22" />
      <path d="M63 50 L 66 24 L 87 42 Z" fill="#6f5a66" opacity=".75" />
    </g>
    <g class="ear ear-r">
      <path d="M144 54 L 139 12 L 104 40 Z" fill="#1c1b22" />
      <path d="M137 50 L 134 24 L 113 42 Z" fill="#6f5a66" opacity=".75" />
    </g>

    <ellipse class="skull" cx="100" cy="78" rx="53" ry="46" fill="url(#furG)" />

    <!-- cheek floof, ragdoll style -->
    <path d="M50 88 q -9 8 -2 16 q 8 5 14 -3 z" fill="#23222a" />
    <path d="M150 88 q 9 8 2 16 q -8 5 -14 -3 z" fill="#23222a" />

    <g class="eyes">
      <g class="eye eye-l">
        <g class="eyeball" clip-path="url(#eyeClipL)">
          <ellipse class="sclera" cx="80" cy="76" rx="14.5" ry="15.5" fill="url(#eyeG)" />
          <ellipse class="pupil" cx="80" cy="76" rx="5.2" ry="12.5" fill="#101018" />
          <circle class="glint" cx="75" cy="69" r="3.4" fill="#ffffff" opacity=".9" />
          <circle class="glint-sm" cx="85" cy="83" r="1.7" fill="#ffffff" opacity=".55" />
          <!-- upper lid: sits above the eye and slides down over it -->
          <path class="lid" d="M63 57 H97 V90 Q80 100 63 90 Z" fill="#1c1b22" />
        </g>
        <path class="shut" d="M69 74 q 11 12 22 0" stroke="#e8ecf4" stroke-width="3"
              fill="none" stroke-linecap="round" />
      </g>
      <g class="eye eye-r">
        <g class="eyeball" clip-path="url(#eyeClipR)">
          <ellipse class="sclera" cx="120" cy="76" rx="14.5" ry="15.5" fill="url(#eyeG)" />
          <ellipse class="pupil" cx="120" cy="76" rx="5.2" ry="12.5" fill="#101018" />
          <circle class="glint" cx="115" cy="69" r="3.4" fill="#ffffff" opacity=".9" />
          <circle class="glint-sm" cx="125" cy="83" r="1.7" fill="#ffffff" opacity=".55" />
          <!-- upper lid: sits above the eye and slides down over it -->
          <path class="lid" d="M103 57 H137 V90 Q120 100 103 90 Z" fill="#1c1b22" />
        </g>
        <path class="shut" d="M109 74 q 11 12 22 0" stroke="#e8ecf4" stroke-width="3"
              fill="none" stroke-linecap="round" />
      </g>
    </g>

    <!-- muzzle -->
    <path class="nose" d="M100 96 l 6 5 l -6 5 l -6 -5 z" fill="#e79aa8" />
    <path class="mouth" d="M100 106 q -7 8 -13 1 M100 106 q 7 8 13 1"
          stroke="#0f0e13" stroke-width="2.2" fill="none" stroke-linecap="round" />
    <g class="whiskers" opacity=".8">
      <path d="M62 94 l -22 -6 M62 101 l -23 2 M138 94 l 22 -6 M138 101 l 23 2"
            stroke="#f2f4f8" stroke-width="1.8" stroke-linecap="round" fill="none" />
    </g>
  </g>
</svg>`;
}

// Raised front legs for the "cling" pose, drawn behind the head so the arms
// seem to come up from the shoulders. Claw tips sit at y = -25.
const CLING_ARMS = `
  <g class="arms">
    <path d="M64 124 C 46 100, 38 48, 44 -4" fill="none" stroke="#1c1b22"
          stroke-width="19" stroke-linecap="round" />
    <path d="M136 124 C 154 100, 162 48, 156 -4" fill="none" stroke="#1c1b22"
          stroke-width="19" stroke-linecap="round" />
    <g class="grip grip-l">
      <path d="M36 -14 l -1 -10 M41 -16 l 0 -9 M47 -16 l 0 -9 M52 -14 l 1 -10"
            stroke="#eef1f6" stroke-width="2.4" stroke-linecap="round" fill="none" />
      <ellipse cx="44" cy="-8" rx="13" ry="10" fill="url(#bibG)" />
      <path d="M38 -11 v5 M44 -13 v6 M50 -11 v5" stroke="#c7ccd8" stroke-width="1.5"
            stroke-linecap="round" fill="none" />
    </g>
    <g class="grip grip-r">
      <path d="M148 -14 l -1 -10 M153 -16 l 0 -9 M159 -16 l 0 -9 M164 -14 l 1 -10"
            stroke="#eef1f6" stroke-width="2.4" stroke-linecap="round" fill="none" />
      <ellipse cx="156" cy="-8" rx="13" ry="10" fill="url(#bibG)" />
      <path d="M150 -11 v5 M156 -13 v6 M162 -11 v5" stroke="#c7ccd8" stroke-width="1.5"
            stroke-linecap="round" fill="none" />
    </g>
  </g>`;

// Where the claws of a clinging cat touch the screen, in its viewBox units.
// The takeover drags scratch marks down from these points.
const CAT_CLING_CLAWS = [35, 41, 47, 53, 147, 153, 159, 165];
const CAT_CLING_TIP_Y = -25;
const CAT_CLING_VIEW = { top: -30, width: 200, height: 222 };
