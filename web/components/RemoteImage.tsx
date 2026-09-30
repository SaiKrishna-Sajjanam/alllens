'use client';
import { useState } from 'react';

/** An outlet's own picture, loaded from its site (never copied). Hidden if the site refuses it. */
export default function RemoteImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  );
}
