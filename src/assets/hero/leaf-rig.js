// Artwork coordinates, not screen coordinates. The raster is never traced,
// recoloured, resampled or replaced: these paths only describe deformation.
export const ART_WIDTH = 1536;
export const ART_HEIGHT = 1152;
export const LEAVES = [
  {
    id: 'left', channel: '#ff0000', tip: [510, 205], bladeEnd: 770, baseY: 1010,
    amplitude: [18, 7], response: 175,
    path: 'M474 171 C550 230 553 280 570 327 C602 321 641 376 620 433 C662 423 707 488 654 582 C712 546 764 566 774 627 C774 656 758 676 757 699 C797 691 810 741 795 804 C786 914 691 1038 468 1082 L644 1091 C781 1002 849 862 849 741 C846 698 856 669 882 654 C841 618 842 574 905 562 C851 518 836 493 803 479 C772 464 760 419 799 411 C745 350 689 328 637 288 C566 248 529 205 474 171 Z',
  },
  {
    id: 'middle', channel: '#00ff00', tip: [1280, 250], bladeEnd: 740, baseY: 1030,
    amplitude: [15, 6], response: 210,
    path: 'M1317 223 C1259 254 1250 298 1114 327 L1087 338 C1135 325 1107 395 1071 408 L1024 438 C1077 421 1078 484 1045 518 L990 554 C1041 555 1019 609 998 652 C965 728 900 885 770 977 C695 1031 636 1058 559 1080 L666 1092 C800 1058 936 922 1000 775 C1024 711 1079 590 1146 551 C1101 542 1128 497 1152 480 C1179 468 1203 468 1203 492 C1210 429 1195 401 1221 335 C1236 291 1274 247 1317 223 Z',
  },
  {
    id: 'right', channel: '#0000ff', tip: [1460, 655], bladeEnd: 915, baseY: 1045,
    amplitude: [13, 8], response: 240,
    path: 'M1540 697 C1488 644 1460 632 1416 617 C1399 638 1335 623 1294 625 C1274 650 1257 658 1233 667 C1274 688 1232 715 1193 718 L1140 717 C1173 745 1120 784 1081 813 C945 903 781 1004 570 1079 L717 1098 C914 1046 1050 927 1168 874 C1190 875 1197 894 1210 926 C1207 873 1233 853 1235 814 C1255 783 1297 771 1326 789 C1358 762 1391 745 1403 714 C1457 681 1497 677 1540 697 Z',
  },
];

// The source combines foliage and curves in one raster. These approximate
// background guides must never pin a leaf blade where they cross it.
export const FIXED_LINES = [
  'M440 138 C628 146 799 263 881 430 C1004 682 919 839 708 939 C483 1047 248 1074 55 1115',
  'M620 280 C794 312 941 340 1004 456 C1031 502 1047 548 1038 586',
  'M441 1076 C598 1030 690 893 775 756 C866 597 968 414 1104 341',
  'M366 1090 C710 1090 847 843 988 719 C1143 578 1344 511 1557 576',
  'M1355 219 C1425 384 1294 566 1164 715 C1038 858 818 1013 641 1076',
  'M1538 377 C1362 415 1248 471 1127 542',
  'M810 974 C984 844 1116 796 1234 799 C1383 794 1476 848 1550 902',
];

export function rigSvg() {
  const lines = FIXED_LINES.map(d => `<path d="${d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1152" viewBox="0 0 1536 1152">
    <defs>
      ${LEAVES.map(leaf => `<linearGradient id="bend-${leaf.id}" x1="0" y1="${leaf.bladeEnd}" x2="0" y2="${leaf.baseY}" gradientUnits="userSpaceOnUse">${Array.from({length:17}, (_,i) => { const t = 1 - i / 16; return `<stop offset="${i/16}" stop-color="white" stop-opacity="${t*t*(3-2*t)}"/>`; }).join('')}</linearGradient><mask id="root-${leaf.id}" maskUnits="userSpaceOnUse"><rect width="1536" height="1152" fill="url(#bend-${leaf.id})"/></mask>`).join('')}
      <filter id="soft" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="5"/></filter>
      <filter id="pins-soft" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="5"/></filter>
      <mask id="pins" maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1152">
        <rect width="1536" height="1152" fill="white"/>
        <g fill="none" stroke="black" stroke-width="48" filter="url(#pins-soft)">${lines}</g>
        <g fill="none" stroke="black" stroke-width="32">${lines}</g>
        <!-- Restore full movement over each blade, including pointed edges.
             Let the protection fade gently into the anchored stem. -->
        ${LEAVES.map(leaf => `<path mask="url(#root-${leaf.id})" fill="white" stroke="white" stroke-width="44" stroke-linejoin="round" d="${leaf.path}"/>`).join('')}
        <rect y="1045" width="1536" height="107" fill="black"/>
      </mask>
    </defs>
    <rect width="1536" height="1152" fill="black"/>
    <g mask="url(#pins)" filter="url(#soft)">${LEAVES.map(leaf => `<path mask="url(#root-${leaf.id})" id="${leaf.id}" fill="${leaf.channel}" stroke="${leaf.channel}" stroke-width="60" stroke-linejoin="round" d="${leaf.path}"/>`).join('')}</g>
  </svg>`;
}
