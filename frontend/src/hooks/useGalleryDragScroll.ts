import { useEffect, type RefObject } from "react";

/** PC 마우스 드래그 관성 스크롤. scroll-snap을 드래그 중 임시 해제하고 속도 기반 복원. */
export function useGalleryDragScroll(containerRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let isPointerDown = false;
    let isDragging = false;
    let startY = 0;
    let startScroll = 0;
    let prevY = 0;
    let prevTime = 0;
    let velocity = 0;
    let rafId = 0;

    const disableSnap = () => { el.style.scrollSnapType = "none"; };
    const enableSnap = () => { el.style.scrollSnapType = "y mandatory"; };

    const stopMomentum = () => {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    };

    const startMomentum = () => {
      stopMomentum();
      const decel = 0.96;
      const tick = () => {
        if (Math.abs(velocity) < 0.3) {
          enableSnap();
          el.scrollBy({ top: 0, behavior: "smooth" });
          return;
        }
        el.scrollTop += velocity;
        velocity *= decel;
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      stopMomentum();
      isPointerDown = true;
      isDragging = false;
      startY = e.clientY;
      prevY = e.clientY;
      prevTime = Date.now();
      startScroll = el.scrollTop;
      velocity = 0;
    };

    const onMove = (e: PointerEvent) => {
      if (!isPointerDown) return;
      if (!isDragging) {
        // 5px 이상 이동 시에만 드래그 시작 (클릭과 구분)
        if (Math.abs(e.clientY - startY) < 5) return;
        isDragging = true;
        disableSnap();
        el.setPointerCapture(e.pointerId);
        el.style.cursor = "grabbing";
      }
      const now = Date.now();
      const dy = prevY - e.clientY;
      const dt = Math.max(1, now - prevTime);
      velocity = (dy / dt) * 16;
      prevY = e.clientY;
      prevTime = now;
      el.scrollTop = startScroll - (e.clientY - startY);
    };

    const onUp = () => {
      isPointerDown = false;
      if (!isDragging) return;
      isDragging = false;
      el.style.cursor = "";
      if (Math.abs(velocity) > 1) {
        startMomentum();
      } else {
        enableSnap();
        el.scrollBy({ top: 0, behavior: "smooth" });
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    return () => {
      stopMomentum();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [containerRef]);
}
