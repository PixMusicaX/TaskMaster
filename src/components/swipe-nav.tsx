"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const ROUTES = ["/", "/calendar", "/notes", "/habits", "/history", "/about"];

export default function SwipeNav() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const minSwipeDistance = 120;

    let isIgnored = false;

    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as Element).closest('[data-swipe-ignore="true"]')) {
        isIgnored = true;
        return;
      }
      isIgnored = false;
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (isIgnored) return;
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    };

    const handleSwipe = () => {
      const distanceX = touchStartX - touchEndX;
      const distanceY = touchStartY - touchEndY;

      // If the vertical distance is significant compared to horizontal, it's likely a vertical scroll or diagonal swipe
      if (Math.abs(distanceY) > Math.abs(distanceX) * 0.25) return;

      const isLeftSwipe = distanceX > minSwipeDistance;
      const isRightSwipe = distanceX < -minSwipeDistance;

      if (isLeftSwipe || isRightSwipe) {
        const currentIndex = ROUTES.indexOf(pathname);
        if (currentIndex === -1) return;

        if (isLeftSwipe && currentIndex < ROUTES.length - 1) {
          // Swipe Left -> Next Page
          router.push(ROUTES[currentIndex + 1]);
        } else if (isRightSwipe && currentIndex > 0) {
          // Swipe Right -> Prev Page
          router.push(ROUTES[currentIndex - 1]);
        }
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pathname, router]);

  return null;
}
