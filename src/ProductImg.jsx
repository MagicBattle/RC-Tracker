import React, { useState } from "react";

// Official TCGplayer product photo for a product ID. Tries the copy saved
// in public/products first (npm run images), then TCGplayer's CDN.
export default function ProductImg({ id, className, onState }) {
  const sources = [
    `${import.meta.env.BASE_URL}products/${id}.jpg`,
    `https://tcgplayer-cdn.tcgplayer.com/product/${id}_in_1000x1000.jpg`,
    `https://tcgplayer-cdn.tcgplayer.com/product/${id}_400w.jpg`,
  ];
  const [i, setI] = useState(0);
  if (i >= sources.length) return null;
  return (
    <img
      className={className}
      src={sources[i]}
      alt=""
      loading="lazy"
      onLoad={() => onState?.(true)}
      onError={() => {
        if (i + 1 >= sources.length) onState?.(false);
        setI(i + 1);
      }}
    />
  );
}
