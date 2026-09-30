'use client';
import { useEffect } from 'react';
import { markVisited } from '@/app/actions';

/** After the feed has been on screen briefly, remember this visit for "since your last visit". */
export default function MarkVisited() {
  useEffect(() => {
    const id = setTimeout(() => { void markVisited(); }, 3000);
    return () => clearTimeout(id);
  }, []);
  return null;
}
