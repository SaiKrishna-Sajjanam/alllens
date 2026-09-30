/** The Vuaz wordmark, drawn as vector shapes so it stays sharp at any size.
 *  V, U and Z take --logo-ink (navy on light screens, light on dark screens); the A keeps its blue gradient. */
export default function Logo({ label }: { label: string }) {
  return (
    <svg className="logo" viewBox="262 190 1444 280" role="img" aria-label={label}>
      <defs>
        <linearGradient id="vuaz-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0a4dff" />
          <stop offset="1" stopColor="#00b2ff" />
        </linearGradient>
      </defs>
      <g fill="var(--logo-ink)">
        <path d="M272,197 H338 Q346,197 350,204 L452,372 Q462,387 472,372 L580,204 Q585,197 594,197 H662 Q668,197 664,204 L520,428 Q497,463 462,463 Q427,463 405,428 L268,204 Q265,197 272,197 Z" />
        <path d="M680,200 Q680,197 684,197 H746 Q750,197 750,201 V334 Q750,405 824,405 H842 Q913,405 913,334 V201 Q913,197 917,197 H979 Q983,197 983,201 V352 Q983,467 846,467 H820 Q680,467 680,352 Z" />
        <path d="M1367,201 Q1367,197 1371,197 H1658 Q1698,197 1698,232 Q1698,252 1678,266 L1482,404 H1695 Q1699,404 1699,408 V456 Q1699,460 1695,460 H1414 Q1371,460 1371,422 Q1371,403 1392,388 L1575,261 H1371 Q1367,261 1367,257 Z" />
      </g>
      <g fill="url(#vuaz-a)">
        <path d="M972,457 L1118,228 Q1142,195 1172,195 Q1202,195 1227,228 L1366,457 Q1368,460 1363,460 H1298 Q1283,460 1275,448 L1182,292 Q1172,277 1162,292 L1070,446 Q1062,460 1044,460 H976 Q970,460 972,457 Z" />
        <path d="M1120,452 L1156,392 Q1170,373 1184,392 L1219,452 Q1222,459 1214,459 H1124 Q1116,459 1120,452 Z" />
      </g>
    </svg>
  );
}
