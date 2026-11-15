<template>
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <defs>
    <filter id="blur">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.5"/>
    </filter>
  </defs>
  <path 
      d="M5 12h14m-7-7l7 7-7 7" 
      stroke="#9ca3af" 
      stroke-width="2" 
      fill="none" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      filter="url(#blur)"/>
</svg>
</template>